import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { OpenShiftSchema, CloseShiftSchema } from "./shift.schema";
import { openShift, currentShift, closeShift, shiftReport } from "./shift.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("STAFF", "OWNER"));

router.post("/open", validate(OpenShiftSchema), openShift);
router.get("/current", currentShift);
router.post("/:shiftId/close", validate(CloseShiftSchema), closeShift);
router.get("/:shiftId/report", shiftReport);

export default router;
