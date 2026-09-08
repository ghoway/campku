import type { Variables } from "@/shared/types";
import type { Context } from "hono";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import propertyAdminRoutes from "@/modules/properties/property-admin.routes";
import facilityAdminRoutes from "@/modules/facilities/facility-admin.routes";
import unitTypeAdminRoutes from "@/modules/unit-types/unit-type-admin.routes";
import staffRoutes from "@/modules/staff/staff.routes";
import reportRoutes from "@/modules/reports/report.routes";
import dashboardRoutes from "@/modules/dashboard/dashboard.routes";
import promoAdminRoutes from "@/modules/promos/promo-admin.routes";
import { adminReviewRouter } from "@/modules/reviews/review.routes";
import { prisma } from "@/config/database";
import { ok } from "@/shared/utils/response";

async function waitlistForProperty(c: Context) {
  const rows = await prisma.waitlistEntry.findMany({
    where: {
      propertyId: c.req.param("propertyId"),
      status: { in: ["WAITING", "NOTIFIED"] },
    },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { priorityQueue: "asc" },
  });
  return ok(c, rows);
}

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("OWNER"));

router.route("/", propertyAdminRoutes);
router.route("/", facilityAdminRoutes);
router.route("/", unitTypeAdminRoutes);
router.route("/", staffRoutes);
router.route("/", reportRoutes);
router.route("/", dashboardRoutes);
router.route("/", promoAdminRoutes);
router.route("/", adminReviewRouter);
router.get("/properties/:propertyId/waitlist", waitlistForProperty);

export default router;
