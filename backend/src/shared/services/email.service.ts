import { getResend } from "@/config/resend";
import { env } from "@/config/env";

type EmailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

/**
 * Email dikirim async (fire-and-forget), tidak blocking response.
 */
export function sendEmail(payload: EmailPayload) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured, email skipped:", payload.subject);
    return Promise.resolve(null);
  }
  return resend.emails
    .send({
      from: env.FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    } as any)
    .catch((err) => {
      console.error("[email] send failed:", err);
    });
}

export function sendOtpEmail(to: string, otp: string, ttlMinutes: number) {
  return sendEmail({
    to,
    subject: "Your verification code - Camping Ground",
    html: `
      <h1>Verify your email</h1>
      <p>Your verification code is:</p>
      <h2 style="letter-spacing:4px">${otp}</h2>
      <p>This code expires in ${ttlMinutes} minutes.</p>
      <p>If you did not create this account, you can safely ignore this email.</p>
    `,
  });
}

export function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: "Selamat datang di Camping Ground 🌲",
    html: `<h1>Halo ${name}!</h1><p>Terima kasih telah mendaftar di platform kami. Nikmati pengalaman camping terbaik.</p>`,
  });
}

export function sendBookingConfirmationEmail(to: string, data: { bookingCode: string; propertyName: string; checkIn: string; checkOut: string; grandTotal: string }) {
  return sendEmail({
    to,
    subject: `Booking Confirmed - ${data.bookingCode}`,
    html: `
      <h1>Booking Berhasil</h1>
      <p>Kode booking: <strong>${data.bookingCode}</strong></p>
      <p>Property: ${data.propertyName}</p>
      <p>Check-in: ${data.checkIn}</p>
      <p>Check-out: ${data.checkOut}</p>
      <p>Total: Rp${Number(data.grandTotal).toLocaleString("id-ID")}</p>
    `,
  });
}

export function sendPaymentReceiptEmail(to: string, data: { bookingCode: string; amount: string; method: string }) {
  return sendEmail({
    to,
    subject: `Payment Receipt - ${data.bookingCode}`,
    html: `
      <h1>Pembayaran Diterima</h1>
      <p>Kode booking: ${data.bookingCode}</p>
      <p>Metode: ${data.method}</p>
      <p>Jumlah: Rp${Number(data.amount).toLocaleString("id-ID")}</p>
    `,
  });
}

export function sendBookingCancelledEmail(to: string, bookingCode: string) {
  return sendEmail({
    to,
    subject: `Booking Cancelled - ${bookingCode}`,
    html: `<h1>Booking Dibatalkan</h1><p>Booking dengan kode ${bookingCode} telah dibatalkan.</p>`,
  });
}

export function sendWaitlistNotifiedEmail(to: string, data: { propertyName: string; checkIn: string; checkOut: string }) {
  return sendEmail({
    to,
    subject: "Slot Waitlist Tersedia!",
    html: `
      <h1>Slot Tersedia!</h1>
      <p>Property: ${data.propertyName}</p>
      <p>Check-in: ${data.checkIn}</p>
      <p>Check-out: ${data.checkOut}</p>
      <p>Segera lakukan booking dalam 24 jam sebelum slot diberikan ke pelanggan lain.</p>
    `,
  });
}
