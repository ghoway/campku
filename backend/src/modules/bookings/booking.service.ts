import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { AvailabilityService } from "@/shared/services/availability.service";
import { PricingService } from "@/shared/services/pricing.service";
import { PromoService } from "@/modules/promos/promo.service";
import { getSnap } from "@/config/midtrans";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnitNotAvailableError,
  UnauthorizedError,
} from "@/shared/errors";
import { generateBookingCode, eachDays, toDateOnly } from "@/shared/utils/helpers";
import { sendBookingConfirmationEmail } from "@/shared/services/email.service";

export interface CreateBookingInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  items: { unitTypeId: string; quantity: number }[];
  promoCode?: string;
  notes?: string;
}

export interface WalkInBookingInput extends CreateBookingInput {
  guest: { name: string; phone?: string | null; email?: string | null };
}

export class BookingService {
  private availability = new AvailabilityService();
  private pricing = new PricingService();
  private promo = new PromoService();

  async createSelfReservation(input: CreateBookingInput, userId: string) {
    const result = await this._createBooking(
      { ...input, customerUserId: userId, createdByUserId: userId, source: "SELF_RESERVATION" },
      false
    );
    return result;
  }

  async createWalkIn(input: WalkInBookingInput, staffUserId: string) {
    if (!input.guest.name) throw new BadRequestError("Guest name is required");
    const result = await this._createBooking(
      {
        ...input,
        guestName: input.guest.name,
        guestPhone: input.guest.phone ?? undefined,
        guestEmail: input.guest.email ?? undefined,
        createdByUserId: staffUserId,
        source: "WALK_IN",
      },
      true
    );
    return result;
  }

  async createAdmin(input: CreateBookingInput, userId: string) {
    const result = await this._createBooking(
      { ...input, createdByUserId: userId, source: "ADMIN" },
      false
    );
    return result;
  }

  private async _createBooking(
    input: CreateBookingInput & {
      customerUserId?: string;
      createdByUserId?: string;
      source: string;
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
    },
    isWalkIn = false
  ) {
    const checkIn = toDateOnly(input.checkIn);
    const checkOut = toDateOnly(input.checkOut);
    if (checkOut <= checkIn) throw new BadRequestError("checkOut must be after checkIn");
    if (eachDays(checkIn, checkOut).length > 30) throw new BadRequestError("Max 30 nights per booking");

    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) throw new NotFoundError("Property not found");
    if (property.status !== "ACTIVE") throw new BadRequestError("Property is not active");

    // Load unit types
    const unitTypeIds = input.items.map((i) => i.unitTypeId);
    const unitTypes = await prisma.unitType.findMany({
      where: { id: { in: unitTypeIds }, status: "ACTIVE", propertyId: input.propertyId },
    });
    if (unitTypes.length !== new Set(unitTypeIds).size) {
      throw new BadRequestError("Invalid unit type for this property");
    }

    const unitTypeMap = new Map(unitTypes.map((u) => [u.id, u]));

    // Validate promo jika ada (sebelum transaksi)
    let promo = null;
    let discountValue = BigInt(0);
    let subtotal = BigInt(0);

    // Calculate pricing + availability per item
    const itemsDetail: {
      unitTypeId: string;
      unitTypeName: string;
      quantity: number;
      nights: { stayDate: Date; unitPrice: bigint; rateName: string; total: bigint }[];
      subtotal: bigint;
    }[] = [];
    for (const item of input.items) {
      const { available } = await this.availability.checkAvailability({
        unitTypeId: item.unitTypeId,
        checkIn,
        checkOut,
        quantity: item.quantity,
      });
      if (available < item.quantity) {
        throw new UnitNotAvailableError(`Insufficient availability for unit type "${unitTypeMap.get(item.unitTypeId)?.name}"`);
      }

      const calc = await this.pricing.calculateUnitType(item.unitTypeId, checkIn, checkOut, item.quantity);
      subtotal += calc.subtotal;
      itemsDetail.push({
        unitTypeId: item.unitTypeId,
        unitTypeName: unitTypeMap.get(item.unitTypeId)!.name,
        quantity: item.quantity,
        nights: calc.nights,
        subtotal: calc.subtotal,
      });
    }

    if (input.promoCode) {
      promo = await this.promo.validate(input.promoCode, subtotal, input.customerUserId);
      if (promo) {
        const { discount } = this.promo.calculateDiscount(promo, subtotal);
        discountValue = discount;
      }
    }

    const additionalFee = BigInt(0);
    const grandTotal = subtotal - discountValue + additionalFee;
    if (grandTotal <= BigInt(0)) throw new BadRequestError("Invalid total amount");

    // DB transaction (serializable) untuk mencegah double booking
    const bookingCode = generateBookingCode();
    const expiresAt = new Date(Date.now() + env.BOOKING_EXPIRY_HOURS * 3600_000);

    // --- Validasi walk-in: shift aktif di property yang sama ---
    let shiftId: string | undefined;
    if (isWalkIn && input.createdByUserId) {
      const shift = await prisma.staffShift.findFirst({
        where: { userId: input.createdByUserId, propertyId: input.propertyId, status: "OPEN" },
      });
      if (!shift) throw new ForbiddenError("You must have an active shift at this property", "NO_ACTIVE_SHIFT");
      shiftId = shift.id;
    }

    const booking = await prisma.$transaction(async (tx) => {
      // Booking code collision retry (sangat jarang)
      let code = bookingCode;
      let existing = await tx.booking.findUnique({ where: { bookingCode: code } });
      while (existing) {
        code = generateBookingCode();
        existing = await tx.booking.findUnique({ where: { bookingCode: code } });
      }

      // (Opsional) kunci baris unit untuk mencegah race
      const booked = await tx.bookingItemUnit.findMany({
        where: {
          bookingItem: {
            unitTypeId: { in: unitTypeIds },
            booking: {
              status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
              checkInDate: { lt: checkOut },
              checkOutDate: { gt: checkIn },
            },
          },
        },
        select: { unitId: true },
      });
      const blockedUnitIds = new Set(booked.map((b) => b.unitId));

      // load all units
      const allUnits = await tx.unit.findMany({
        where: { unitTypeId: { in: unitTypeIds }, status: "AVAILABLE" },
      });
      const unitGroups = new Map<string, any[]>();
      for (const u of allUnits) {
        if (blockedUnitIds.has(u.id)) continue;
        if (!unitGroups.has(u.unitTypeId)) unitGroups.set(u.unitTypeId, []);
        unitGroups.get(u.unitTypeId)!.push(u);
      }
      for (const item of input.items) {
        const avail = unitGroups.get(item.unitTypeId)?.length ?? 0;
        if (avail < item.quantity) throw new UnitNotAvailableError();
      }

      const booking = await tx.booking.create({
        data: {
          bookingCode: code,
          propertyId: input.propertyId,
          customerUserId: input.customerUserId,
          createdByUserId: input.createdByUserId,
          shiftId,
          promoId: promo?.id,
          source: input.source as any,
          status: isWalkIn ? "CONFIRMED" : "AWAITING_PAYMENT",
          guestName:
            input.guestName ??
            (input.customerUserId ? (await tx.user.findUnique({ where: { id: input.customerUserId } }))?.name ?? "Guest" : "Guest"),
          guestEmail: input.guestEmail ?? (input.customerUserId ? (await tx.user.findUnique({ where: { id: input.customerUserId } }))?.email : undefined),
          guestPhone: input.guestPhone,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: input.adults,
          children: input.children,
          subtotal,
          discount: discountValue,
          additionalFee,
          grandTotal,
          expiresAt,
          notes: input.notes,
        },
      });

      // Create booking items + nights
      for (const item of itemsDetail) {
        const bi = await tx.bookingItem.create({
          data: {
            bookingId: booking.id,
            unitTypeId: item.unitTypeId,
            unitTypeNameSnapshot: item.unitTypeName,
            quantity: item.quantity,
            subtotal: item.subtotal,
          },
        });
        await tx.bookingItemNight.createMany({
          data: item.nights.map((n) => ({
            bookingItemId: bi.id,
            stayDate: n.stayDate,
            unitPrice: n.unitPrice,
            quantity: item.quantity,
            total: n.total,
            rateName: n.rateName,
          })),
        });
      }

      // Log promo usage + update counter
      if (promo && input.customerUserId) {
        await tx.promoUsageLog.create({
          data: {
            promoId: promo.id,
            bookingId: booking.id,
            userId: input.customerUserId,
            discountApplied: discountValue,
          },
        });
        await tx.promo.update({
          where: { id: promo.id },
          data: { currentUses: { increment: 1 } },
        });
      }

      return booking;
    });

    // Send email async
    const guestEmail = booking.guestEmail ?? (input.customerUserId ? await prisma.user.findUnique({ where: { id: input.customerUserId } })?.then((u) => u?.email) : undefined);
    if (guestEmail) {
      void sendBookingConfirmationEmail(guestEmail, {
        bookingCode: booking.bookingCode,
        propertyName: property.name,
        checkIn: checkIn.toISOString().slice(0, 10),
        checkOut: checkOut.toISOString().slice(0, 10),
        grandTotal: String(booking.grandTotal),
      });
    }

    const result = await this._mapBooking((await this._getBookingRaw(booking.id))!);

    // For customer, generate Midtrans payment URL if enabled
    let paymentUrl: string | null = null;
    if (!isWalkIn && env.MIDTRANS_SERVER_KEY && env.MIDTRANS_CLIENT_KEY) {
      try {
        const snap = getSnap();
        const transaction = await snap.createTransaction({
          transaction_details: {
            order_id: booking.bookingCode,
            gross_amount: Number(booking.grandTotal),
          },
          customer_details: {
            first_name: booking.guestName,
            email: guestEmail ?? "",
            phone: booking.guestPhone ?? "",
          },
        });
        paymentUrl = transaction.redirect_url;

        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            method: "PAYMENT_GATEWAY",
            status: "PENDING",
            provider: "midtrans",
            externalOrderId: booking.bookingCode,
            paymentUrl,
            amount: booking.grandTotal,
            providerResponse: {
              transaction_id: transaction.token ?? null,
              created_at: new Date().toISOString(),
            },
          },
        });
      } catch (e) {
        console.error("[midtrans] create transaction failed:", e);
      }
    }

    return {
      booking: result,
      paymentUrl,
      expiresAt: booking.expiresAt?.toISOString(),
    };
  }

  async getBooking(bookingId: string, requesterId?: string, requesterRole?: string) {
    const booking = await this._getBookingRaw(bookingId);
    if (!booking) throw new NotFoundError("Booking not found");

    // Access control
    if (requesterRole === "CUSTOMER" && booking.customerUserId !== requesterId) {
      throw new ForbiddenError("Cannot access this booking");
    }
    if (requesterRole === "STAFF" && requesterId) {
      const assignment = await prisma.staffPropertyAssignment.findFirst({
        where: { userId: requesterId, propertyId: booking.propertyId, isActive: true },
      });
      if (!assignment) throw new ForbiddenError("Not assigned to this booking's property");
    }

    return this._mapBooking(booking);
  }

  private async _getBookingRaw(bookingId: string) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true,
        customerUser: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        shift: true,
        promo: true,
        items: {
          include: {
            unitType: true,
            nights: { orderBy: { stayDate: "asc" } },
            units: { include: { unit: true } },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  private _mapBooking(booking: NonNullable<Awaited<ReturnType<typeof this._getBookingRaw>>>) {
    const paid = booking.payments.filter((p) => p.status === "PAID").reduce((a, p) => a + Number(p.amount), 0);
    return {
      ...booking,
      subtotal: String(booking.subtotal),
      discount: String(booking.discount),
      additionalFee: String(booking.additionalFee),
      grandTotal: String(booking.grandTotal),
      items: booking.items.map((i) => ({
        ...i,
        subtotal: String(i.subtotal),
        nights: i.nights.map((n) => ({ ...n, unitPrice: String(n.unitPrice), total: String(n.total) })),
      })),
      payments: booking.payments.map((p) => ({
        ...p,
        amount: String(p.amount),
        refundAmount: String(p.refundAmount),
      })),
      paidAmount: String(paid),
      remaining: String(booking.grandTotal - BigInt(paid)),
    };
  }

  async listMine(userId: string, query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const where: any = { customerUserId: userId };

    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.checkInDate = {};
      if (query.from) where.checkInDate.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.checkInDate.lte = new Date(`${query.to}T00:00:00.000Z`);
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { property: true, items: { include: { unitType: true } } },
      }),
    ]);

    return {
      data: bookings.map((b) => ({ ...b, subtotal: String(b.subtotal), grandTotal: String(b.grandTotal) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async searchStaff(userId: string, query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    // Staff hanya bisa lihat property yang ditugaskan
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { userId, isActive: true },
    });
    const propertyIds = assignments.map((a) => a.propertyId);

    const where: any = {};
    if (propertyIds.length) where.propertyId = { in: propertyIds };
    else where.propertyId = "00000000-0000-0000-0000-000000000000";

    if (query.propertyId) {
      if (!propertyIds.includes(query.propertyId)) throw new ForbiddenError("Not assigned to this property");
      where.propertyId = query.propertyId;
    }
    if (query.bookingCode) where.bookingCode = { contains: query.bookingCode, mode: "insensitive" };
    if (query.guestName) where.guestName = { contains: query.guestName, mode: "insensitive" };
    if (query.phone) where.guestPhone = { contains: query.phone };
    if (query.status) where.status = query.status;
    if (query.checkIn) where.checkInDate = { ...(where.checkInDate ?? {}), gte: new Date(`${query.checkIn}T00:00:00.000Z`) };
    if (query.checkOut) where.checkOutDate = { ...(where.checkOutDate ?? {}), lte: new Date(`${query.checkOut}T00:00:00.000Z`) };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          property: true,
          items: { include: { unitType: true, units: { include: { unit: true } } } },
          payments: true,
        },
      }),
    ]);

    return {
      data: bookings.map((b) => ({ ...b, subtotal: String(b.subtotal), grandTotal: String(b.grandTotal) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelBooking(bookingId: string, requesterId: string, requesterRole: string, reason?: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");

    if (requesterRole === "CUSTOMER") {
      if (booking.customerUserId !== requesterId) throw new ForbiddenError("Cannot cancel this booking");
    }
    if (!["AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
      throw new ConflictError(`Cannot cancel booking with status ${booking.status}`);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: requesterId,
        cancelReason: reason ?? null,
      },
    });

    // TODO: notifikasi waitlist FIFO (cron)
    return updated;
  }

  async checkIn(bookingId: string, staffId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });
    if (!booking) throw new NotFoundError("Booking not found");
    if (booking.status !== "CONFIRMED") {
      throw new ConflictError("Only CONFIRMED bookings can be checked in");
    }

    // Staff assigned & shift check
    await this._assertStaffCanManage(staffId, booking.propertyId);

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInBy: staffId },
    });
  }

  async checkOut(bookingId: string, staffId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    if (booking.status !== "CHECKED_IN") {
      throw new ConflictError("Only CHECKED_IN bookings can be checked out");
    }

    await this._assertStaffCanManage(staffId, booking.propertyId);

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CHECKED_OUT", checkedOutAt: new Date(), checkedOutBy: staffId },
    });
  }

  async allocateUnits(bookingId: string, staffId: string, allocations: { bookingItemId: string; unitIds: string[] }[]) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: { include: { unitType: true } } },
    });
    if (!booking) throw new NotFoundError("Booking not found");
    if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
      throw new ConflictError("Cannot allocate units for this booking status");
    }
    await this._assertStaffCanManage(staffId, booking.propertyId);

    const itemMap = new Map(booking.items.map((i) => [i.id, i]));

    const newUnitIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const alloc of allocations) {
        const bi = itemMap.get(alloc.bookingItemId);
        if (!bi) throw new BadRequestError(`Booking item ${alloc.bookingItemId} not in this booking`);
        if (alloc.unitIds.length !== bi.quantity) {
          throw new BadRequestError(`Unit count must match quantity ${bi.quantity} for ${bi.unitTypeNameSnapshot}`);
        }

        // Unit harus milik unit type yang sama
        const units = await tx.unit.findMany({
          where: {
            id: { in: alloc.unitIds },
            unitTypeId: bi.unitTypeId,
            status: "AVAILABLE",
          },
        });
        if (units.length !== alloc.unitIds.length) {
          throw new BadRequestError("One or more units are invalid, not AVAILABLE, or belong to a different unit type");
        }

        // Tidak overlap dengan booking lain
        const conflict = await tx.bookingItemUnit.findFirst({
          where: {
            unitId: { in: alloc.unitIds },
            bookingItem: {
              booking: {
                id: { not: bookingId },
                status: { in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
                checkInDate: { lt: booking.checkOutDate },
                checkOutDate: { gt: booking.checkInDate },
              },
            },
          },
        });
        if (conflict) throw new ConflictError("One or more units are already allocated to another booking");

        // Hapus alokasi lama, buat baru
        await tx.bookingItemUnit.deleteMany({ where: { bookingItemId: bi.id } });
        await tx.bookingItemUnit.createMany({
          data: alloc.unitIds.map((unitId) => ({
            bookingItemId: bi.id,
            unitId,
            allocatedBy: staffId,
          })),
        });
        newUnitIds.push(...alloc.unitIds);
      }

      // Update status unit ke MAINTENANCE? Tidak; unit tetap AVAILABLE di level inventory,
      // overlap dicek dari booking. Unit menjadi "terpakai" berdasarkan rentang booking.
    });

    return this._mapBooking((await this._getBookingRaw(bookingId))!);
  }

  async markNoShow(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    if (booking.status !== "CONFIRMED") throw new ConflictError("Only CONFIRMED can be no-show");

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "NO_SHOW" },
    });
  }

  async expireBooking(bookingId: string) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking not found");
    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: "EXPIRED", isExpired: true },
    });
  }

  private async _assertStaffCanManage(staffId: string, propertyId: string) {
    const assignment = await prisma.staffPropertyAssignment.findFirst({
      where: { userId: staffId, propertyId, isActive: true },
    });
    if (!assignment) throw new ForbiddenError("Not assigned to this property");

    const shift = await prisma.staffShift.findFirst({
      where: { userId: staffId, propertyId, status: "OPEN" },
    });
    if (!shift) throw new ForbiddenError("No active shift at this property", "NO_ACTIVE_SHIFT");
  }
}