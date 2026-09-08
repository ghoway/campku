import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { CreateReviewSchema } from "./review.schema";
import {
  listPropertyReviews,
  listMyReviews,
  createReview,
  updateReviewStatus,
  deleteReview,
} from "./review.controller";

// Sub-route di /properties/:propertyId/reviews (public)
const propertyReviews = new Hono<{ Variables: Variables }>();
propertyReviews.get("/", listPropertyReviews);

// /api/v1/reviews
const router = new Hono<{ Variables: Variables }>();
router.post("/", authMiddleware, requireRole("CUSTOMER", "OWNER", "STAFF"), validate(CreateReviewSchema), createReview);

// /api/v1/me/reviews
const me = new Hono<{ Variables: Variables }>();
me.use(authMiddleware);
me.get("/", listMyReviews);

// /api/v1/admin/reviews
const admin = new Hono<{ Variables: Variables }>();
admin.use(authMiddleware);
admin.use(requireRole("OWNER"));
admin.patch("/reviews/:reviewId", updateReviewStatus);
admin.delete("/reviews/:reviewId", deleteReview);

export default router;
export { propertyReviews, me, admin as adminReviewRouter };
