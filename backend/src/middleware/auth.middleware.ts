import type { Context, Next } from "hono";
import { prisma } from "@/config/database";
import { UnauthorizedError } from "@/shared/errors";
import { verifyAccessToken } from "@/shared/utils/jwt";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing access token");
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired access token", "INVALID_TOKEN");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) throw new UnauthorizedError("User not found");
  if (user.status === "SUSPENDED") throw new UnauthorizedError("Account suspended", "ACCOUNT_SUSPENDED");

  // Ambil role pertama (primary role)
  const role = user.userRoles[0]?.role.code ?? "CUSTOMER";

  c.set("user", {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    status: user.status,
  });

  await next();
}
