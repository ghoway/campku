import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { rateLimit } from "@/middleware/rate-limit.middleware";
import { CreatePropertySchema, UpdatePropertySchema, SetPropertyFacilitiesSchema } from "./property.schema";
import { listProperties, getProperty } from "./property.controller";
import propertyImagesRouter from "./property-images.routes";
import unitTypeRoutes from "@/modules/unit-types/unit-type.routes";
import availabilityRoutes from "@/modules/availability/availability.routes";
import { propertyReviews } from "@/modules/reviews/review.routes";

const router = new Hono<{ Variables: Variables }>();

// Public
router.use(rateLimit(60_000, 60));
router.get("/", listProperties);
router.get("/:propertyId", getProperty);
router.route("/:propertyId/images", propertyImagesRouter);
router.route("/:propertyId/unit-types", unitTypeRoutes);
router.route("/:propertyId/availability", availabilityRoutes);
router.route("/:propertyId/reviews", propertyReviews);

export default router;
