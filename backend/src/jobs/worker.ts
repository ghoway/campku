import { CronJob } from "cron";
import { prisma } from "@/config/database";
import { sendWaitlistNotifiedEmail } from "@/shared/services/email.service";
import { AvailabilityService } from "@/shared/services/availability.service";

/**
 * 1. Booking expiry: AWAITING_PAYMENT yang sudah lewat 24 jam → EXPIRED
 * 2. No-show detection: CONFIRMED yang lewat check_in_time + 2 jam → NO_SHOW
 *    (deadline dihitung dalam timezone property, bukan timezone server)
 * 3. Waitlist FIFO notification — hanya kalau availability beneran ada
 *    sesuai tanggal & unit type yang diminta
 */

const availability = new AvailabilityService();

function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

/** (tanggal kalender + jam lokal property) → instant UTC. */
function zonedDateTimeToUtc(date: Date, timeHHmm: string, timeZone: string): Date {
  const [h, m] = timeHHmm.split(":").map(Number);
  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth();
  const d = date.getUTCDate();
  const guess = Date.UTC(y, mo, d, h, m, 0);
  return new Date(guess - tzOffsetMs(new Date(guess), timeZone));
}

async function expireBookings() {
  const result = await prisma.booking.updateMany({
    where: {
      status: "AWAITING_PAYMENT",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED", isExpired: true },
  });

  if (result.count > 0) {
    console.log(`[cron] Expired ${result.count} bookings`);
    // Cek waitlist untuk slot yang terbebas
    await notifyWaitlist();
  }
  return result.count;
}

async function detectNoShow() {
  // CONFIRMED yang deadline check-in-nya lewat → NO_SHOW.
  // Deadline = checkInDate + property.checkInTime + 2 jam, dalam timezone property.
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", checkInDate: { lte: new Date() } },
    include: { property: { select: { timezone: true, checkInTime: true } } },
  });

  const now = new Date();
  let count = 0;
  for (const b of bookings) {
    const start = zonedDateTimeToUtc(b.checkInDate, b.property.checkInTime, b.property.timezone);
    const deadline = new Date(start.getTime() + 2 * 3600_000);
    if (deadline < now) {
      await prisma.booking.update({
        where: { id: b.id },
        data: { status: "NO_SHOW" },
      });
      count++;
    }
  }
  if (count > 0) console.log(`[cron] Marked ${count} bookings as NO_SHOW`);
  return count;
}

async function notifyWaitlist() {
  const now = new Date();
  const waiting = await prisma.waitlistEntry.findMany({
    where: { status: "WAITING" },
    include: {
      property: { select: { name: true } },
      user: { select: { email: true, name: true } },
    },
    orderBy: [{ priorityQueue: "asc" }, { createdAt: "asc" }],
  });

  let notified = 0;
  for (const entry of waiting) {
    // Entry yang tanggalnya sudah lewat → EXPIRED, jangan dinotifikasi
    if (entry.checkOutDate <= now) {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "EXPIRED" },
      });
      continue;
    }

    // Cek availability beneran sesuai tanggal & unit type yang diminta
    let hasAvailability = false;
    if (entry.unitTypeId) {
      const { available } = await availability.checkAvailability({
        unitTypeId: entry.unitTypeId,
        checkIn: entry.checkInDate,
        checkOut: entry.checkOutDate,
        quantity: 1,
      });
      hasAvailability = available > 0;
    } else {
      // Tanpa unit type: cukup satu unit type aktif di property yang available
      const unitTypes = await prisma.unitType.findMany({
        where: { propertyId: entry.propertyId, status: "ACTIVE" },
        select: { id: true },
      });
      for (const ut of unitTypes) {
        const { available } = await availability.checkAvailability({
          unitTypeId: ut.id,
          checkIn: entry.checkInDate,
          checkOut: entry.checkOutDate,
          quantity: 1,
        });
        if (available > 0) {
          hasAvailability = true;
          break;
        }
      }
    }
    if (!hasAvailability) continue;

    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        status: "NOTIFIED",
        notifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });

    if (entry.user?.email) {
      void sendWaitlistNotifiedEmail(entry.user.email, {
        propertyName: entry.property.name,
        checkIn: entry.checkInDate.toISOString().slice(0, 10),
        checkOut: entry.checkOutDate.toISOString().slice(0, 10),
      });
    }
    notified++;
  }
  if (notified > 0) console.log(`[cron] Notified ${notified} waitlist entries`);
  return notified;
}

export function startJobs() {
  // Setiap 1 jam
  const expiryJob = new CronJob("0 * * * *", async () => {
    try {
      await expireBookings();
    } catch (e) {
      console.error("[cron] expiry failed:", e);
    }
  });

  const noShowJob = new CronJob("0 * * * *", async () => {
    try {
      await detectNoShow();
    } catch (e) {
      console.error("[cron] no-show failed:", e);
    }
  });

  expiryJob.start();
  noShowJob.start();

  console.log("[cron] Jobs scheduled (hourly): booking-expiry, no-show-detection");
}

export { expireBookings, detectNoShow, notifyWaitlist };
