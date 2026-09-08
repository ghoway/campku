import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { CreateBookingSchema, WalkInBookingSchema, UnitAllocationSchema } from "./booking.schema";
import {
  createBooking,
  getBooking,
  listMyBookings,
  cancelBooking,
  createWalkIn,
  searchBookings,
  checkIn,
  checkOut,
  allocateUnits,
} from "./booking.controller";
import paymentRoutes from "@/modules/payments/payment.routes";

const router = new Hono<{ Variables: Variables }>();

// Customer: self reservation
router.post("/", authMiddleware, requireRole("OWNER", "STAFF", "CUSTOMER"), validate(CreateBookingSchema), createBooking);
router.get("/:bookingId", authMiddleware, getBooking);
router.post("/:bookingId/cancel", authMiddleware, cancelBooking);
router.route("/:bookingId/payments", paymentRoutes);

export default router;

// Mounted terpisah di /staff/bookings
export const staffBookingRouter = new Hono<{ Variables: Variables }>();
staffBookingRouter.use(authMiddleware);
staffBookingRouter.use(requireRole("STAFF", "OWNER"));

staffBookingRouter.get("/", searchBookings);
staffBookingRouter.post("/walk-in", validate(WalkInBookingSchema), createWalkIn);
staffBookingRouter.post("/:bookingId/check-in", checkIn);
staffBookingRouter.post("/:bookingId/check-out", checkOut);
staffBookingRouter.put("/:bookingId/unit-allocation", validate(UnitAllocationSchema), allocateUnits);

// Me: customer history
export const meBookingRouter = new Hono<{ Variables: Variables }>();
meBookingRouter.use(authMiddleware);
meBookingRouter.get("/", listMyBookings);
