import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validation.middleware";
import { rateLimit } from "@/middleware/rate-limit.middleware";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  LogoutSchema,
  VerifyOtpSchema,
  ResendOtpSchema,
} from "./auth.schema";
import {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  verifyOtp,
  resendOtp,
} from "./auth.controller";

const router = new Hono<{ Variables: Variables }>();

router.post("/register", rateLimit(60_000, 10), validate(RegisterSchema), register);
router.post("/verify-otp", rateLimit(60_000, 10), validate(VerifyOtpSchema), verifyOtp);
router.post("/resend-otp", rateLimit(60_000, 5), validate(ResendOtpSchema), resendOtp);
router.post("/login", rateLimit(60_000, 20), validate(LoginSchema), login);
router.post("/refresh", validate(RefreshTokenSchema), refresh);
router.post("/logout", validate(LogoutSchema), logout);
router.post("/change-password", authMiddleware, validate(ChangePasswordSchema), changePassword);
router.get("/me", authMiddleware, me);

export default router;
