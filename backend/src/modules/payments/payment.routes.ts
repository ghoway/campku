import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { CreateCashPaymentSchema } from "./payment.schema";
import { listPayments, createCashPayment } from "./payment.controller";

// Mounted di /api/v1/bookings/:bookingId/payments
const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);

router.get("/", listPayments);
router.post("/", requireRole("STAFF", "OWNER"), validate(CreateCashPaymentSchema), createCashPayment);

export default router;
