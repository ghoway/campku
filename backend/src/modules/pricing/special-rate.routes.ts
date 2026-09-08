import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { validate } from "@/middleware/validation.middleware";
import { CreateSpecialRateSchema, UpdateSpecialRateSchema } from "./special-rate.schema";
import {
  listSpecialRates,
  createSpecialRate,
  updateSpecialRate,
  deleteSpecialRate,
} from "./special-rate.controller";

// Mounted di bawah /admin/unit-types/:unitTypeId/special-rates (sudah ter-auth + role)
const router = new Hono<{ Variables: Variables }>();

router.get("/", listSpecialRates);
router.post("/", validate(CreateSpecialRateSchema), createSpecialRate);
router.patch("/:id", validate(UpdateSpecialRateSchema), updateSpecialRate);
router.delete("/:id", deleteSpecialRate);

export default router;
