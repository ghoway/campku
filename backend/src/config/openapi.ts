import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { CreateCashPaymentSchema, MidtransNotificationSchema } from "@/modules/payments/payment.schema";
import { CreateSpecialRateSchema, UpdateSpecialRateSchema } from "@/modules/pricing/special-rate.schema";
import { CreateUnitTypeSchema, UpdateUnitTypeSchema, CreateUnitSchema, UpdateUnitSchema } from "@/modules/unit-types/unit-type.schema";
import { CreatePropertySchema, UpdatePropertySchema, SetPropertyFacilitiesSchema } from "@/modules/properties/property.schema";
import { CreateFacilitySchema, UpdateFacilitySchema } from "@/modules/facilities/facility.schema";
import { CreateStaffSchema, UpdateStaffSchema, SetStaffPropertiesSchema } from "@/modules/staff/staff.schema";
import { CreatePromoSchema, UpdatePromoSchema } from "@/modules/promos/promo.schema";
import { CreateReviewSchema } from "@/modules/reviews/review.schema";
import { JoinWaitlistSchema } from "@/modules/waitlist/waitlist.schema";
import { CreateBookingSchema, WalkInBookingSchema, UnitAllocationSchema } from "@/modules/bookings/booking.schema";
import { OpenShiftSchema, CloseShiftSchema } from "@/modules/shifts/shift.schema";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  LogoutSchema,
  VerifyOtpSchema,
  ResendOtpSchema,
} from "@/modules/auth/auth.schema";
import { UpdateProfileSchema } from "@/modules/users/user.schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OperationId = string;
type Method = "get" | "post" | "patch" | "put" | "delete";

interface ParamDef {
  name: string;
  description?: string;
  required?: boolean;
  example?: unknown;
  schema?: z.ZodType;
  enum?: string[];
}

interface BodyDef {
  schema?: z.ZodType;
  summary?: string;
  multipart?: boolean;
}

interface RouteDef {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  security?: boolean;
  body?: BodyDef;
  pathParams?: ParamDef[];
  query?: ParamDef[];
  consumes?: string[];
}

const authSchemas: Record<string, z.ZodType> = {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  LogoutSchema,
  VerifyOtpSchema,
  ResendOtpSchema,
  CreatePropertySchema,
  UpdatePropertySchema,
  SetPropertyFacilitiesSchema,
  CreateFacilitySchema,
  UpdateFacilitySchema,
  CreateUnitTypeSchema,
  UpdateUnitTypeSchema,
  CreateUnitSchema,
  UpdateUnitSchema,
  CreateSpecialRateSchema,
  UpdateSpecialRateSchema,
  CreateStaffSchema,
  UpdateStaffSchema,
  SetStaffPropertiesSchema,
  CreatePromoSchema,
  UpdatePromoSchema,
  CreateReviewSchema,
  JoinWaitlistSchema,
  CreateBookingSchema,
  WalkInBookingSchema,
  UnitAllocationSchema,
  OpenShiftSchema,
  CloseShiftSchema,
  CreateCashPaymentSchema,
  MidtransNotificationSchema,
  UpdateProfileSchema,
};

// Helper to reuse existing zod request bodies by name
function named(name: keyof typeof authSchemas): BodyDef {
  return { schema: authSchemas[name] };
}

const UUID = (description: string): ParamDef[] => [{ name: "id", description }];

const q = (name: string, description: string, required = false): ParamDef => ({
  name,
  description,
  required,
});

const dateQ = (name: string, description: string, required = false): ParamDef => ({
  name,
  description: `${description} (format YYYY-MM-DD)`,
  required,
  example: "2026-09-15",
});

const paginationQ: ParamDef[] = [
  q("page", "Page number (default 1)", false),
  q("limit", "Results per page (default 20, max 50)", false),
];

// ---------------------------------------------------------------------------
// Route inventory (mirrors app.ts + every module router)
// ---------------------------------------------------------------------------

const routes: RouteDef[] = [
  // ---- Health / Meta
  { method: "get", path: "/api/v1/health", tag: "Health", summary: "Health check", description: "Liveness + env info." },
  { method: "get", path: "/api/v1/openapi.json", tag: "Health", summary: "OpenAPI specification (JSON)", description: "This machine-readable spec." },

  // ---- Auth
  { method: "post", path: "/api/v1/auth/register", tag: "Auth", summary: "Register a customer account", description: "Creates the account with PENDING status and emails a 6-digit OTP. Verify with POST /auth/verify-otp before logging in. In development the OTP is also returned as `debugOtp`.", body: named("RegisterSchema") },
  { method: "post", path: "/api/v1/auth/verify-otp", tag: "Auth", summary: "Verify email with the OTP code", body: named("VerifyOtpSchema") },
  { method: "post", path: "/api/v1/auth/resend-otp", tag: "Auth", summary: "Resend the verification OTP (60s cooldown)", body: named("ResendOtpSchema") },
  { method: "post", path: "/api/v1/auth/login", tag: "Auth", summary: "Login with email + password", description: "Returns access token (15 min) and refresh token (7 days). Unverified accounts get 401 code OTP_REQUIRED.", body: named("LoginSchema") },
  { method: "post", path: "/api/v1/auth/refresh", tag: "Auth", summary: "Refresh access token", body: named("RefreshTokenSchema") },
  { method: "post", path: "/api/v1/auth/logout", tag: "Auth", summary: "Logout / revoke refresh token", security: true, body: named("LogoutSchema") },
  { method: "post", path: "/api/v1/auth/change-password", tag: "Auth", summary: "Change current password", security: true, body: named("ChangePasswordSchema") },
  { method: "get", path: "/api/v1/auth/me", tag: "Auth", summary: "Get current user profile", security: true },

  // ---- Public: Properties
  {
    method: "get",
    path: "/api/v1/properties",
    tag: "Properties (public)",
    summary: "List properties",
    query: [
      q("search", "Search by name"),
      q("city", "Filter by city"),
      q("minPrice", "Minimum weekday price"),
      q("maxPrice", "Maximum weekday price"),
      q("sortBy", "Sort field (default created_at)"),
      q("sortOrder", "Sort order (asc|desc)"),
      ...paginationQ,
    ],
  },
  { method: "get", path: "/api/v1/properties/{propertyId}", tag: "Properties (public)", summary: "Get a property by id", pathParams: UUID("Property UUID") },
  { method: "get", path: "/api/v1/properties/{propertyId}/images", tag: "Properties (public)", summary: "List property images", pathParams: UUID("Property UUID") },
  { method: "get", path: "/api/v1/properties/{propertyId}/unit-types", tag: "Properties (public)", summary: "List active unit types for a property", pathParams: UUID("Property UUID") },
  {
    method: "get",
    path: "/api/v1/properties/{propertyId}/availability",
    tag: "Properties (public)",
    summary: "Check availability + estimated pricing",
    pathParams: UUID("Property UUID"),
    query: [
      { ...dateQ("checkIn", "Stay start date", true) },
      { ...dateQ("checkOut", "Stay end date", true) },
      q("guests", "Number of guests (optional)"),
    ],
  },
  { method: "get", path: "/api/v1/properties/{propertyId}/reviews", tag: "Properties (public)", summary: "List approved reviews for a property", pathParams: UUID("Property UUID") },

  // ---- Public: Facilities
  { method: "get", path: "/api/v1/facilities", tag: "Facilities (public)", summary: "List active facilities" },

  // ---- Public: Promos
  { method: "get", path: "/api/v1/promos/validate/{code}", tag: "Promos", summary: "Validate a promo code", pathParams: [{ name: "code", description: "Promo code (case-insensitive)", required: true }] },

  // ---- Admin: Properties
  { method: "post", path: "/api/v1/admin/properties", tag: "Admin - Properties", summary: "Create a property", security: true, body: named("CreatePropertySchema") },
  { method: "patch", path: "/api/v1/admin/properties/{propertyId}", tag: "Admin - Properties", summary: "Update a property", security: true, pathParams: UUID("Property UUID"), body: named("UpdatePropertySchema") },
  { method: "patch", path: "/api/v1/admin/properties/{propertyId}/deactivate", tag: "Admin - Properties", summary: "Deactivate a property (soft)", security: true, pathParams: UUID("Property UUID") },
  { method: "put", path: "/api/v1/admin/properties/{propertyId}/facilities", tag: "Admin - Properties", summary: "Replace property facilities", security: true, pathParams: UUID("Property UUID"), body: named("SetPropertyFacilitiesSchema") },
  {
    method: "post",
    path: "/api/v1/admin/properties/{propertyId}/images",
    tag: "Admin - Properties",
    summary: "Upload a property image (multipart)",
    security: true,
    pathParams: UUID("Property UUID"),
    body: { multipart: true, summary: "Multipart upload: file (JPG/PNG/WebP, max 5 MB) + optional isPrimary (boolean)" },
  },
  { method: "delete", path: "/api/v1/admin/properties/{propertyId}/images/{imageId}", tag: "Admin - Properties", summary: "Delete a property image", security: true, pathParams: [{ name: "propertyId", description: "Property UUID", required: true }, { name: "imageId", description: "Image UUID", required: true }] },
  { method: "patch", path: "/api/v1/admin/properties/{propertyId}/images/reorder", tag: "Admin - Properties", summary: "Reorder property images", security: true, pathParams: UUID("Property UUID") },
  { method: "get", path: "/api/v1/admin/properties/{propertyId}/waitlist", tag: "Admin - Properties", summary: "Waitlist entries for a property", security: true, pathParams: UUID("Property UUID") },

  // ---- Admin: Facilities
  { method: "get", path: "/api/v1/admin/facilities", tag: "Admin - Facilities", summary: "List all facilities", security: true },
  { method: "post", path: "/api/v1/admin/facilities", tag: "Admin - Facilities", summary: "Create a facility", security: true, body: named("CreateFacilitySchema") },
  { method: "patch", path: "/api/v1/admin/facilities/{id}", tag: "Admin - Facilities", summary: "Update a facility", security: true, pathParams: UUID("Facility UUID"), body: named("UpdateFacilitySchema") },

  // ---- Admin: Unit types & units
  { method: "post", path: "/api/v1/admin/properties/{propertyId}/unit-types", tag: "Admin - Unit Types", summary: "Create a unit type", security: true, pathParams: UUID("Property UUID"), body: named("CreateUnitTypeSchema") },
  { method: "get", path: "/api/v1/admin/unit-types/{unitTypeId}", tag: "Admin - Unit Types", summary: "Get a unit type (with units, images, rates)", security: true, pathParams: UUID("Unit type UUID") },
  { method: "patch", path: "/api/v1/admin/unit-types/{unitTypeId}", tag: "Admin - Unit Types", summary: "Update a unit type", security: true, pathParams: UUID("Unit type UUID"), body: named("UpdateUnitTypeSchema") },
  { method: "delete", path: "/api/v1/admin/unit-types/{unitTypeId}", tag: "Admin - Unit Types", summary: "Soft-delete a unit type", security: true, pathParams: UUID("Unit type UUID") },
  { method: "post", path: "/api/v1/admin/unit-types/{unitTypeId}/images", tag: "Admin - Unit Types", summary: "Upload a unit-type image (multipart)", security: true, pathParams: UUID("Unit type UUID"), body: { multipart: true, summary: "Image file (JPG/PNG/WebP, max 5 MB)" } },
  { method: "get", path: "/api/v1/admin/unit-types/{unitTypeId}/units", tag: "Admin - Unit Types", summary: "List units of a unit type", security: true, pathParams: UUID("Unit type UUID") },
  { method: "post", path: "/api/v1/admin/unit-types/{unitTypeId}/units", tag: "Admin - Unit Types", summary: "Create a unit", security: true, pathParams: UUID("Unit type UUID"), body: named("CreateUnitSchema") },
  { method: "patch", path: "/api/v1/admin/unit-types/{unitTypeId}/units/{unitId}", tag: "Admin - Unit Types", summary: "Update a unit", security: true, pathParams: [{ name: "unitTypeId", description: "Unit type UUID" }, { name: "unitId", description: "Unit UUID" }], body: named("UpdateUnitSchema") },
  { method: "delete", path: "/api/v1/admin/unit-types/{unitTypeId}/units/{unitId}", tag: "Admin - Unit Types", summary: "Soft-delete a unit", security: true, pathParams: [{ name: "unitTypeId", description: "Unit type UUID" }, { name: "unitId", description: "Unit UUID" }] },
  { method: "get", path: "/api/v1/admin/unit-types/{unitTypeId}/special-rates", tag: "Admin - Unit Types", summary: "List special rate periods", security: true, pathParams: UUID("Unit type UUID") },
  { method: "post", path: "/api/v1/admin/unit-types/{unitTypeId}/special-rates", tag: "Admin - Unit Types", summary: "Create a special rate period", security: true, pathParams: UUID("Unit type UUID"), body: named("CreateSpecialRateSchema") },
  { method: "patch", path: "/api/v1/admin/unit-types/{unitTypeId}/special-rates/{id}", tag: "Admin - Unit Types", summary: "Update a special rate period", security: true, pathParams: [{ name: "unitTypeId", description: "Unit type UUID" }, { name: "id", description: "Special rate UUID" }], body: named("UpdateSpecialRateSchema") },
  { method: "delete", path: "/api/v1/admin/unit-types/{unitTypeId}/special-rates/{id}", tag: "Admin - Unit Types", summary: "Delete a special rate period", security: true, pathParams: [{ name: "unitTypeId", description: "Unit type UUID" }, { name: "id", description: "Special rate UUID" }] },

  // ---- Admin: Staff
  { method: "get", path: "/api/v1/admin/staff", tag: "Admin - Staff", summary: "List staff", security: true },
  { method: "post", path: "/api/v1/admin/staff", tag: "Admin - Staff", summary: "Create a staff account", security: true, body: named("CreateStaffSchema") },
  { method: "get", path: "/api/v1/admin/staff/{staffId}", tag: "Admin - Staff", summary: "Get a staff member", security: true, pathParams: UUID("Staff UUID") },
  { method: "patch", path: "/api/v1/admin/staff/{staffId}", tag: "Admin - Staff", summary: "Update a staff member", security: true, pathParams: UUID("Staff UUID"), body: named("UpdateStaffSchema") },
  { method: "post", path: "/api/v1/admin/staff/{staffId}/deactivate", tag: "Admin - Staff", summary: "Deactivate a staff member", security: true, pathParams: UUID("Staff UUID") },
  { method: "post", path: "/api/v1/admin/staff/{staffId}/activate", tag: "Admin - Staff", summary: "Reactivate a staff member", security: true, pathParams: UUID("Staff UUID") },
  { method: "put", path: "/api/v1/admin/staff/{staffId}/properties", tag: "Admin - Staff", summary: "Set staff property assignments", security: true, pathParams: UUID("Staff UUID"), body: named("SetStaffPropertiesSchema") },

  // ---- Admin: Promos
  { method: "get", path: "/api/v1/admin/promos", tag: "Admin - Promos", summary: "List promos", security: true },
  { method: "post", path: "/api/v1/admin/promos", tag: "Admin - Promos", summary: "Create a promo", security: true, body: named("CreatePromoSchema") },
  { method: "patch", path: "/api/v1/admin/promos/{promoId}", tag: "Admin - Promos", summary: "Update a promo", security: true, pathParams: UUID("Promo UUID"), body: named("UpdatePromoSchema") },
  { method: "delete", path: "/api/v1/admin/promos/{promoId}", tag: "Admin - Promos", summary: "Delete a promo", security: true, pathParams: UUID("Promo UUID") },

  // ---- Admin: Reviews
  { method: "patch", path: "/api/v1/admin/reviews/{reviewId}", tag: "Admin - Reviews", summary: "Approve / reject a review", security: true, pathParams: UUID("Review UUID") },
  { method: "delete", path: "/api/v1/admin/reviews/{reviewId}", tag: "Admin - Reviews", summary: "Delete a review", security: true, pathParams: UUID("Review UUID") },

  // ---- Admin: Reports & Dashboard
  {
    method: "get",
    path: "/api/v1/admin/reports/transactions/summary",
    tag: "Admin - Reports",
    summary: "Transaction summary (count + revenue)",
    security: true,
    query: [dateQ("dateFrom", "Start date (inclusive)"), dateQ("dateTo", "End date (inclusive)"), q("paymentMethod", "Payment method filter"), q("propertyId", "Property UUID filter")],
  },
  {
    method: "get",
    path: "/api/v1/admin/reports/transactions",
    tag: "Admin - Reports",
    summary: "List transactions (supports export)",
    description: "Pass ?format=pdf or ?format=excel to download a file instead of JSON.",
    security: true,
    query: [dateQ("dateFrom", "Start date (inclusive)"), dateQ("dateTo", "End date (inclusive)"), q("paymentMethod", "Payment method filter"), q("propertyId", "Property UUID filter"), q("staffId", "Staff UUID filter"), q("format", "pdf | excel", false), ...paginationQ],
  },
  {
    method: "get",
    path: "/api/v1/admin/reports/occupancy",
    tag: "Admin - Reports",
    summary: "Occupancy report (supports export)",
    security: true,
    query: [dateQ("dateFrom", "Start date (default 30 days ago)"), dateQ("dateTo", "End date (default now)"), q("propertyId", "Property UUID filter"), q("format", "pdf | excel", false)],
  },
  {
    method: "get",
    path: "/api/v1/admin/reports/revenue/monthly",
    tag: "Admin - Reports",
    summary: "Monthly revenue for a year",
    security: true,
    query: [q("year", "Year (default current)", false)],
  },
  { method: "get", path: "/api/v1/admin/dashboard", tag: "Admin - Reports", summary: "Dashboard overview metrics", security: true },

  // ---- Bookings (customer)
  {
    method: "post",
    path: "/api/v1/bookings",
    tag: "Bookings",
    summary: "Create a self-reservation",
    description: "Calculates pricing, blocks units, returns the booking with a Midtrans payment URL when configured.",
    security: true,
    body: named("CreateBookingSchema"),
  },
  { method: "get", path: "/api/v1/bookings/{bookingId}", tag: "Bookings", summary: "Get a booking (owner/staff or the booking owner)", security: true, pathParams: UUID("Booking UUID") },
  { method: "post", path: "/api/v1/bookings/{bookingId}/cancel", tag: "Bookings", summary: "Cancel a booking", description: "Optional JSON body: { \"reason\": \"...\" }.", security: true, pathParams: UUID("Booking UUID") },
  { method: "get", path: "/api/v1/bookings/{bookingId}/payments", tag: "Bookings", summary: "List payments for a booking", security: true, pathParams: UUID("Booking UUID") },
  { method: "post", path: "/api/v1/bookings/{bookingId}/payments", tag: "Bookings", summary: "Record a cash/transfer payment (staff/owner)", security: true, pathParams: UUID("Booking UUID"), body: named("CreateCashPaymentSchema") },

  // ---- Bookings (staff)
  {
    method: "get",
    path: "/api/v1/staff/bookings",
    tag: "Bookings - Staff",
    summary: "Search bookings (staff dashboard)",
    security: true,
    query: [q("bookingCode", "Search by booking code"), q("guestName", "Search by guest name"), q("phone", "Search by guest phone"), q("status", "Filter by status (PENDING, AWAITING_PAYMENT, PAID, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW, EXPIRED)"), dateQ("checkIn", "Check-in date from"), dateQ("checkOut", "Check-out date to"), q("propertyId", "Filter by property"), ...paginationQ],
  },
  { method: "post", path: "/api/v1/staff/bookings/walk-in", tag: "Bookings - Staff", summary: "Create a walk-in / phone booking", security: true, body: named("WalkInBookingSchema") },
  { method: "post", path: "/api/v1/staff/bookings/{bookingId}/check-in", tag: "Bookings - Staff", summary: "Check a booking in", security: true, pathParams: UUID("Booking UUID") },
  { method: "post", path: "/api/v1/staff/bookings/{bookingId}/check-out", tag: "Bookings - Staff", summary: "Check a booking out", security: true, pathParams: UUID("Booking UUID") },
  { method: "put", path: "/api/v1/staff/bookings/{bookingId}/unit-allocation", tag: "Bookings - Staff", summary: "Assign units to booking items", security: true, pathParams: UUID("Booking UUID"), body: named("UnitAllocationSchema") },
  { method: "get", path: "/api/v1/staff/unit-types/{unitTypeId}/units", tag: "Bookings - Staff", summary: "List units of a unit type (for check-in allocation)", security: true, pathParams: UUID("Unit type UUID") },

  // ---- Midtrans
  { method: "post", path: "/api/v1/bookings/{bookingId}/payment/create", tag: "Midtrans", summary: "Create a Midtrans Snap payment token + URL", security: true, pathParams: UUID("Booking UUID") },
  { method: "post", path: "/api/v1/payments/midtrans/notification", tag: "Midtrans", summary: "Midtrans webhook notification (server-to-server)", body: named("MidtransNotificationSchema") },

  // ---- Staff shifts
  { method: "post", path: "/api/v1/staff/shifts/open", tag: "Shifts", summary: "Open a cashier shift", security: true, body: named("OpenShiftSchema") },
  { method: "get", path: "/api/v1/staff/shifts/current", tag: "Shifts", summary: "Get the current open shift", security: true },
  { method: "post", path: "/api/v1/staff/shifts/{shiftId}/close", tag: "Shifts", summary: "Close a shift with closing cash", security: true, pathParams: UUID("Shift UUID"), body: named("CloseShiftSchema") },
  { method: "get", path: "/api/v1/staff/shifts/{shiftId}/report", tag: "Shifts", summary: "Shift sales report", security: true, pathParams: UUID("Shift UUID") },

  // ---- Me
  { method: "get", path: "/api/v1/me", tag: "Me", summary: "Get own profile", security: true },
  { method: "patch", path: "/api/v1/me", tag: "Me", summary: "Update own profile", security: true, body: named("UpdateProfileSchema") },
  { method: "get", path: "/api/v1/me/bookings", tag: "Me", summary: "Own bookings", security: true, query: [...paginationQ, q("status", "Filter by status")] },
  { method: "get", path: "/api/v1/me/reviews", tag: "Me", summary: "Own reviews", security: true },
  { method: "get", path: "/api/v1/me/waitlist", tag: "Me", summary: "Own waitlist entries", security: true },

  // ---- Reviews
  { method: "post", path: "/api/v1/reviews", tag: "Reviews", summary: "Create a review for a completed booking", security: true, body: named("CreateReviewSchema") },

  // ---- Waitlist
  { method: "post", path: "/api/v1/waitlist", tag: "Waitlist", summary: "Join a property waitlist", security: true, body: named("JoinWaitlistSchema") },
  { method: "delete", path: "/api/v1/waitlist/{waitlistId}", tag: "Waitlist", summary: "Cancel a waitlist entry", security: true, pathParams: UUID("Waitlist UUID") },
];

// ---------------------------------------------------------------------------
// Build OpenAPI 3.1 document
// ---------------------------------------------------------------------------

function build() {
  const pathMap: Record<string, Record<string, unknown>> = {};

  for (const r of routes) {
    const oasPath = r.path.replace(/\/:([A-Za-z0-9_]+)/g, "/{$1}");
    pathMap[oasPath] ??= {};

    const op: Record<string, unknown> = {
      tags: [r.tag],
      summary: r.summary,
      description: r.description ?? r.summary,
      operationId: `${r.method}_${oasPath.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
      responses: {
        200: { description: "Success", content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
        400: { $ref: "#/components/responses/Error" },
        401: { $ref: "#/components/responses/Unauthorized" },
        403: { $ref: "#/components/responses/Forbidden" },
        404: { $ref: "#/components/responses/NotFound" },
        422: { $ref: "#/components/responses/Validation" },
        429: { $ref: "#/components/responses/TooMany" },
        500: { $ref: "#/components/responses/Error" },
      },
    };

    if (r.security) {
      op.security = [{ bearerAuth: [] }];
    }

    const parameters: Record<string, unknown>[] = [];

    for (const p of r.pathParams ?? []) {
      parameters.push({
        name: p.name,
        in: "path",
        required: p.required ?? true,
        description: p.description,
        schema: { type: "string" },
      });
    }

    for (const p of r.query ?? []) {
      const schema: Record<string, unknown> = { type: "string" };
      if (p.enum) schema.enum = p.enum;
      if (p.schema) {
        const js = zodToJsonSchema(p.schema);
        Object.assign(schema, js);
      }
      parameters.push({
        name: p.name,
        in: "query",
        required: p.required ?? false,
        description: p.description,
        schema,
        ...(p.example !== undefined ? { example: p.example } : {}),
      });
    }

    if (parameters.length) op.parameters = parameters;

    if (r.body) {
      if (r.body.multipart) {
        op.requestBody = {
          description: r.body.summary,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary", description: "Image file (JPG/PNG/WebP, max 5 MB)" },
                  ...(r.body.summary?.includes("isPrimary")
                    ? { isPrimary: { type: "boolean", description: "Set as primary image" } }
                    : {}),
                },
                required: ["file"],
              },
            },
          },
        };
      } else if (r.body.schema) {
        const s = zodToJsonSchema(r.body.schema);
        const defs = (s as any).definitions;
        const refTarget = (s as any).$ref;
        let bodySchema: unknown = s;
        if (refTarget && defs) {
          // Move definitions into components once
          Object.assign(componentSchemas, defs);
          bodySchema = { $ref: refTarget.replace("#/definitions/", "#/components/schemas/") };
        }
        op.requestBody = {
          required: true,
          content: { "application/json": { schema: bodySchema } },
        };
      }
    }

    pathMap[oasPath][r.method] = op;
  }

  return pathMap;
}

// Shared schema components (envelope + common types)
const componentSchemas: Record<string, unknown> = {
  Envelope: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: { type: ["object", "array", "string", "number", "boolean", "null"] },
      meta: {
        type: ["object", "null"],
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
    },
  },
  ApiError: {
    type: "object",
    properties: {
      success: { type: "boolean", enum: [false] },
      error: {
        type: "object",
        properties: {
          code: { type: "string", description: "Machine-readable error code (e.g. VALIDATION_ERROR, DUPLICATE)" },
          message: { type: "string" },
          details: { type: "array", items: { type: "object" } },
        },
        required: ["code", "message"],
      },
    },
  },
};

const paths = build();

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Camping Ground Reservation API",
    version: "1.0.0",
    description:
      "Multi-property campground booking system. Money amounts are returned as strings (bigint → decimal string).\n\n" +
      "**Roles:** OWNER (admin), STAFF (front-desk/ops), CUSTOMER (public app).\n" +
      "**Auth:** click \"Authorize\", paste `Bearer <accessToken>`.\n\n" +
      "Quick start: `POST /auth/login` → copy `accessToken` → Authorize → create a property under **Admin - Properties**.",
  },
  servers: [{ url: "http://localhost:8080" }],
  tags: [
    { name: "Auth" },
    { name: "Properties (public)" },
    { name: "Facilities (public)" },
    { name: "Promos" },
    { name: "Me" },
    { name: "Bookings" },
    { name: "Bookings - Staff" },
    { name: "Midtrans" },
    { name: "Shifts" },
    { name: "Reviews" },
    { name: "Waitlist" },
    { name: "Admin - Properties" },
    { name: "Admin - Facilities" },
    { name: "Admin - Unit Types" },
    { name: "Admin - Staff" },
    { name: "Admin - Promos" },
    { name: "Admin - Reviews" },
    { name: "Admin - Reports" },
    { name: "Health" },
  ],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: componentSchemas,
    responses: {
      Unauthorized: { description: "Missing or invalid token", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      Forbidden: { description: "Role not allowed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      NotFound: { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      Validation: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      TooMany: { description: "Rate limited", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
      Error: { description: "Client/server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
    },
  },
};