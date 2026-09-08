import type { Context } from "hono";
import fs from "fs";
import path from "path";
import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { NotFoundError, BadRequestError } from "@/shared/errors";
import { ok } from "@/shared/utils/response";

export async function listPropertyImages(c: Context) {
  const propertyId = c.req.param("propertyId") ?? "";
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError("Property not found");

  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
  });
  return ok(c, images);
}

export async function uploadPropertyImage(c: Context) {
  const propertyId = c.req.param("propertyId") ?? "";
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError("Property not found");

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) throw new BadRequestError("Missing file", "MISSING_FILE");

  // Simpan ke /uploads/properties/{propertyId}/{uuid}.ext
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), env.UPLOAD_DIR, "properties", propertyId);
  fs.mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buffer);

  const url = `/uploads/properties/${propertyId}/${filename}`;

  const count = await prisma.propertyImage.count({ where: { propertyId } });
  const image = await prisma.propertyImage.create({
    data: {
      propertyId,
      url,
      originalFilename: file.name,
      sortOrder: count,
      isPrimary: count === 0,
    },
  });

  return ok(c, image, 201);
}

export async function deletePropertyImage(c: Context) {
  const imageId = c.req.param("imageId") ?? "";
  const image = await prisma.propertyImage.findUnique({ where: { id: imageId } });
  if (!image) throw new NotFoundError("Image not found");

  // Hapus file
  const filePath = path.join(process.cwd(), image.url.replace(/^\//, ""));
  fs.rmSync(filePath, { force: true });

  await prisma.propertyImage.delete({ where: { id: imageId } });
  return ok(c, { success: true });
}

export async function reorderPropertyImages(c: Context) {
  const propertyId = c.req.param("propertyId") ?? "";
  const body = await c.req.json();
  const order: { id: string; sortOrder: number }[] = body?.order ?? [];

  await prisma.$transaction(
    order.map((item) =>
      prisma.propertyImage.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
  });
  return ok(c, images);
}