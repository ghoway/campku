import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { validate } from "@/middleware/validation.middleware";
import { CreateFacilitySchema, UpdateFacilitySchema } from "./facility.schema";
import { listAllFacilities, createFacility, updateFacility } from "./facility.controller";

// Mounted di /api/v1/admin (sudah auth + role OWNER)
const router = new Hono<{ Variables: Variables }>();

router.get("/facilities", listAllFacilities);
router.post("/facilities", validate(CreateFacilitySchema), createFacility);
router.patch("/facilities/:id", validate(UpdateFacilitySchema), updateFacility);

export default router;
