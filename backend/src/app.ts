import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Variables } from "@/shared/types";
import { serveStatic } from "@hono/node-server/serve-static";
import { swaggerUI } from "@hono/swagger-ui";
import { errorHandler } from "@/middleware/error.middleware";
import { openApiSpec } from "@/config/openapi";
import authRoutes from "@/modules/auth/auth.routes";
import propertyRoutes from "@/modules/properties/property.routes";
import adminRoutes from "@/modules/admin/admin.routes";
import facilityRoutes from "@/modules/facilities/facility.routes";
import bookingRoutes, { staffBookingRouter } from "@/modules/bookings/booking.routes";
import staffUnitTypeRoutes from "@/modules/unit-types/unit-type-staff.routes";
import midtransRoutes from "@/modules/payments/midtrans.routes";
import meRoutes from "@/modules/users/me.routes";
import shiftRoutes from "@/modules/shifts/shift.routes";
import waitlistRoutes from "@/modules/waitlist/waitlist.routes";
import promoRoutes from "@/modules/promos/promo.routes";
import reviewRoutes from "@/modules/reviews/review.routes";
import { env } from "@/config/env";

const app = new Hono<{ Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:5174"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-Id", requestId);
  await next();
});

// Static uploads
app.use("/uploads/*", serveStatic({ root: "./" }));

const api = new Hono<{ Variables: Variables }>();

api.get("/health", (c) =>
  c.json({ success: true, data: { status: "ok", env: env.NODE_ENV, time: new Date().toISOString() } })
);

api.route("/auth", authRoutes);
api.route("/properties", propertyRoutes);
api.route("/admin", adminRoutes);
api.route("/facilities", facilityRoutes);

api.route("/bookings", bookingRoutes);
api.route("/staff/bookings", staffBookingRouter);
api.route("/staff/shifts", shiftRoutes);
api.route("/staff", staffUnitTypeRoutes);

api.route("/me", meRoutes);
api.route("/reviews", reviewRoutes);
api.route("/waitlist", waitlistRoutes);
api.route("/promos", promoRoutes);

// Midtrans webhook + payment.create
api.route("/", midtransRoutes);

app.route("/api/v1", api);

// 404
app.notFound((c) =>
  c.json(
    { success: false, error: { code: "NOT_FOUND", message: `Route ${c.req.path} not found` } },
    404
  )
);

// Error handler
app.onError(errorHandler);

// ---------------------------------------------------------------
// Swagger UI + OpenAPI spec
// ---------------------------------------------------------------
app.get("/swagger", swaggerUI({ url: "/openapi.json" }));
app.get("/openapi.json", (c) => c.json(openApiSpec));
api.get("/openapi.json", (c) => c.json(openApiSpec));

export default app;