import { z } from "zod";

export const CreatePromoSchema = z.object({
  code: z.string().min(2).max(50).transform((v) => v.toUpperCase()),
  name: z.string().min(2).max(150),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().positive(),
  minBookingAmount: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().nonnegative().default(0),
  startAt: z.string().datetime().default(() => new Date().toISOString()),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const UpdatePromoSchema = CreatePromoSchema.partial();