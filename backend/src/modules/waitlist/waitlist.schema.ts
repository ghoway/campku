import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD");

export const JoinWaitlistSchema = z.object({
  propertyId: z.string().uuid(),
  unitTypeId: z.string().uuid().optional(),
  checkIn: dateString,
  checkOut: dateString,
  adults: z.number().int().positive().default(1),
  children: z.number().int().nonnegative().default(0),
});