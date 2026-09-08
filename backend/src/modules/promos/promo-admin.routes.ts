import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { validate } from "@/middleware/validation.middleware";
import { CreatePromoSchema, UpdatePromoSchema } from "./promo.schema";
import { listPromos, createPromo, updatePromo, deletePromo } from "./promo.controller";

// Mounted di /api/v1/admin (sudah auth + role OWNER)
const router = new Hono<{ Variables: Variables }>();

router.get("/promos", listPromos);
router.post("/promos", validate(CreatePromoSchema), createPromo);
router.patch("/promos/:promoId", validate(UpdatePromoSchema), updatePromo);
router.delete("/promos/:promoId", deletePromo);

export default router;
