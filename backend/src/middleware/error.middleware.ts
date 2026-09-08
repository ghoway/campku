import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { AppError } from "@/shared/errors";

export function errorHandler(err: unknown, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: { code: err.code, message: err.message, details: err.details ?? undefined },
      },
      err.statusCode as any
    );
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Validation error", details },
      },
      422
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      { success: false, error: { code: "HTTP_ERROR", message: err.message } },
      err.status as any
    );
  }

  // Prisma errors
  if (err instanceof Error) {
    const prismaErr = err as any;
    if (prismaErr?.code === "P2002") {
      const target = prismaErr?.meta?.target ?? "record";
      return c.json(
        { success: false, error: { code: "DUPLICATE", message: `Duplicate value for: ${target}` } },
        409
      );
    }
    if (prismaErr?.code === "P2025") {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Record not found" } },
        404
      );
    }
  }

  console.error("[error]", err);
  return c.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500
  );
}
