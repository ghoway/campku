import bcrypt from "bcryptjs";
import { prisma } from "@/config/database";
import { env, isProduction } from "@/config/env";
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/shared/errors";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/shared/utils/jwt";
import { sendWelcomeEmail, sendOtpEmail } from "@/shared/services/email.service";

const BCRYPT_COST = 12;
const OTP_HASH_COST = 10;

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceInfo?: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])],
      },
    });
    if (existing) {
      throw new ConflictError("Email or phone already registered", "EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const otp = this._generateOtp();
    const otpCodeHash = await bcrypt.hash(otp, OTP_HASH_COST);
    const otpExpiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        status: "PENDING",
        otpCodeHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpSentAt: new Date(),
        userRoles: {
          create: {
            role: { connect: { code: "CUSTOMER" } },
          },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    // Fire-and-forget
    void sendWelcomeEmail(user.email, user.name);
    void sendOtpEmail(user.email, otp, env.OTP_TTL_MINUTES);

    // In development, log the OTP so it can be tried without email delivery
    if (!isProduction) {
      console.log(`[otp] ${user.email} code: ${otp} (expires ${otpExpiresAt.toISOString()})`);
    }

    const role = user.userRoles[0]?.role.code ?? "CUSTOMER";

    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role, status: user.status },
      otpExpiresAt: otpExpiresAt.toISOString(),
      ...(isProduction ? {} : { debugOtp: otp }),
    };
  }

  async verifyOtp(input: { email: string; otp: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw new NotFoundError("User not found", "USER_NOT_FOUND");

    if (user.status !== "PENDING") {
      throw new BadRequestError("Account email is already verified", "OTP_ALREADY_VERIFIED");
    }
    if (!user.otpCodeHash || !user.otpExpiresAt) {
      throw new BadRequestError("No OTP request found. Please register again or resend the code", "OTP_NOT_FOUND");
    }
    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestError("OTP has expired", "OTP_EXPIRED");
    }
    if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
      throw new BadRequestError("Too many failed attempts. Please resend a new code", "OTP_MAX_ATTEMPTS");
    }

    const valid = await bcrypt.compare(input.otp, user.otpCodeHash);
    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new AppError(422, "OTP_INVALID", "Invalid OTP code");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        otpSentAt: null,
      },
    });

    return { success: true, message: "Email verified. You can now log in." };
  }

  async resendOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError("User not found", "USER_NOT_FOUND");
    if (user.status !== "PENDING") {
      throw new BadRequestError("Account email is already verified", "OTP_ALREADY_VERIFIED");
    }

    const now = Date.now();
    if (user.otpSentAt && user.otpSentAt.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000 > now) {
      const remaining = Math.ceil((user.otpSentAt.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000);
      throw new BadRequestError(`Please wait ${remaining}s before requesting a new code`, "OTP_RESEND_COOLDOWN");
    }

    const otp = this._generateOtp();
    const otpCodeHash = await bcrypt.hash(otp, OTP_HASH_COST);
    const otpExpiresAt = new Date(now + env.OTP_TTL_MINUTES * 60_000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCodeHash, otpExpiresAt, otpAttempts: 0, otpSentAt: new Date(now) },
    });

    void sendOtpEmail(user.email, otp, env.OTP_TTL_MINUTES);

    if (!isProduction) {
      console.log(`[otp] ${user.email} code: ${otp} (expires ${otpExpiresAt.toISOString()})`);
    }

    return {
      success: true,
      message: "A new OTP has been sent",
      otpExpiresAt: otpExpiresAt.toISOString(),
      ...(isProduction ? {} : { debugOtp: otp }),
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

    if (user.status === "PENDING") {
      throw new UnauthorizedError(
        "Email not verified yet. Please enter the OTP sent to your email (or resend it)",
        "OTP_REQUIRED"
      );
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

    if (user.status === "SUSPENDED" || user.status === "INACTIVE") {
      throw new UnauthorizedError("Account is not active", "ACCOUNT_INACTIVE");
    }

    const role = user.userRoles[0]?.role.code ?? "CUSTOMER";

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this._issueTokens(user.id, role, user.email, input.deviceInfo);

    return {
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role, status: user.status },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken },
      include: { user: { include: { userRoles: { include: { role: true } } } } },
    });

    if (!stored) throw new UnauthorizedError("Refresh token not found", "INVALID_REFRESH_TOKEN");

    // Reuse detection: token yang sudah di-rotate dipakai ulang → anggap token bocor,
    // revoke SEMUA sesi user tersebut.
    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedError(
        "Refresh token reuse detected, all sessions have been revoked",
        "TOKEN_REUSE_DETECTED"
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
    }
    if (stored.user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active", "ACCOUNT_INACTIVE");
    }

    const role = stored.user.userRoles[0]?.role.code ?? "CUSTOMER";

    // Revoke old, create new (rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = await this._issueTokens(stored.user.id, role, stored.user.email, stored.deviceInfo ?? undefined);

    return {
      user: { id: stored.user.id, name: stored.user.name, email: stored.user.email, role },
      ...tokens,
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    return true;
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: true } },
        staffPropertyAssignments: {
          where: { isActive: true },
          include: { property: true },
        },
      },
    });
    if (!user) throw new NotFoundError("User not found");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.userRoles[0]?.role.code ?? "CUSTOMER",
      properties: user.staffPropertyAssignments.map((a) => ({
        id: a.property.id,
        name: a.property.name,
        city: a.property.city,
      })),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ValidationError("Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return true;
  }

  private async _issueTokens(userId: string, role: string, email: string, deviceInfo?: string) {
    // Cleanup expired/revoked tokens occasionally
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_DAYS);

    const stored = await prisma.refreshToken.create({
      data: {
        userId,
        token: crypto.randomUUID(),
        deviceInfo,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({ userId, role, email });
    const refreshToken = signRefreshToken({ userId, tokenId: stored.id });

    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  private _generateOtp(): string {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return String(100000 + (buf[0] % 900000));
  }
}
