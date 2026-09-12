import { prisma } from "@/config/database";
import { ConflictError, NotFoundError } from "@/shared/errors";
import { slugify } from "@/shared/utils/helpers";

export interface CreateUnitTypeInput {
  name: string;
  description?: string;
  capacity: number;
  weekdayPrice: number;
  weekendPrice: number;
  facilityIds?: string[];
}

export class UnitTypeService {
  async listByProperty(propertyId: string) {
    return prisma.unitType.findMany({
      where: { propertyId, status: "ACTIVE" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        facilities: { include: { facility: true } },
        units: { orderBy: { code: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async get(id: string) {
    const ut = await prisma.unitType.findUnique({
      where: { id },
      include: {
        property: true,
        images: { orderBy: { sortOrder: "asc" } },
        facilities: { include: { facility: true } },
        units: { orderBy: { code: "asc" } },
        specialRates: { orderBy: { startDate: "asc" } },
      },
    });
    if (!ut) throw new NotFoundError("Unit type not found");
    return ut;
  }

  async create(propertyId: string, input: CreateUnitTypeInput) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError("Property not found");

    const slug = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6);

    const data: any = {
      propertyId,
      name: input.name,
      slug,
      description: input.description,
      capacity: input.capacity,
      weekdayPrice: BigInt(input.weekdayPrice),
      weekendPrice: BigInt(input.weekendPrice),
    };

    if (input.facilityIds?.length) {
      data.facilities = {
        create: input.facilityIds.map((facilityId) => ({ facilityId })),
      };
    }

    try {
      return await prisma.unitType.create({ data });
    } catch (e: any) {
      throw new ConflictError("Unit type could not be created", "DUPLICATE");
    }
  }

  async update(id: string, input: Partial<CreateUnitTypeInput>) {
    const exists = await prisma.unitType.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Unit type not found");

    const data: any = {};
    if (input.name) {
      data.name = input.name;
      data.slug = slugify(input.name);
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.capacity !== undefined) data.capacity = input.capacity;
    if (input.weekdayPrice !== undefined) data.weekdayPrice = BigInt(input.weekdayPrice);
    if (input.weekendPrice !== undefined) data.weekendPrice = BigInt(input.weekendPrice);

    if (input.facilityIds !== undefined) {
      await prisma.unitTypeFacility.deleteMany({ where: { unitTypeId: id } });
      if (input.facilityIds.length) {
        data.facilities = {
          create: input.facilityIds.map((facilityId) => ({ facilityId })),
        };
      }
    }

    return prisma.unitType.update({ where: { id }, data });
  }

  async delete(id: string) {
    const exists = await prisma.unitType.findUnique({ where: { id } });
    if (!exists) throw new NotFoundError("Unit type not found");
    // Soft delete
    return prisma.unitType.update({ where: { id }, data: { status: "INACTIVE" } });
  }

  // ---------- Units ----------
  async listUnits(unitTypeId: string) {
    return prisma.unit.findMany({
      where: { unitTypeId },
      orderBy: { code: "asc" },
    });
  }

  async createUnit(unitTypeId: string, input: { code: string; name?: string; status?: any; notes?: string }) {
    const exists = await prisma.unitType.findUnique({ where: { id: unitTypeId } });
    if (!exists) throw new NotFoundError("Unit type not found");

    const unit = await prisma.unit.create({
      data: {
        unitTypeId,
        code: input.code,
        name: input.name,
        status: input.status ?? "AVAILABLE",
        notes: input.notes,
      },
    });

    // Sync total_units
    await this._syncUnitCount(unitTypeId);
    return unit;
  }

  async updateUnit(unitId: string, input: Partial<{ code: string; name?: string; status?: any; notes?: string }>) {
    const exists = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!exists) throw new NotFoundError("Unit not found");
    return prisma.unit.update({ where: { id: unitId }, data: input });
  }

  async deleteUnit(unitId: string) {
    const exists = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!exists) throw new NotFoundError("Unit not found");
    const unit = await prisma.unit.update({ where: { id: unitId }, data: { status: "INACTIVE" } });

    await this._syncUnitCount(unit.unitTypeId);
    return unit;
  }

  private async _syncUnitCount(unitTypeId: string) {
    const count = await prisma.unit.count({
      where: { unitTypeId, status: { not: "INACTIVE" } },
    });
    await prisma.unitType.update({
      where: { id: unitTypeId },
      data: { totalUnits: count },
    });
  }
}