import type { Context } from "hono";
import { prisma } from "@/config/database";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { ok, created } from "@/shared/utils/response";

async function toUTC(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function listSpecialRates(c: Context) {
  const unitTypeId = c.req.param("unitTypeId") ?? "";
  const rates = await prisma.specialRatePeriod.findMany({
    where: { unitTypeId },
    orderBy: [{ startDate: "asc" }, { priority: "desc" }],
  });
  return ok(c, rates);
}

export async function createSpecialRate(c: Context) {
  const unitTypeId = c.req.param("unitTypeId") ?? "";
  const body = c.get("validated");

  const ut = await prisma.unitType.findUnique({ where: { id: unitTypeId } });
  if (!ut) throw new NotFoundError("Unit type not found");

  const start = await toUTC(body.startDate);
  const end = await toUTC(body.endDate);
  if (end < start) throw new BadRequestError("endDate must be >= startDate");

  const rate = await prisma.specialRatePeriod.create({
    data: {
      unitTypeId,
      name: body.name,
      startDate: start,
      endDate: end,
      price: BigInt(body.price),
      priority: body.priority,
      isActive: body.isActive ?? true,
    },
  });

  // Normalisasi hari karena perbandingan tanggal
  return created(c, rate);
}

export async function updateSpecialRate(c: Context) {
  const id = c.req.param("id");
  const body = c.get("validated");

  const exists = await prisma.specialRatePeriod.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Special rate not found");

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.startDate !== undefined) data.startDate = await toUTC(body.startDate);
  if (body.endDate !== undefined) data.endDate = await toUTC(body.endDate);
  if (body.price !== undefined) data.price = BigInt(body.price);
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const rate = await prisma.specialRatePeriod.update({ where: { id }, data });
  return ok(c, rate);
}

export async function deleteSpecialRate(c: Context) {
  const id = c.req.param("id");
  const exists = await prisma.specialRatePeriod.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Special rate not found");
  await prisma.specialRatePeriod.delete({ where: { id } });
  return ok(c, { success: true });
}