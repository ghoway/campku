import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { getSnap, verifySignature } from "@/config/midtrans";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/shared/errors";
import { sendPaymentReceiptEmail, sendBookingConfirmationEmail } from "@/shared/services/email.service";

export interface CreateCashPaymentInput {
  method: "CASH" | "BANK_TRANSFER" | "QRIS" | "OTHER";
  amount: number;
  shiftId?: string;
  notes?: string;
}

export class PaymentService {
  async listByBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    return prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      include: { receivedBy: { select: { id: true, name: true } } },
    });
  }

  async createCashPayment(bookingId: string, staffId: string, input: CreateCashPaymentInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: { select: { name: true } } },
    });
    if (!booking) throw new NotFoundError("Booking not found");

    // Shift harus di property yang sama
    const shift = await prisma.staffShift.findFirst({
      where: { userId: staffId, propertyId: booking.propertyId, status: "OPEN" },
    });
    if (!shift) throw new ForbiddenError("No active shift at this property", "NO_ACTIVE_SHIFT");

    const amount = BigInt(input.amount);
    const paid = await this._totalPaid(bookingId);
    const remaining = booking.grandTotal - paid;
    if (amount > remaining) {
      throw new BadRequestError(
        `Amount Rp${amount} exceeds remaining balance Rp${remaining}`,
        "PAYMENT_EXCEEDS_REMAINING"
      );
    }
    if (remaining <= BigInt(0)) throw new ConflictError("Booking already fully paid");

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          bookingId,
          shiftId: shift.id,
          method: input.method,
          status: "PAID",
          amount,
          receivedByUserId: staffId,
          paidAt: new Date(),
          notes: input.notes,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // Update shift totals
      await this._updateShiftTotals(tx, shift.id, booking.propertyId);

      return p;
    });

    // Email receipt
    if (booking.guestEmail) {
      void sendPaymentReceiptEmail(booking.guestEmail, {
        bookingCode: booking.bookingCode,
        amount: String(amount),
        method: input.method,
      });
      void sendBookingConfirmationEmail(booking.guestEmail, {
        bookingCode: booking.bookingCode,
        propertyName: booking.property.name,
        checkIn: booking.checkInDate.toISOString().slice(0, 10),
        checkOut: booking.checkOutDate.toISOString().slice(0, 10),
        grandTotal: String(booking.grandTotal),
      });
    }

    return payment;
  }

  async createMidtransPayment(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");

    if (!["AWAITING_PAYMENT", "PENDING"].includes(booking.status)) {
      throw new ConflictError("Booking is not awaiting payment");
    }

    const paid = await this._totalPaid(bookingId);
    const remaining = booking.grandTotal - paid;
    if (remaining <= BigInt(0)) throw new ConflictError("Booking already fully paid");

    // Cek payment PENDING yang sudah ada
    const existing = await prisma.payment.findFirst({
      where: { bookingId, method: "PAYMENT_GATEWAY", status: "PENDING" },
    });

    if (existing?.paymentUrl) {
      return {
        paymentUrl: existing.paymentUrl,
        orderId: booking.bookingCode,
        expiresAt: booking.expiresAt?.toISOString(),
      };
    }

    const snap = getSnap();
    const expiredAt = new Date(Date.now() + env.BOOKING_EXPIRY_HOURS * 3600_000);

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: booking.bookingCode,
        gross_amount: Number(remaining),
        expiry: { start_time: new Date().toISOString(), unit: "hours", duration: env.BOOKING_EXPIRY_HOURS },
      },
      customer_details: {
        first_name: booking.guestName,
        email: booking.guestEmail ?? undefined,
        phone: booking.guestPhone ?? undefined,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        method: "PAYMENT_GATEWAY",
        status: "PENDING",
        provider: "midtrans",
        externalOrderId: booking.bookingCode,
        externalReference: transaction.token ?? null,
        paymentUrl: transaction.redirect_url,
        amount: remaining,
        providerResponse: { transaction: transaction as any },
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: transaction.redirect_url,
      orderId: booking.bookingCode,
      expiresAt: expiredAt.toISOString(),
    };
  }

  async handleMidtransNotification(payload: {
    order_id: string;
    status_code: string;
    transaction_status: string;
    gross_amount: string;
    signature_key: string;
    transaction_id?: string;
    payment_type?: string;
    fraud_status?: string;
  }) {
    // Verifikasi signature
    const valid = verifySignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key
    );
    if (!valid) throw new BadRequestError("Invalid signature key", "INVALID_SIGNATURE");

    const payment = await prisma.payment.findFirst({
      where: { externalOrderId: payload.order_id },
    });
    if (!payment) {
      // Coba cari booking by booking code lalu buat payment
      const booking = await prisma.booking.findUnique({
        where: { bookingCode: payload.order_id },
      });
      if (!booking) throw new NotFoundError("Booking not found");

      return prisma.payment.create({
        data: {
          bookingId: booking.id,
          method: "PAYMENT_GATEWAY",
          status: payload.transaction_status === "settlement" || payload.transaction_status === "capture" ? "PAID" : "FAILED",
          provider: "midtrans",
          externalOrderId: payload.order_id,
          externalReference: payload.transaction_id,
          amount: BigInt(Math.round(Number(payload.gross_amount))),
          paidAt: payload.transaction_status === "settlement" || payload.transaction_status === "capture" ? new Date() : null,
          providerResponse: payload,
        },
      });
    }

    const isPaid =
      (payload.transaction_status === "settlement" || payload.transaction_status === "capture") &&
      payload.fraud_status !== "challenge";
    const isFailed =
      payload.transaction_status === "cancel" ||
      payload.transaction_status === "expire" ||
      payload.transaction_status === "deny";

    // Idempotent: notifikasi duplikat dengan status sama → response OK tanpa efek samping
    if (isPaid === (payment.status === "PAID")) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerResponse: payload },
      });
      return payment;
    }
    if (isFailed && payment.status !== "PAID" && payment.status !== "PENDING") {
      return payment;
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isPaid ? "PAID" : isFailed ? "CANCELLED" : "FAILED",
        externalReference: payload.transaction_id ?? payment.externalReference,
        paidAt: isPaid ? new Date() : null,
        providerResponse: payload,
      },
    });

    if (isPaid) {
      const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
      if (booking && ["AWAITING_PAYMENT", "PENDING"].includes(booking.status)) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED" },
        });
        if (booking.guestEmail) {
          void sendBookingConfirmationEmail(booking.guestEmail, {
            bookingCode: booking.bookingCode,
            propertyName: booking.guestName,
            checkIn: booking.checkInDate.toISOString().slice(0, 10),
            checkOut: booking.checkOutDate.toISOString().slice(0, 10),
            grandTotal: String(booking.grandTotal),
          });
          void sendPaymentReceiptEmail(booking.guestEmail, {
            bookingCode: booking.bookingCode,
            amount: String(payment.amount),
            method: "PAYMENT_GATEWAY",
          });
        }
      }
    }

    return updated;
  }

  async refund(bookingId: string, paymentId: string, opts: { refundAmount?: bigint; notes?: string }) {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, bookingId } });
    if (!payment) throw new NotFoundError("Payment not found");
    if (payment.status !== "PAID") throw new ConflictError("Only PAID payment can be refunded");

    const refundAmount = opts.refundAmount ?? payment.amount;
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundAmount,
        notes: opts.notes ?? payment.notes,
      },
    });
  }

  async _totalPaid(bookingId: string) {
    const agg = await prisma.payment.aggregate({
      where: { bookingId, status: "PAID" },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? BigInt(0);
  }

  private async _updateShiftTotals(tx: any, shiftId: string, propertyId: string) {
    const [cash, transfer, qris] = await Promise.all([
      tx.payment.aggregate({
        where: { shiftId, status: "PAID", method: "CASH" },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { shiftId, status: "PAID", method: "BANK_TRANSFER" },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { shiftId, status: "PAID", method: "QRIS" },
        _sum: { amount: true },
      }),
    ]);

    const openingCash =
      (await tx.staffShift.findUnique({ where: { id: shiftId } }))?.openingCash ?? BigInt(0);

    await tx.staffShift.update({
      where: { id: shiftId },
      data: {
        totalCashSales: cash._sum.amount ?? BigInt(0),
        totalTransferSales: transfer._sum.amount ?? BigInt(0),
        totalQrisSales: qris._sum.amount ?? BigInt(0),
        expectedClosingCash: openingCash + (cash._sum.amount ?? BigInt(0)),
      },
    });
  }
}