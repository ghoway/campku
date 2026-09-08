import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed roles
  const roles = [
    { code: "OWNER", name: "Owner" },
    { code: "STAFF", name: "Staff" },
    { code: "CUSTOMER", name: "Customer" },
  ];

  for (const r of roles as any) {
    await prisma.role.upsert({
      where: { code: r.code },
      create: r,
      update: r,
    });
  }
  console.log("✅ Roles seeded:", roles.map((r) => r.code).join(", "));

  // Default owner
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@camping.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "owner12345";

  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await prisma.user.create({
      data: {
        name: "Camping Owner",
        email: ownerEmail,
        passwordHash,
        userRoles: { create: { role: { connect: { code: "OWNER" } } } },
      },
    });
    console.log(`✅ Owner created: ${ownerEmail} / ${ownerPassword}`);
  } else {
    console.log(`✅ Owner already exists: ${ownerEmail}`);
  }

  // Default admin (OWNER)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@mail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "password";

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "System Admin",
        email: adminEmail,
        passwordHash,
        userRoles: { create: { role: { connect: { code: "OWNER" } } } },
      },
    });
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`✅ Admin already exists: ${adminEmail}`);
  }

  // Default staff
  const staffEmail = process.env.SEED_STAFF_EMAIL ?? "staf@mail.com";
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? "password";

  const staff = await prisma.user.findUnique({ where: { email: staffEmail } });
  if (!staff) {
    const passwordHash = await bcrypt.hash(staffPassword, 12);
    await prisma.user.create({
      data: {
        name: "Front Desk Staff",
        email: staffEmail,
        passwordHash,
        userRoles: { create: { role: { connect: { code: "STAFF" } } } },
      },
    });
    console.log(`✅ Staff created: ${staffEmail} / ${staffPassword}`);
  } else {
    console.log(`✅ Staff already exists: ${staffEmail}`);
  }

  // Default customer / guest
  const guestEmail = process.env.SEED_GUEST_EMAIL ?? "user@mail.com";
  const guestPassword = process.env.SEED_GUEST_PASSWORD ?? "password";

  const guest = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!guest) {
    const passwordHash = await bcrypt.hash(guestPassword, 12);
    await prisma.user.create({
      data: {
        name: "Demo Customer",
        email: guestEmail,
        passwordHash,
        userRoles: { create: { role: { connect: { code: "CUSTOMER" } } } },
      },
    });
    console.log(`✅ Customer created: ${guestEmail} / ${guestPassword}`);
  } else {
    console.log(`✅ Customer already exists: ${guestEmail}`);
  }

  // Default facilities
  const facilities = [
    "Toilet",
    "Shower",
    "Mushola",
    "Electricity",
    "Parking",
    "WiFi",
    "BBQ Area",
    "Campfire Area",
    "Swimming Pool",
    "Restaurant",
  ];
  for (const name of facilities) {
    const exists = await prisma.facility.findFirst({ where: { name } });
    if (!exists) await prisma.facility.create({ data: { name } });
  }
  console.log(`✅ Facilities seeded: ${facilities.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());