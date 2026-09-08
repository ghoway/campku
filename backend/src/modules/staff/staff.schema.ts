import { z } from "zod";

export const CreateStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(8).max(100),
  propertyIds: z.array(z.string().uuid()).optional(),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(8).max(100).optional(),
});

export const SetStaffPropertiesSchema = z.object({
  propertyIds: z.array(z.string().uuid()),
});