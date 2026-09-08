import type { Context } from "hono";
import { DashboardService } from "./dashboard.service";
import { ok } from "@/shared/utils/response";

const service = new DashboardService();

export async function dashboard(c: Context) {
  const data = await service.get();
  return ok(c, data);
}