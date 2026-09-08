import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { listPropertyImages } from "./property-images.controller";

const router = new Hono<{ Variables: Variables }>();

router.get("/", listPropertyImages);

export default router;
