import type { Context } from "hono";
import { prisma } from "@/config/database";
import { NotFoundError } from "@/shared/errors";
import { ok } from "@/shared/utils/response";

export async function getProfile(c: Context) {
  const user = c.get("user");
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { userRoles: { include: { role: true } } },
  });
  if (!profile) throw new NotFoundError("User not found");

  return ok(c, {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    status: profile.status,
    role: profile.userRoles[0]?.role.code ?? "CUSTOMER",
  });
}

export async function updateProfile(c: Context) {
  const user = c.get("user");
  const body = c.get("validated");

  const profile = await prisma.user.update({
    where: { id: user.id },
    data: body,
    include: { userRoles: { include: { role: true } } },
  });

  return ok(c, {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    status: profile.status,
    role: profile.userRoles[0]?.role.code ?? "CUSTOMER",
  });
}