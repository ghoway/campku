import { prisma } from "@/config/database";
import { eachDays, toDateOnly } from "@/shared/utils/helpers";
import { PricingService } from "@/shared/services/pricing.service";

/**
 * AvailabilityService
 *
 * Unit yang memblokir inventory: status AVAILABLE
 * Booking status yang memblokir: PENDING, AWAITING_PAYMENT, CONFIRMED, CHECKED_IN
 */
export class AvailabilityService {
  private pricing = new PricingService();

  /**
   * Menghitung jumlah available unit untuk sebuah unit type pada rentang tanggal.
   */
  async checkAvailability(params: {
    unitTypeId: string;
    checkIn: Date;
    checkOut: Date;
    quantity: number;
    excludeBookingId?: string;
  }): Promise<{ available: number; totalUnits: number; blocked: number }> {
    const { unitTypeId, checkIn, checkOut, quantity, excludeBookingId } = params;

    const totalUnits = await prisma.unit.count({
      where: { unitTypeId, status: "AVAILABLE" },
    });

    if (totalUnits === 0) return { available: 0, totalUnits: 0, blocked: 0 };

    // Count distinct units yang ter-block oleh booking overlap pada periode ini
    const overlapping = await prisma.bookingItemUnit.findMany({
      where: {
        bookingItem: {
          unitTypeId,
          booking: {
            status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
            ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
          },
        },
      },
      select: { unitId: true },
      distinct: ["unitId"],
    });

    const blocked = overlapping.length;
    const available = Math.max(0, totalUnits - blocked);

    // Kita butuh quantity unit berturut-turut untuk seluruh malam;
    // jika booking khusus satu malam di tengah periode, unit tetap tidak bisa
    // disimpan per malam. Untuk keperluan MVP, kita cukup bandingkan total.
    return { available, totalUnits, blocked };
  }

  /**
   * Buat response availability untuk property pada rentang tanggal.
   * Menampilkan harga per malam beserta rate name.
   */
  async getPropertyAvailability(params: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    guests?: number;
  }) {
    const { propertyId, checkIn, checkOut, guests } = params;

    const unitTypes = await prisma.unitType.findMany({
      where: {
        propertyId,
        status: "ACTIVE",
        ...(guests ? { capacity: { gte: guests } } : {}),
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        facilities: { include: { facility: true } },
      },
    });

    const result = [];
    for (const ut of unitTypes) {
      const { available, totalUnits } = await this.checkAvailability({
        unitTypeId: ut.id,
        checkIn,
        checkOut,
        quantity: 1,
      });

      const pricing = [];
      for (const day of eachDays(checkIn, checkOut)) {
        const nightly = await this.pricing.getNightlyPrice(ut.id, day);
        pricing.push({
          date: toDateOnly(day).toISOString().slice(0, 10),
          price: Number(nightly.price),
          rate: nightly.rateName,
        });
      }

      const total = pricing.reduce((acc, p) => acc + p.price, 0);

      result.push({
        id: ut.id,
        name: ut.name,
        slug: ut.slug,
        description: ut.description,
        capacity: ut.capacity,
        available,
        totalUnits,
        images: ut.images,
        facilities: ut.facilities.map((f) => f.facility),
        pricing,
        total,
      });
    }

    return {
      propertyId,
      checkIn: toDateOnly(checkIn).toISOString().slice(0, 10),
      checkOut: toDateOnly(checkOut).toISOString().slice(0, 10),
      nights: eachDays(checkIn, checkOut).length,
      unitTypes: result,
    };
  }
}