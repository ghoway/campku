import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD");

export const CreateSpecialRateSchema = z.object({
  name: z.string().min(2).max(200),
  startDate: dateString,
  endDate: dateString,
  price: z.number().int().nonnegative(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateSpecialRateSchema = CreateSpecialRateSchema.partial();