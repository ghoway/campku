import type { Context } from "hono";
import { StaffService } from "./staff.service";
import { ok, created } from "@/shared/utils/response";

const service = new StaffService();

export async function listStaff(c: Context) {
  const data = await service.list();
  return ok(c, data);
}

export async function getStaff(c: Context) {
  const data = await service.get(c.req.param("staffId") ?? "");
  return ok(c, data);
}

export async function createStaff(c: Context) {
  const body = c.get("validated");
  const data = await service.create(body);
  return created(c, data);
}

export async function updateStaff(c: Context) {
  const body = c.get("validated");
  const data = await service.update(c.req.param("staffId") ?? "", body);
  return ok(c, data);
}

export async function deactivateStaff(c: Context) {
  const data = await service.deactivate(c.req.param("staffId") ?? "");
  return ok(c, data);
}

export async function activateStaff(c: Context) {
  const data = await service.activate(c.req.param("staffId") ?? "");
  return ok(c, data);
}

export async function setStaffProperties(c: Context) {
  const body = c.get("validated");
  const data = await service.setProperties(c.req.param("staffId") ?? "", body.propertyIds);
  return ok(c, data);
}