import { prisma } from "@/config/database";
import { pagination } from "@/shared/utils/helpers";

export class ReportService {
  async transactions(query: Record<string, string | undefined>) {
    const { page, limit, skip } = pagination(query);

    const where: any = {
      payments: { some: { status: "PAID" } },
    };

    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.staffId) where.createdByUserId = query.staffId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        payments: { where: { status: "PAID" } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    if (query.paymentMethod) {
      const filtered = bookings.filter((b) =>
        b.payments.some((p) => p.method === query.paymentMethod)
      );
      return {
        data: filtered.map((b) => this._mapTransaction(b)),
        meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
      };
    }

    const total = await prisma.booking.count({ where });

    return {
      data: bookings.map((b) => this._mapTransaction(b)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async transactionSummary(query: Record<string, string | undefined>) {
    const filters: any = {};
    if (query.dateFrom || query.dateTo) {
      filters.paidAt = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    if (query.paymentMethod) filters.method = query.paymentMethod;
    if (query.propertyId) {
      filters.booking = { propertyId: query.propertyId };
    }

    const agg = await prisma.payment.aggregate({
      where: { status: "PAID", ...filters },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalRevenue: String(agg._sum.amount ?? 0),
      totalTransactions: agg._count,
      filters,
    };
  }

  async occupancy(query: Record<string, string | undefined>) {
    const dateFrom = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86400_000);
    const dateTo = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : new Date();

    const properties = await prisma.property.findMany({
      where: {
        status: "ACTIVE",
        ...(query.propertyId ? { id: query.propertyId } : {}),
      },
      include: {
        unitTypes: { include: { units: { where: { status: "AVAILABLE" } } } },
      },
    });

    const rows = [];
    for (const p of properties) {
      const totalUnits = p.unitTypes.reduce((a, ut) => a + ut.units.length, 0);
      const bookings = await prisma.booking.findMany({
        where: {
          propertyId: p.id,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkInDate: { lt: dateTo },
          checkOutDate: { gt: dateFrom },
        },
        include: { items: { select: { quantity: true } } },
      });
      const occupiedNights = bookings.reduce((acc, b) => {
        const nights = Math.max(1, Math.floor((b.checkOutDate.getTime() - b.checkInDate.getTime()) / 86400_000));
        const units = b.items.reduce((a, i) => a + i.quantity, 0);
        return acc + nights * units;
      }, 0);

      const availableNights = totalUnits * Math.max(1, Math.floor((dateTo.getTime() - dateFrom.getTime()) / 86400_000));
      const occupancyRate = availableNights > 0 ? Number(((occupiedNights / availableNights) * 100).toFixed(2)) : 0;

      rows.push({
        propertyId: p.id,
        propertyName: p.name,
        totalUnits,
        occupiedUnitNights: occupiedNights,
        availableUnitNights: availableNights,
        occupancyRate,
      });
    }

    return rows;
  }

  async revenueByMonth(year: number) {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const payments = await prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: start, lt: end } },
      select: { amount: true, paidAt: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: "0",
      count: 0,
    }));

    for (const p of payments) {
      const m = p.paidAt!.getUTCMonth();
      months[m].revenue = String(BigInt(months[m].revenue) + p.amount);
      months[m].count++;
    }

    return months;
  }

  private _mapTransaction(b: any) {
    return {
      bookingId: b.id,
      bookingCode: b.bookingCode,
      property: b.property,
      guestName: b.guestName,
      staff: b.createdBy,
      checkIn: b.checkInDate,
      checkOut: b.checkOutDate,
      status: b.status,
      grandTotal: String(b.grandTotal),
      payments: b.payments.map((p: any) => ({
        id: p.id,
        method: p.method,
        amount: String(p.amount),
        paidAt: p.paidAt,
      })),
    };
  }
}