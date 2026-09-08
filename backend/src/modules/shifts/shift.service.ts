import { prisma } from "@/config/database";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors";

export interface OpenShiftInput {
  propertyId: string;
  openingCash: number;
}

export class ShiftService {
  async openShift(staffId: string, input: OpenShiftInput) {
    // Staff harus punya assignment aktif
    const assignment = await prisma.staffPropertyAssignment.findFirst({
      where: { userId: staffId, propertyId: input.propertyId, isActive: true },
    });
    if (!assignment) throw new ForbiddenError("Not assigned to this property", "NOT_ASSIGNED");

    // Tidak boleh dua shift aktif di property yang sama
    const existing = await prisma.staffShift.findFirst({
      where: { userId: staffId, propertyId: input.propertyId, status: "OPEN" },
    });
    if (existing) throw new ConflictError("You already have an active shift at this property", "ACTIVE_SHIFT_EXISTS");

    const shift = await prisma.staffShift.create({
      data: {
        userId: staffId,
        propertyId: input.propertyId,
        openingCash: BigInt(input.openingCash),
      },
    });
    return shift;
  }

  async currentShift(staffId: string) {
    const shift = await prisma.staffShift.findFirst({
      where: { userId: staffId, status: "OPEN" },
      include: {
        property: true,
        payments: { where: { status: "PAID" }, select: { amount: true, method: true } },
      },
      orderBy: { openedAt: "desc" },
    });
    if (!shift) return null;

    const cashSales = shift.payments.filter((p) => p.method === "CASH").reduce((a, p) => a + Number(p.amount), 0);
    const transferSales = shift.payments.filter((p) => p.method === "BANK_TRANSFER").reduce((a, p) => a + Number(p.amount), 0);
    const qrisSales = shift.payments.filter((p) => p.method === "QRIS").reduce((a, p) => a + Number(p.amount), 0);

    return {
      id: shift.id,
      propertyId: shift.propertyId,
      propertyName: shift.property.name,
      openedAt: shift.openedAt,
      openingCash: String(shift.openingCash),
      cashSales: String(cashSales),
      transferSales: String(transferSales),
      qrisSales: String(qrisSales),
      expectedCash: String(shift.openingCash + BigInt(cashSales)),
      status: shift.status,
    };
  }

  async closeShift(shiftId: string, staffId: string, input: { actualClosingCash: number; notes?: string }) {
    const shift = await prisma.staffShift.findFirst({
      where: { id: shiftId, userId: staffId, status: "OPEN" },
    });
    if (!shift) throw new NotFoundError("Active shift not found");

    const expectedClosingCash = shift.openingCash + shift.totalCashSales;

    const updated = await prisma.staffShift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        expectedClosingCash,
        actualClosingCash: BigInt(input.actualClosingCash),
        notes: input.notes,
      },
    });

    return {
      ...updated,
      openingCash: String(updated.openingCash),
      expectedClosingCash: String(expectedClosingCash),
      actualClosingCash: String(updated.actualClosingCash),
      totalCashSales: String(updated.totalCashSales),
      totalTransferSales: String(updated.totalTransferSales),
      totalQrisSales: String(updated.totalQrisSales),
      difference: String(BigInt(input.actualClosingCash) - expectedClosingCash),
    };
  }

  async shiftReport(shiftId: string, staffId: string) {
    const shift = await prisma.staffShift.findFirst({
      where: { id: shiftId, userId: staffId },
      include: {
        user: true,
        property: true,
        bookings: { select: { id: true, source: true, status: true } },
        payments: { include: { booking: { select: { bookingCode: true } } } },
      },
    });
    if (!shift) throw new NotFoundError("Shift not found");

    const totalCash = shift.payments.filter((p) => p.status === "PAID" && p.method === "CASH").reduce((a, p) => a + Number(p.amount), 0);
    const totalTransfer = shift.payments.filter((p) => p.status === "PAID" && p.method === "BANK_TRANSFER").reduce((a, p) => a + Number(p.amount), 0);
    const totalQris = shift.payments.filter((p) => p.status === "PAID" && p.method === "QRIS").reduce((a, p) => a + Number(p.amount), 0);

    const walkInCount = shift.bookings.filter((b) => b.source === "WALK_IN").length;
    const selfResCount = shift.bookings.filter((b) => b.source === "SELF_RESERVATION").length;

    return {
      id: shift.id,
      staff: { id: shift.user.id, name: shift.user.name },
      property: { id: shift.property.id, name: shift.property.name },
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      walkInCount,
      selfReservationCount: selfResCount,
      totalCashSales: String(totalCash),
      totalTransferSales: String(totalTransfer),
      totalQrisSales: String(totalQris),
      totalTransactions: shift.payments.filter((p) => p.status === "PAID").length,
      openingCash: String(shift.openingCash),
      expectedClosingCash: String(shift.expectedClosingCash ?? shift.openingCash + shift.totalCashSales),
      actualClosingCash: shift.actualClosingCash ? String(shift.actualClosingCash) : null,
      difference: shift.actualClosingCash
        ? String(shift.actualClosingCash - (shift.expectedClosingCash ?? shift.openingCash + shift.totalCashSales))
        : null,
      notes: shift.notes,
      payments: shift.payments.map((p) => ({
        id: p.id,
        bookingCode: p.booking?.bookingCode,
        method: p.method,
        amount: String(p.amount),
        status: p.status,
        paidAt: p.paidAt,
      })),
    };
  }

  async assertActiveShift(staffId: string) {
    const shift = await prisma.staffShift.findFirst({
      where: { userId: staffId, status: "OPEN" },
    });
    if (!shift) throw new BadRequestError("No active shift", "NO_ACTIVE_SHIFT");
    return shift;
  }
}