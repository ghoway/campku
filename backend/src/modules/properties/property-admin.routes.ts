import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { CreatePropertySchema, UpdatePropertySchema, SetPropertyFacilitiesSchema } from "./property.schema";
import {
  listProperties,
  createProperty,
  updateProperty,
  deactivateProperty,
  setPropertyFacilities,
} from "./property.controller";
import { uploadPropertyImage, deletePropertyImage, reorderPropertyImages } from "./property-images.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("OWNER"));

router.get("/properties", listProperties);
router.post("/properties", validate(CreatePropertySchema), createProperty);
router.patch("/properties/:propertyId", validate(UpdatePropertySchema), updateProperty);
router.patch("/properties/:propertyId/deactivate", deactivateProperty);

router.post("/properties/:propertyId/images", uploadPropertyImage);
router.delete("/properties/:propertyId/images/:imageId", deletePropertyImage);
router.patch("/properties/:propertyId/images/reorder", reorderPropertyImages);

router.put("/properties/:propertyId/facilities", validate(SetPropertyFacilitiesSchema), setPropertyFacilities);

export default router;
