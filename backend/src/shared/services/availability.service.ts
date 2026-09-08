import { prisma } from "@/config/database";
import { eachDays, toDateOnly } from "@/shared/utils/helpers";
import { PricingService } from "@/shared/services/pricing.service";
import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * AvailabilityService
 *
 * Model inventory: unit type-based (quantity), bukan unit allocation-based.
 * Unit yang memblokir inventory: status AVAILABLE
 * Booking status yang memblokir: PENDING, AWAITING_PAYMENT, CONFIRMED, CHECKED_IN
 *
 * Reserved per booking item = max(quantity, jumlah unit yang sudah dialokasikan).
 * Alokasi unit (booking_item_units) dilakukan belakangan (check-in), jadi
 * perhitungan blocked TIDAK boleh hanya bergantung pada alokasi — semua booking
 * aktif yang overlap tanggal memblokir inventory sesuai quantity-nya.
 */
export class AvailabilityService {
  private pricing = new PricingService();

  /**
   * Menghitung jumlah available unit untuk sebuah unit type pada rentang tanggal.
   * `client` opsional: pass transaction client untuk re-check di dalam transaksi.
   */
  async checkAvailability(
    params: {
      unitTypeId: string;
      checkIn: Date;
      checkOut: Date;
      quantity: number;
      excludeBookingId?: string;
    },
    client: DbClient = prisma
  ): Promise<{ available: number; totalUnits: number; blocked: number }> {
    const { unitTypeId, checkIn, checkOut, excludeBookingId } = params;

    const totalUnits = await client.unit.count({
      where: { unitTypeId, status: "AVAILABLE" },
    });

    if (totalUnits === 0) return { available: 0, totalUnits: 0, blocked: 0 };

    // Booking items aktif yang overlap dengan rentang tanggal.
    // Reserved per item = max(quantity, alokasi) supaya tidak double-count:
    // booking yang sudah dialokasi unit dihitung dari alokasinya,
    // yang belum dialokasi dihitung dari quantity-nya.
    const items = await client.bookingItem.findMany({
      where: {
        unitTypeId,
        booking: {
          status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
      },
      select: {
        quantity: true,
        _count: { select: { units: true } },
      },
    });

    let blocked = 0;
    for (const item of items) {
      blocked += Math.max(item.quantity, item._count.units);
    }

    return { available: Math.max(0, totalUnits - blocked), totalUnits, blocked };
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
