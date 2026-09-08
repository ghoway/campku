import { prisma } from "@/config/database";

export class DashboardService {
  async get() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(today.getTime() + 86400_000);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [todayReservations, todayRevenue, todayCheckIns, todayCheckOuts, monthlyRevenue, activeProperties, activeStaff, upcoming] =
      await Promise.all([
        prisma.booking.count({
          where: { checkInDate: { gte: today, lt: todayEnd }, status: { notIn: ["CANCELLED", "EXPIRED", "NO_SHOW"] } },
        }),
        prisma.payment.aggregate({
          where: { status: "PAID", paidAt: { gte: today, lt: todayEnd } },
          _sum: { amount: true },
        }),
        prisma.booking.count({ where: { checkedInAt: { gte: today, lt: todayEnd } } }),
        prisma.booking.count({ where: { checkedOutAt: { gte: today, lt: todayEnd } } }),
        prisma.payment.aggregate({
          where: { status: "PAID", paidAt: { gte: monthStart, lt: nextMonth } },
          _sum: { amount: true },
        }),
        prisma.property.count({ where: { status: "ACTIVE" } }),
        prisma.user.count({
          where: { status: "ACTIVE", userRoles: { some: { role: { code: "STAFF" } } } },
        }),
        prisma.booking.findMany({
          where: {
            status: "CONFIRMED",
            checkInDate: { gte: today, lt: new Date(today.getTime() + 7 * 86400_000) },
          },
          include: { property: true },
          orderBy: { checkInDate: "asc" },
          take: 10,
        }),
      ]);

    const occupancy = await this._occupancyRate(today, todayEnd);

    return {
      todayReservations,
      todayRevenue: String(todayRevenue._sum.amount ?? 0),
      todayCheckIns,
      todayCheckOuts,
      occupancyRate: occupancy,
      monthlyRevenue: String(monthlyRevenue._sum.amount ?? 0),
      activeProperties,
      activeStaff,
      upcomingReservations: upcoming.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        guestName: b.guestName,
        property: { id: b.property.id, name: b.property.name },
        checkIn: b.checkInDate,
        checkOut: b.checkOutDate,
        grandTotal: String(b.grandTotal),
      })),
    };
  }

  private async _occupancyRate(from: Date, to: Date) {
    const properties = await prisma.property.findMany({
      where: { status: "ACTIVE" },
      include: { unitTypes: { include: { units: { where: { status: "AVAILABLE" } } } } },
    });
    const totalUnits = properties.reduce((a, p) => a + p.unitTypes.reduce((b, u) => b + u.units.length, 0), 0);
    if (!totalUnits) return 0;

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
        checkInDate: { lt: to },
        checkOutDate: { gt: from },
      },
      include: { items: { select: { quantity: true } } },
    });
    const occupiedNights = bookings.reduce((acc, b) => {
      const nights = Math.max(1, Math.floor((b.checkOutDate.getTime() - b.checkInDate.getTime()) / 86400_000));
      return acc + nights * b.items.reduce((a, i) => a + i.quantity, 0);
    }, 0);
    const availableNights = totalUnits;
    return availableNights > 0 ? Number(((occupiedNights / availableNights) * 100).toFixed(2)) : 0;
  }
}