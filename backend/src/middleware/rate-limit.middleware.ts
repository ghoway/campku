import type { Context, Next } from "hono";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(windowMs: number, max: number) {
  return (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      return c.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." },
        },
        429
      ) as unknown as Promise<void>;
    }

    return next();
  };
}
