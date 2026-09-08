import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validation.middleware";
import { MidtransNotificationSchema } from "./payment.schema";
import { createMidtransPayment, midtransNotification } from "./payment.controller";

const router = new Hono<{ Variables: Variables }>();

// POST /api/v1/bookings/:bookingId/payment/create
router.post("/bookings/:bookingId/payment/create", authMiddleware, createMidtransPayment);

// POST /api/v1/payments/midtrans/notification  (webhook, tanpa auth)
router.post("/payments/midtrans/notification", validate(MidtransNotificationSchema), midtransNotification);

export default router;
