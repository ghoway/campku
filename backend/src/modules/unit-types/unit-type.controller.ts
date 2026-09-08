import type { Context } from "hono";
import { UnitTypeService } from "./unit-type.service";
import { prisma } from "@/config/database";
import { NotFoundError } from "@/shared/errors";
import { ok, created } from "@/shared/utils/response";

const service = new UnitTypeService();

const getPropertyId = (c: Context) => c.req.param("propertyId") ?? "";
const getUtId = (c: Context) => c.req.param("unitTypeId") ?? "";

export async function listUnitTypes(c: Context) {
  const data = await service.listByProperty(getPropertyId(c));
  return ok(c, data);
}

export async function getUnitType(c: Context) {
  const data = await service.get(getUtId(c));
  return ok(c, data);
}

export async function createUnitType(c: Context) {
  const body = c.get("validated");
  const data = await service.create(getPropertyId(c), body);
  return created(c, data);
}

export async function updateUnitType(c: Context) {
  const body = c.get("validated");
  const data = await service.update(getUtId(c), body);
  return ok(c, data);
}

export async function deleteUnitType(c: Context) {
  const data = await service.delete(getUtId(c));
  return ok(c, { success: true });
}

// Units
export async function listUnits(c: Context) {
  const data = await service.listUnits(getUtId(c));
  return ok(c, data);
}

export async function createUnit(c: Context) {
  const body = c.get("validated");
  const data = await service.createUnit(getUtId(c), body);
  return created(c, data);
}

export async function updateUnit(c: Context) {
  const body = c.get("validated");
  const data = await service.updateUnit(c.req.param("unitId") ?? "", body);
  return ok(c, data);
}

export async function deleteUnit(c: Context) {
  const data = await service.deleteUnit(c.req.param("unitId") ?? "");
  return ok(c, { success: true });
}

// Images
export async function uploadUnitTypeImage(c: Context) {
  const unitTypeId = c.req.param("unitTypeId") ?? "";
  const ut = await prisma.unitType.findUnique({ where: { id: unitTypeId } });
  if (!ut) throw new NotFoundError("Unit type not found");

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) return c.json({ success: false, error: { code: "MISSING_FILE", message: "Missing file" } }, 400);

  const fs = await import("fs");
  const path = await import("path");
  const env = (await import("@/config/env")).env;

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), env.UPLOAD_DIR, "unit-types", unitTypeId);
  fs.mkdirSync(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buffer);

  const url = `/uploads/unit-types/${unitTypeId}/${filename}`;
  const count = await prisma.unitTypeImage.count({ where: { unitTypeId } });
  const image = await prisma.unitTypeImage.create({
    data: { unitTypeId, url, originalFilename: file.name, sortOrder: count, isPrimary: count === 0 },
  });
  return created(c, image);
}