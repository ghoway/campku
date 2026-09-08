import { prisma } from "@/config/database";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors";
import { toDateOnly } from "@/shared/utils/helpers";

export class WaitlistService {
  async join(userId: string, input: {
    propertyId: string;
    unitTypeId?: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) {
    const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
    if (!property) throw new NotFoundError("Property not found");

    const checkIn = toDateOnly(input.checkIn);
    const checkOut = toDateOnly(input.checkOut);
    if (checkOut <= checkIn) throw new BadRequestError("checkOut must be after checkIn");

    // priority_queue = MAX(priority_queue) + 1 per property+date
    const maxPriority = await prisma.waitlistEntry.aggregate({
      where: { propertyId: input.propertyId, status: { in: ["WAITING", "NOTIFIED"] } },
      _max: { priorityQueue: true },
    });

    const entry = await prisma.waitlistEntry.create({
      data: {
        userId,
        propertyId: input.propertyId,
        unitTypeId: input.unitTypeId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: input.adults,
        children: input.children,
        priorityQueue: (maxPriority._max.priorityQueue ?? 0) + 1,
      },
    });

    return entry;
  }

  async listMine(userId: string) {
    return prisma.waitlistEntry.findMany({
      where: { userId },
      include: { property: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async cancel(userId: string, waitlistId: string) {
    const entry = await prisma.waitlistEntry.findUnique({ where: { id: waitlistId } });
    if (!entry) throw new NotFoundError("Waitlist entry not found");
    if (entry.userId !== userId) throw new ForbiddenError("Cannot cancel this waitlist entry");

    return prisma.waitlistEntry.update({
      where: { id: waitlistId },
      data: { status: "CANCELLED" },
    });
  }

  async listForProperty(propertyId: string) {
    return prisma.waitlistEntry.findMany({
      where: { propertyId: propertyId, status: { in: ["WAITING", "NOTIFIED"] } },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { priorityQueue: "asc" },
    });
  }

  /**
   * FIFO: ketika ada cancel/expire, cari entry WAITING pertama untuk property+date.
   */
  async findNext(checkIn: Date, checkOut: Date, propertyId?: string) {
    return prisma.waitlistEntry.findFirst({
      where: {
        status: "WAITING",
        checkInDate: { lte: checkIn },
        checkOutDate: { gte: checkIn },
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: [{ priorityQueue: "asc" }, { createdAt: "asc" }],
    });
  }
}