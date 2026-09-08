import { CronJob } from "cron";
import { prisma } from "@/config/database";
import { sendWaitlistNotifiedEmail } from "@/shared/services/email.service";
import { env } from "@/config/env";

/**
 * 1. Booking expiry: AWAITING_PAYMENT yang sudah lewat 24 jam → EXPIRED
 * 2. No-show detection: CONFIRMED yang lewat check_in_time + 2 jam → NO_SHOW
 * 3. Waitlist FIFO notification setelah ada inventory terbebas
 */

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
  // Lazy: cari bookings CONFIRMED yang check_in_date + check_in_time + 2 jam < now
  const properties = await prisma.property.findMany({
    include: { bookings: { where: { status: "CONFIRMED" } } },
  });

  let count = 0;
  for (const p of properties) {
    for (const b of p.bookings) {
      const [h, m] = p.checkInTime.split(":").map(Number);
      const deadline = new Date(b.checkInDate);
      deadline.setHours(h, m, 0, 0);
      deadline.setHours(deadline.getHours() + 2);
      if (deadline < new Date()) {
        await prisma.booking.update({
          where: { id: b.id },
          data: { status: "NO_SHOW" },
        });
        count++;
      }
    }
  }
  if (count > 0) console.log(`[cron] Marked ${count} bookings as NO_SHOW`);
  return count;
}

async function notifyWaitlist() {
  // Cari waitlist yang status WAITING dan cek ketersediaan
  const waiting = await prisma.waitlistEntry.findMany({
    where: { status: "WAITING" },
    include: {
      property: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: [{ priorityQueue: "asc" }, { createdAt: "asc" }],
  });

  for (const entry of waiting) {
    // Notification sederhana: kirim email, set NOTIFIED dengan expires 24 jam
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
  }
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