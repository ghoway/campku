import type { Context } from "hono";
import { PaymentService } from "./payment.service";
import { prisma } from "@/config/database";
import { ForbiddenError } from "@/shared/errors";
import { ok, created } from "@/shared/utils/response";

const service = new PaymentService();

export async function listPayments(c: Context) {
  const bookingId = c.req.param("bookingId") ?? "";
  const user = c.get("user");

  if (user.role === "CUSTOMER") {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (booking?.customerUserId !== user.id) throw new ForbiddenError("Cannot access this booking's payments");
  }
  const data = await service.listByBooking(bookingId);
  return ok(c, data);
}

export async function createCashPayment(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.createCashPayment(c.req.param("bookingId") ?? "", user.id, body);
  return ok(c, data, 201);
}

export async function createMidtransPayment(c: Context) {
  const data = await service.createMidtransPayment(c.req.param("bookingId") ?? "");
  return ok(c, data);
}

export async function midtransNotification(c: Context) {
  const body = c.get("validated") ?? (await c.req.json());
  await service.handleMidtransNotification(body);
  return ok(c, { success: true });
}