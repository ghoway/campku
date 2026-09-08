import type { Context } from "hono";
import { prisma } from "@/config/database";
import { AvailabilityService } from "@/shared/services/availability.service";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { ok } from "@/shared/utils/response";

const service = new AvailabilityService();

export async function getAvailability(c: Context) {
  const propertyId = c.req.param("propertyId") ?? "";
  const q = c.req.query();
  const checkInStr = q.checkIn;
  const checkOutStr = q.checkOut;
  const guests = q.guests ? Number(q.guests) : undefined;

  if (!checkInStr || !checkOutStr) {
    throw new BadRequestError("checkIn and checkOut are required");
  }

  const checkIn = new Date(`${checkInStr}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutStr}T00:00:00.000Z`);

  if (checkOut <= checkIn) {
    throw new BadRequestError("checkOut must be after checkIn");
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || property.status !== "ACTIVE") throw new NotFoundError("Property not found");

  const data = await service.getPropertyAvailability({
    propertyId,
    checkIn,
    checkOut,
    guests,
  });
  return ok(c, data);
}