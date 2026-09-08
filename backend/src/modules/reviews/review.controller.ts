import type { Context } from "hono";
import { prisma } from "@/config/database";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/shared/errors";
import { ok, created, okList } from "@/shared/utils/response";

export async function createReview(c: Context) {
  const user = c.get("user");
  const body = c.get("validated");

  const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.status !== "CHECKED_OUT") {
    throw new ConflictError("Only checked-out bookings can be reviewed");
  }
  if (booking.customerUserId !== user.id) {
    throw new ForbiddenError("Cannot review this booking");
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: body.bookingId } });
  if (existing) throw new ConflictError("This booking has already been reviewed");

  const review = await prisma.review.create({
    data: {
      bookingId: body.bookingId,
      userId: user.id,
      propertyId: booking.propertyId,
      rating: body.rating,
      comment: body.comment,
    },
  });

  return created(c, review);
}

export async function listPropertyReviews(c: Context) {
  const propertyId = c.req.param("propertyId") ?? "";
  const reviews = await prisma.review.findMany({
    where: { propertyId, status: { in: ["APPROVED", "PENDING"] } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(c, reviews);
}

export async function listMyReviews(c: Context) {
  const user = c.get("user");
  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    include: { property: true, booking: { select: { bookingCode: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(c, reviews);
}

export async function updateReviewStatus(c: Context) {
  const id = c.req.param("reviewId") ?? "";
  const body = await c.req.json();
  const status = body?.status;
  if (!["APPROVED", "HIDDEN", "PENDING"].includes(status)) {
    throw new ValidationError("Invalid status");
  }
  const exists = await prisma.review.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Review not found");
  const review = await prisma.review.update({ where: { id }, data: { status } });
  return ok(c, review);
}

export async function deleteReview(c: Context) {
  const id = c.req.param("reviewId") ?? "";
  const exists = await prisma.review.findUnique({ where: { id } });
  if (!exists) throw new NotFoundError("Review not found");
  await prisma.review.delete({ where: { id } });
  return ok(c, { success: true });
}