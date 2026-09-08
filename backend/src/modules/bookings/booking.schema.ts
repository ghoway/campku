import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD");

export const CreateBookingSchema = z.object({
  propertyId: z.string().uuid(),
  checkIn: dateString,
  checkOut: dateString,
  adults: z.number().int().positive().default(1),
  children: z.number().int().nonnegative().default(0),
  items: z
    .array(
      z.object({
        unitTypeId: z.string().uuid(),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1),
  promoCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const WalkInBookingSchema = z.object({
  propertyId: z.string().uuid(),
  guest: z.object({
    name: z.string().min(1),
    phone: z.string().min(8).optional().nullable(),
    email: z.string().email().optional().nullable(),
  }),
  checkIn: dateString,
  checkOut: dateString,
  adults: z.number().int().positive().default(1),
  children: z.number().int().nonnegative().default(0),
  items: z
    .array(
      z.object({
        unitTypeId: z.string().uuid(),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1),
  notes: z.string().max(500).optional(),
});

export const UnitAllocationSchema = z.object({
  allocations: z
    .array(
      z.object({
        bookingItemId: z.string().uuid(),
        unitIds: z.array(z.string().uuid()).min(1),
      })
    )
    .min(1),
});

export const BookingSearchSchema = z.object({
  propertyId: z.string().uuid().optional(),
  bookingCode: z.string().optional(),
  guestName: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
  checkIn: dateString.optional(),
  checkOut: dateString.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});