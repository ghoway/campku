import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validation.middleware";
import { JoinWaitlistSchema } from "./waitlist.schema";
import { joinWaitlist, cancelWaitlist } from "./waitlist.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("CUSTOMER"));
router.post("/", validate(JoinWaitlistSchema), joinWaitlist);
router.delete("/:waitlistId", cancelWaitlist);

export default router;
