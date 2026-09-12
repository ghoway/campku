import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { listUnitsForStaff } from "./unit-type.controller";

// Mounted di /staff (auth + role STAFF/OWNER)
const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("STAFF", "OWNER"));

router.get("/unit-types/:unitTypeId/units", listUnitsForStaff);

export default router;