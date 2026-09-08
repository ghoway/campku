import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { CreateStaffSchema, UpdateStaffSchema, SetStaffPropertiesSchema } from "./staff.schema";
import {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
  activateStaff,
  setStaffProperties,
} from "./staff.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("OWNER"));

router.get("/staff", listStaff);
router.post("/staff", validate(CreateStaffSchema), createStaff);
router.get("/staff/:staffId", getStaff);
router.patch("/staff/:staffId", validate(UpdateStaffSchema), updateStaff);
router.post("/staff/:staffId/deactivate", deactivateStaff);
router.post("/staff/:staffId/activate", activateStaff);
router.put("/staff/:staffId/properties", validate(SetStaffPropertiesSchema), setStaffProperties);

export default router;
