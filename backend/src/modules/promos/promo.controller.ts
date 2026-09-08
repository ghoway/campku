import type { Context } from "hono";
import { prisma } from "@/config/database";
import { NotFoundError, ConflictError } from "@/shared/errors";
import { ok, created } from "@/shared/utils/response";

export async function validatePromo(c: Context) {
  const code = (c.req.param("code") ?? "").toUpperCase();
  const promo = await prisma.promo.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo) throw new NotFoundError("Promo code not found", "INVALID_PROMO_CODE");

  const now = new Date();
  let valid = promo.isActive && promo.startAt <= now;
  if (promo.expiresAt) valid = valid && promo.expiresAt >= now;
  if (promo.maxUses > 0) valid = valid && promo.currentUses < promo.maxUses;
  if (!valid) {
    return ok(c, { ..._map(promo), valid: false, remainingUses: Math.max(0, promo.maxUses - promo.currentUses) });
  }

  return ok(c, {
    ..._map(promo),
    valid: true,
    remainingUses: promo.maxUses > 0 ? promo.maxUses - promo.currentUses : null,
  });
}

export async function listPromos(c: Context) {
  const promos = await prisma.promo.findMany({ orderBy: { createdAt: "desc" } });
  return ok(c, promos.map(_map));
}

export async function createPromo(c: Context) {
  const body = c.get("validated");
  const exists = await prisma.promo.findUnique({ where: { code: body.code } });
  if (exists) throw new ConflictError("Promo code already exists", "DUPLICATE");

  const promo = await prisma.promo.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: BigInt(body.discountValue),
      minBookingAmount: BigInt(body.minBookingAmount),
      maxUses: body.maxUses,
      startAt: new Date(body.startAt),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: body.isActive,
    },
  });
  return created(c, _map(promo));
}

export async function updatePromo(c: Context) {
  const id = c.req.param("promoId") ?? "";
  const body = c.get("validated");
  const exists = await prisma.promo.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Promo not found");

  const data: any = {};
  const fields = ["code", "name", "description", "discountType", "maxUses", "isActive", "startAt", "expiresAt"] as const;
  for (const f of fields) {
    if (body[f] !== undefined) {
      data[f] = f === "startAt" || f === "expiresAt" ? (body[f] ? new Date(body[f]) : null) : body[f];
    }
  }
  if (body.discountValue !== undefined) data.discountValue = BigInt(body.discountValue);
  if (body.minBookingAmount !== undefined) data.minBookingAmount = BigInt(body.minBookingAmount);

  const promo = await prisma.promo.update({ where: { id }, data });
  return ok(c, _map(promo));
}

export async function deletePromo(c: Context) {
  const id = c.req.param("promoId") ?? "";
  const exists = await prisma.promo.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Promo not found");
  await prisma.promo.update({ where: { id }, data: { isActive: false } });
  return ok(c, { success: true });
}

// eslint-disable-next-line no-unused-vars
const _map = (p: any) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  description: p.description,
  discountType: p.discountType,
  discountValue: String(p.discountValue),
  minBookingAmount: String(p.minBookingAmount),
  maxUses: p.maxUses,
  currentUses: p.currentUses,
  remainingUses: p.maxUses > 0 ? p.maxUses - p.currentUses : null,
  startAt: p.startAt,
  expiresAt: p.expiresAt,
  isActive: p.isActive,
});