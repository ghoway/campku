import { z } from "zod";

export const CreatePropertySchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  city: z.string().min(1),
  province: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().default("Asia/Jakarta"),
  checkInTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format HH:MM").default("14:00"),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format HH:MM").default("12:00"),
});

export const UpdatePropertySchema = CreatePropertySchema.partial();

export const SetPropertyFacilitiesSchema = z.object({
  facilityIds: z.array(z.string().uuid()).min(1),
});
