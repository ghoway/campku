import type { Context } from "hono";
import { prisma } from "@/config/database";
import { NotFoundError, ConflictError } from "@/shared/errors";
import { ok, created } from "@/shared/utils/response";

export async function listFacilities(c: Context) {
  const facilities = await prisma.facility.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  return ok(c, facilities);
}

export async function listAllFacilities(c: Context) {
  const facilities = await prisma.facility.findMany({ orderBy: { name: "asc" } });
  return ok(c, facilities);
}

export async function createFacility(c: Context) {
  const body = c.get("validated");
  try {
    const facility = await prisma.facility.create({ data: body });
    return created(c, facility);
  } catch (e: any) {
    throw new ConflictError("Facility already exists", "DUPLICATE");
  }
}

export async function updateFacility(c: Context) {
  const id = c.req.param("id") ?? "";
  const body = c.get("validated");
  const exists = await prisma.facility.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Facility not found");
  const facility = await prisma.facility.update({ where: { id }, data: body });
  return ok(c, facility);
}