import type { Context } from "hono";
import { BookingService } from "./booking.service";
import { ok, created, okList } from "@/shared/utils/response";

const service = new BookingService();

export async function createBooking(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.createSelfReservation(body, user.id);
  return created(c, data);
}

export async function getBooking(c: Context) {
  const user = c.get("user");
  const data = await service.getBooking(c.req.param("bookingId") ?? "", user.id, user.role);
  return ok(c, data);
}

export async function listMyBookings(c: Context) {
  const user = c.get("user");
  const query = c.req.query();
  const result = await service.listMine(user.id, query);
  return okList(c, result.data, result.meta);
}

export async function cancelBooking(c: Context) {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const data = await service.cancelBooking(c.req.param("bookingId") ?? "", user.id, user.role, body.reason);
  return ok(c, data);
}

// ---------- Staff ----------
export async function createWalkIn(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.createWalkIn(body, user.id);
  return created(c, data);
}

export async function searchBookings(c: Context) {
  const user = c.get("user");
  const query = c.req.query();
  const result = await service.searchStaff(user.id, query);
  return okList(c, result.data, result.meta);
}

export async function checkIn(c: Context) {
  const user = c.get("user");
  const data = await service.checkIn(c.req.param("bookingId") ?? "", user.id);
  return ok(c, data);
}

export async function checkOut(c: Context) {
  const user = c.get("user");
  const data = await service.checkOut(c.req.param("bookingId") ?? "", user.id);
  return ok(c, data);
}

export async function allocateUnits(c: Context) {
  const user = c.get("user");
  const body = c.get("validated");
  const data = await service.allocateUnits(c.req.param("bookingId") ?? "", user.id, body.allocations);
  return ok(c, data);
}