import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { getAvailability } from "./availability.controller";
import { rateLimit } from "@/middleware/rate-limit.middleware";

// Mounted di /properties/:propertyId/availability (public)
const router = new Hono<{ Variables: Variables }>();

router.use(rateLimit(60_000, 120));
router.get("/", getAvailability);

export default router;
