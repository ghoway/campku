import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validation.middleware";
import { UpdateProfileSchema } from "./user.schema";
import { getProfile, updateProfile } from "./user.controller";
import { meBookingRouter } from "@/modules/bookings/booking.routes";
import { me } from "@/modules/reviews/review.routes";
import { prisma } from "@/config/database";
import { ok, okList } from "@/shared/utils/response";
import { WaitlistService } from "@/modules/waitlist/waitlist.service";

const router = new Hono<{ Variables: Variables }>();
const waitlistService = new WaitlistService();

router.use(authMiddleware);

router.get("/", getProfile);
router.patch("/", validate(UpdateProfileSchema), updateProfile);
router.route("/bookings", meBookingRouter);
router.route("/reviews", me);

router.get("/waitlist", async (c) => {
  const user = c.get("user");
  const data = await waitlistService.listMine(user.id);
  return ok(c, data);
});

export default router;
