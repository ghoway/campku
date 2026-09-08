import bcrypt from "bcryptjs";
import { prisma } from "@/config/database";
import { ConflictError, NotFoundError, BadRequestError } from "@/shared/errors";

const BCRYPT_COST = 12;

export class StaffService {
  async list() {
    const staff = await prisma.user.findMany({
      where: { userRoles: { some: { role: { code: "STAFF" } } } },
      include: {
        userRoles: { include: { role: true } },
        staffPropertyAssignments: {
          where: { isActive: true },
          include: { property: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return staff.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      status: s.status,
      createdAt: s.createdAt,
      properties: s.staffPropertyAssignments.map((a) => ({ id: a.property.id, name: a.property.name, city: a.property.city })),
    }));
  }

  async get(staffId: string) {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, userRoles: { some: { role: { code: "STAFF" } } } },
      include: {
        staffPropertyAssignments: { include: { property: true } },
      },
    });
    if (!staff) throw new NotFoundError("Staff not found");
    return staff;
  }

  async create(input: { name: string; email: string; phone?: string; password: string; propertyIds?: string[] }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError("Email already exists", "EMAIL_EXISTS");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const staff = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        userRoles: { create: { role: { connect: { code: "STAFF" } } } },
        staffPropertyAssignments: input.propertyIds?.length
          ? { create: input.propertyIds.map((propertyId) => ({ propertyId, isActive: true })) }
          : undefined,
      },
      include: { staffPropertyAssignments: true },
    });

    return staff;
  }

  async update(staffId: string, input: { name?: string; phone?: string; password?: string }) {
    const staff = await this.get(staffId);

    const data: any = {};
    if (input.name) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    return prisma.user.update({ where: { id: staffId }, data });
  }

  async deactivate(staffId: string) {
    await this.get(staffId);
    return prisma.user.update({ where: { id: staffId }, data: { status: "INACTIVE" } });
  }

  async activate(staffId: string) {
    await this.get(staffId);
    return prisma.user.update({ where: { id: staffId }, data: { status: "ACTIVE" } });
  }

  async setProperties(staffId: string, propertyIds: string[]) {
    await this.get(staffId);

    // Validasi semua property ada
    const properties = await prisma.property.findMany({ where: { id: { in: propertyIds } } });
    if (properties.length !== propertyIds.length) {
      throw new BadRequestError("One or more properties not found");
    }

    await prisma.$transaction([
      prisma.staffPropertyAssignment.updateMany({
        where: { userId: staffId },
        data: { isActive: false, deactivatedAt: new Date() },
      }),
      ...propertyIds.map((propertyId) =>
        prisma.staffPropertyAssignment.upsert({
          where: { userId_propertyId: { userId: staffId, propertyId } },
          create: { userId: staffId, propertyId, isActive: true },
          update: { isActive: true, deactivatedAt: null },
        })
      ),
    ]);

    return this.get(staffId);
  }
}