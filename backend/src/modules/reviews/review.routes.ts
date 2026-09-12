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
import { prisma } from "@/config/database";
import { ok } from "@/shared/utils/response";

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

admin.get("/", async (c) => {
  const status = c.req.query("status");
  const propertyId = c.req.query("propertyId");
  const where: any = {};
  if (status) where.status = status;
  if (propertyId) where.propertyId = propertyId;
  const reviews = await prisma.review.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } }, property: { select: { id: true, name: true } }, booking: { select: { id: true, bookingCode: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(c, reviews);
});

admin.patch("/reviews/:reviewId", updateReviewStatus);
admin.delete("/reviews/:reviewId", deleteReview);

export default router;
export { propertyReviews, me, admin as adminReviewRouter };
