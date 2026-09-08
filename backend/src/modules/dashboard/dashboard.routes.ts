import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { dashboard } from "./dashboard.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("OWNER"));
router.get("/dashboard", dashboard);

export default router;
