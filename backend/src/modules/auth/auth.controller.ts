import type { Context } from "hono";
import { AuthService } from "./auth.service";
import { ok, created } from "@/shared/utils/response";

const authService = new AuthService();

export async function register(c: Context) {
  const body = c.get("validated");
  const data = await authService.register(body);
  return created(c, data);
}

export async function login(c: Context) {
  const body = c.get("validated");
  const data = await authService.login(body);
  return ok(c, data);
}

export async function refresh(c: Context) {
  const body = c.get("validated");
  const data = await authService.refresh(body.refreshToken);
  return ok(c, data);
}

export async function logout(c: Context) {
  const body = c.get("validated") ?? {};
  await authService.logout(body.refreshToken);
  return ok(c, { success: true });
}

export async function me(c: Context) {
  const user = c.get("user");
  const data = await authService.getMe(user.id);
  return ok(c, data);
}

export async function changePassword(c: Context) {
  const user = c.get("user");
  const body = c.get("validated");
  await authService.changePassword(user.id, body.currentPassword, body.newPassword);
  return ok(c, { success: true });
}

export async function verifyOtp(c: Context) {
  const body = c.get("validated");
  const data = await authService.verifyOtp(body);
  return ok(c, data);
}

export async function resendOtp(c: Context) {
  const body = c.get("validated");
  const data = await authService.resendOtp(body.email);
  return ok(c, data);
}
