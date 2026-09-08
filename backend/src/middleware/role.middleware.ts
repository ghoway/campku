import type { Context, Next } from "hono";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export function requireRole(...roles: string[]) {
  return (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();
    if (!roles.includes(user.role)) {
      throw new ForbiddenError("Forbidden: insufficient role");
    }
    return next();
  };
}
