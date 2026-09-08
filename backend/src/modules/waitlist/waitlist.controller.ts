import type { Context } from "hono";
import { WaitlistService } from "./waitlist.service";
import { ok, created } from "@/shared/utils/response";

const service = new WaitlistService();

export async function joinWaitlist(c: Context) {
  const body = c.get("validated");
  const user = c.get("user");
  const data = await service.join(user.id, body);
  return created(c, data);
}

export async function listMyWaitlists(c: Context) {
  const user = c.get("user");
  const data = await service.listMine(user.id);
  return ok(c, data);
}

export async function cancelWaitlist(c: Context) {
  const user = c.get("user");
  const data = await service.cancel(user.id, c.req.param("waitlistId") ?? "");
  return ok(c, data);
}

export async function listPropertyWaitlist(c: Context) {
  const data = await service.listForProperty(c.req.param("propertyId") ?? "");
  return ok(c, data);
}