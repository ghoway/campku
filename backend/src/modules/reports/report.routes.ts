import type { Variables } from "@/shared/types";
import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { transactions, transactionSummary, occupancy, revenueByMonth } from "./report.controller";

const router = new Hono<{ Variables: Variables }>();

router.use(authMiddleware);
router.use(requireRole("OWNER"));

router.get("/reports/transactions/summary", transactionSummary);
router.get("/reports/transactions", transactions);
router.get("/reports/occupancy", occupancy);
router.get("/reports/revenue/monthly", revenueByMonth);

export default router;
