import { prisma } from "@/config/database";
import { BadRequestError, NotFoundError } from "@/shared/errors";

export class PromoService {
  /**
   * Validasi promo code per PRD:
   * 1. exists && isActive
   * 2. now dalam [startAt, expiresAt]
   * 3. currentUses < maxUses (0 = unlimited)
   * 4. subtotal >= minBookingAmount
   */
  async validate(code: string, subtotal: bigint, userId?: string) {
    const promo = await prisma.promo.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!promo) throw new BadRequestError("Promo code not found", "INVALID_PROMO_CODE");
    if (!promo.isActive) throw new BadRequestError("Promo code is inactive", "INVALID_PROMO_CODE");

    const now = new Date();
    if (promo.startAt > now) throw new BadRequestError("Promo code not active yet", "INVALID_PROMO_CODE");
    if (promo.expiresAt && promo.expiresAt < now) {
      throw new BadRequestError("Promo code has expired", "INVALID_PROMO_CODE");
    }

    if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
      throw new BadRequestError("Promo code usage limit reached", "PROMO_LIMIT_REACHED");
    }

    if (subtotal < promo.minBookingAmount) {
      throw new BadRequestError(
        `Minimum booking amount for this promo is Rp${Number(promo.minBookingAmount).toLocaleString("id-ID")}`,
        "PROMO_MIN_AMOUNT"
      );
    }

    return promo;
  }

  calculateDiscount(promo: { discountType: string; discountValue: bigint }, subtotal: bigint) {
    let discount = BigInt(0);
    if (promo.discountType === "PERCENTAGE") {
      const pct = Number(promo.discountValue) / 100;
      discount = BigInt(Math.floor(Number(subtotal) * pct));
    } else {
      discount = promo.discountValue > subtotal ? subtotal : promo.discountValue;
    }
    return { discount };
  }
}