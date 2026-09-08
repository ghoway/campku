import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { listUnitTypes } from "./unit-type.controller";

// Mounted di /properties/:propertyId/unit-types (public)
const router = new Hono<{ Variables: Variables }>();

router.get("/", listUnitTypes);

export default router;
