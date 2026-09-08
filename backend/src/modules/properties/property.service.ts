import { Prisma } from "@prisma/client";
import { prisma } from "@/config/database";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/shared/errors";
import { pagination, slugify } from "@/shared/utils/helpers";

export interface CreatePropertyInput {
  code: string;
  name: string;
  description?: string;
  city: string;
  province?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export class PropertyService {
  // ---------- Public ----------
  async listPublic(query: Record<string, string | undefined>) {
    const { page, limit, skip } = pagination(query);
    const where: Prisma.PropertyWhereInput = { status: "ACTIVE" };

    if (query.city) where.city = { contains: query.city, mode: "insensitive" };
    if (query.search) {
      where.OR = [{ name: { contains: query.search, mode: "insensitive" } }];
    }

    const sortBy = (query.sortBy || "created_at") as string;
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

    let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "name") orderBy = { name: sortOrder };
    else if (sortBy === "created_at") orderBy = { createdAt: sortOrder };

    // price filter requires min unit type price
    if (query.minPrice || query.maxPrice) {
      const min = Number(query.minPrice) || 0;
      const max = Number(query.maxPrice) || Number.MAX_SAFE_INTEGER;
      where.unitTypes = {
        some: {
          status: "ACTIVE",
          weekdayPrice: { gte: BigInt(min), lte: BigInt(max) },
        },
      };
    }

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          propertyFacilities: { include: { facility: true } },
          unitTypes: {
            where: { status: "ACTIVE" },
            select: { id: true, name: true, capacity: true, weekdayPrice: true, weekendPrice: true },
          },
        },
      }),
    ]);

    const data = properties.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      city: p.city,
      province: p.province,
      description: p.description,
      images: p.images,
      facilities: p.propertyFacilities.map((pf) => pf.facility),
      minPrice: p.unitTypes.length
        ? String(Math.min(...p.unitTypes.map((u) => Number(u.weekdayPrice))))
        : null,
      maxCapacity: p.unitTypes.length ? Math.max(...p.unitTypes.map((u) => u.capacity)) : null,
    }));

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getPublic(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        propertyFacilities: { include: { facility: true } },
        unitTypes: {
          where: { status: "ACTIVE" },
          include: { images: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!property || property.status !== "ACTIVE") throw new NotFoundError("Property not found");
    return property;
  }

  // ---------- Admin ----------
  async create(input: CreatePropertyInput, userId: string) {
    const slug = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6);

    try {
      const property = await prisma.property.create({
        data: {
          code: input.code,
          name: input.name,
          slug,
          description: input.description,
          city: input.city,
          province: input.province,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          timezone: input.timezone,
          checkInTime: input.checkInTime ?? "14:00",
          checkOutTime: input.checkOutTime ?? "12:00",
          staffAssignments: {
            create: {
              userId,
              isActive: true,
            },
          },
        },
      });
      return property;
    } catch (e: any) {
      if (e?.code === "P2002") throw new ConflictError("Property code or slug already exists", "DUPLICATE");
      throw e;
    }
  }

  async update(id: string, input: Partial<CreatePropertyInput>) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundError("Property not found");

    const data: Prisma.PropertyUpdateInput = {
      ...(input.code ? { code: input.code } : {}),
      ...(input.name ? { name: input.name, slug: slugify(input.name) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.city ? { city: input.city } : {}),
      ...(input.province !== undefined ? { province: input.province } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.checkInTime ? { checkInTime: input.checkInTime } : {}),
      ...(input.checkOutTime ? { checkOutTime: input.checkOutTime } : {}),
    };

    try {
      return await prisma.property.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === "P2002") throw new ConflictError("Property code or slug already exists", "DUPLICATE");
      throw e;
    }
  }

  async deactivate(id: string) {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundError("Property not found");
    return prisma.property.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
  }

  async setFacilities(propertyId: string, facilityIds: string[]) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError("Property not found");

    await prisma.$transaction([
      prisma.propertyFacility.deleteMany({ where: { propertyId } }),
      prisma.propertyFacility.createMany({
        data: facilityIds.map((facilityId) => ({ propertyId, facilityId })),
      }),
    ]);
    return this.getPublic(propertyId);
  }
}
