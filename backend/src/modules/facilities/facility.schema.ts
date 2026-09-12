import { z } from "zod";

export const CreateFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const UpdateFacilitySchema = CreateFacilitySchema.partial();