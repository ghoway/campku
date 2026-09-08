import type { Context, Next } from "hono";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation error",
            details: result.error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
        },
        422
      );
    }
    c.set("validated", result.data);
    await next();
  };
}
