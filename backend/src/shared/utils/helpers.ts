export function generateBookingCode(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CG-${yy}${mm}${dd}-${suffix}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6 || day === 0;
}

export function eachDays(checkIn: Date, checkOut: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  while (start < end) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

export function toDateOnly(d: string | Date): Date {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function pagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
