import { prisma } from "@/config/database";
import { eachDays, isWeekend } from "@/shared/utils/helpers";

export interface NightlyPrice {
  price: bigint;
  rateName: string;
}

/**
 * PricingService
 *
 * Priority:
 * 1. Special Rate (priority tertinggi yang aktif & overlap)
 * 2. Weekend (Fri-Sat-Sun)
 * 3. Weekday
 */
export class PricingService {
  async getNightlyPrice(unitTypeId: string, date: Date): Promise<NightlyPrice> {
    const unitType = await prisma.unitType.findUnique({
      where: { id: unitTypeId },
    });
    if (!unitType) throw new Error("Unit type not found");

    // 1. Special rate
    const special = await prisma.specialRatePeriod.findFirst({
      where: {
        unitTypeId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { priority: "desc" },
    });

    if (special) {
      return { price: special.price, rateName: special.name };
    }

    // 2. Weekend
    if (isWeekend(date)) {
      return { price: unitType.weekendPrice, rateName: "Weekend" };
    }

    // 3. Weekday
    return { price: unitType.weekdayPrice, rateName: "Weekday" };
  }

  /**
   * Menghitung total harga untuk satu unit type dalam rentang tanggal.
   */
  async calculateUnitType(
    unitTypeId: string,
    checkIn: Date,
    checkOut: Date,
    quantity: number
  ): Promise<{
    nights: { stayDate: Date; unitPrice: bigint; rateName: string; total: bigint }[];
    subtotal: bigint;
  }> {
    const days = eachDays(checkIn, checkOut);
    const nights = [];

    for (const day of days) {
      const nightly = await this.getNightlyPrice(unitTypeId, day);
      nights.push({
        stayDate: day,
        unitPrice: nightly.price,
        rateName: nightly.rateName,
        total: nightly.price * BigInt(quantity),
      });
    }

    const subtotal = nights.reduce((acc, n) => acc + n.total, BigInt(0));
    return { nights, subtotal };
  }
}