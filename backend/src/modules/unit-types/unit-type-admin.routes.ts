import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { validate } from "@/middleware/validation.middleware";
import {
  CreateUnitTypeSchema,
  UpdateUnitTypeSchema,
  CreateUnitSchema,
  UpdateUnitSchema,
} from "./unit-type.schema";
import {
  getUnitType,
  createUnitType,
  updateUnitType,
  deleteUnitType,
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  uploadUnitTypeImage,
} from "./unit-type.controller";
import specialRateRoutes from "@/modules/pricing/special-rate.routes";

// Mounted di /api/v1/admin (sudah auth + role OWNER)
const router = new Hono<{ Variables: Variables }>();

// Property-scoped
router.post("/properties/:propertyId/unit-types", validate(CreateUnitTypeSchema), createUnitType);

// Unit-type-scoped
router.get("/unit-types/:unitTypeId", getUnitType);
router.patch("/unit-types/:unitTypeId", validate(UpdateUnitTypeSchema), updateUnitType);
router.delete("/unit-types/:unitTypeId", deleteUnitType);
router.post("/unit-types/:unitTypeId/images", uploadUnitTypeImage);

// Units
router.get("/unit-types/:unitTypeId/units", listUnits);
router.post("/unit-types/:unitTypeId/units", validate(CreateUnitSchema), createUnit);
router.patch("/unit-types/:unitTypeId/units/:unitId", validate(UpdateUnitSchema), updateUnit);
router.delete("/unit-types/:unitTypeId/units/:unitId", deleteUnit);

// Special rates
router.route("/unit-types/:unitTypeId/special-rates", specialRateRoutes);

export default router;
