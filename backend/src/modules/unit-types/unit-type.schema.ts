import { z } from "zod";

export const CreateUnitTypeSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  capacity: z.number().int().positive(),
  weekdayPrice: z.number().int().nonnegative(),
  weekendPrice: z.number().int().nonnegative(),
  facilityIds: z.array(z.string().uuid()).optional(),
});

export const UpdateUnitTypeSchema = CreateUnitTypeSchema.partial();

export const CreateUnitSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().max(100).optional(),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "INACTIVE"]).default("AVAILABLE"),
  notes: z.string().optional(),
});

export const UpdateUnitSchema = CreateUnitSchema.partial();