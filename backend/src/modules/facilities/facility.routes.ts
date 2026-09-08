import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { listFacilities } from "./facility.controller";

// Mounted di /api/v1/facilities (public, hanya ACTIVE)
const router = new Hono<{ Variables: Variables }>();

router.get("/", listFacilities);

export default router;
