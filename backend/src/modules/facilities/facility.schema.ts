import { z } from "zod";

export const CreateFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().optional(),
});

export const UpdateFacilitySchema = CreateFacilitySchema.partial();