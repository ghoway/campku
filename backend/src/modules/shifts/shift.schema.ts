import { z } from "zod";

export const OpenShiftSchema = z.object({
  propertyId: z.string().uuid(),
  openingCash: z.number().int().nonnegative().default(0),
});

export const CloseShiftSchema = z.object({
  actualClosingCash: z.number().int().nonnegative(),
  notes: z.string().optional(),
});