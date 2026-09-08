import type { Context } from "hono";
import { ShiftService } from "./shift.service";
import { ok, created } from "@/shared/utils/response";

const service = new ShiftService();

export async function openShift(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.openShift(user.id, body);
  return created(c, data);
}

export async function currentShift(c: Context) {
  const user = c.get("user");
  const data = await service.currentShift(user.id);
  return ok(c, data);
}

export async function closeShift(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.closeShift(c.req.param("shiftId") ?? "", user.id, body);
  return ok(c, data);
}

export async function shiftReport(c: Context) {
  const user = c.get("user");
  const data = await service.shiftReport(c.req.param("shiftId") ?? "", user.id);
  return ok(c, data);
}