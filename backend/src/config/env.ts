import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  BOOKING_EXPIRY_HOURS: z.coerce.number().default(24),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_IS_PRODUCTION: z.string().default("false"),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().default("Camping Ground <onboarding@resend.dev>"),
  UPLOAD_DIR: z.string().default("uploads"),
  BASE_URL: z.string().default("http://localhost:8080"),
  APP_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(Bun.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
