import type { Context } from "hono";

function toSerialize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toSerialize);
  if (value && typeof value === "object") {
    // Leave instances with toJSON (Date, Decimal, etc.) untouched so they serialize naturally
    if (typeof (value as any).toJSON === "function") return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = toSerialize(v);
    return out;
  }
  return value;
}

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ success: true, data: toSerialize(data), meta: null }, status as any);
}

export function okList<T>(
  c: Context,
  data: T,
  pagination: { page: number; limit: number; total: number }
) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  return c.json(
    {
      success: true,
      data: toSerialize(data),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
      },
    },
    200
  );
}

export function created<T>(c: Context, data: T) {
  return ok(c, data, 201);
}
