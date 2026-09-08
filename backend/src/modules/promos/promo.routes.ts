import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { validatePromo } from "./promo.controller";

// Mounted di /api/v1/promos
const router = new Hono<{ Variables: Variables }>();

// Public: customer validate promo
router.get("/validate/:code", validatePromo);

export default router;
