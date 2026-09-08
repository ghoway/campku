import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

export function signAccessToken(payload: { userId: string; role: string; email: string }) {
  return jwt.sign(
    { role: payload.role, email: payload.email },
    env.JWT_SECRET,
    {
      subject: payload.userId,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    }
  );
}

export function signRefreshToken(payload: { userId: string; tokenId: string }) {
  return jwt.sign(
    { tokenId: payload.tokenId },
    env.JWT_SECRET,
    {
      subject: payload.userId,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
}
