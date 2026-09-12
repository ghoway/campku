import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import https from "https";

const prisma = new PrismaClient();

function dl(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { resolve(); return; }
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        dl(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on("finish", () => { ws.close(); resolve(); });
      ws.on("error", reject);
    }).on("error", reject);
  });
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("📡 Starting full seed...\n");

  // === ROLES ===
  const roles = [{ code: "OWNER" as const, name: "Owner" }, { code: "STAFF" as const, name: "Staff" }, { code: "CUSTOMER" as const, name: "Customer" }];
  for (const r of roles) {
    await prisma.role.upsert({ where: { code: r.code }, create: r, update: r });
  }
  console.log("✅ Roles");

  // === USERS ===
  const hash = await bcrypt.hash("owner12345", 12);
  const staffHash = await bcrypt.hash("password", 12);

  let owner = await prisma.user.findUnique({ where: { email: "owner@camping.com" } });
  if (!owner) {
    owner = await prisma.user.create({ data: { name: "Camping Owner", email: "owner@camping.com", passwordHash: hash, userRoles: { create: { role: { connect: { code: "OWNER" } } } } } });
  }

  let staff = await prisma.user.findFirst({ where: { userRoles: { some: { role: { code: "STAFF" } } } } });
  if (!staff) {
    staff = await prisma.user.create({ data: { name: "Front Desk", email: "staf@mail.com", passwordHash: staffHash, userRoles: { create: { role: { connect: { code: "STAFF" } } } } } });
  }

  let customer = await prisma.user.findFirst({ where: { userRoles: { some: { role: { code: "CUSTOMER" } } } } });
  if (!customer) {
    customer = await prisma.user.create({ data: { name: "Demo Customer", email: "user@mail.com", passwordHash: staffHash, userRoles: { create: { role: { connect: { code: "CUSTOMER" } } } } } });
  }
  console.log("✅ Users");

  // === FACILITIES ===
  const facilityNames = ["Toilet", "Shower", "Mushola", "Electricity", "Parking", "WiFi", "BBQ Area", "Campfire Area", "Swimming Pool", "Restaurant"];
  for (const name of facilityNames) {
    const exists = await prisma.facility.findFirst({ where: { name } });
    if (!exists) await prisma.facility.create({ data: { name } });
  }
  const allFacilities = await prisma.facility.findMany();
  console.log(`✅ Facilities: ${allFacilities.length}`);

  // === PROPERTIES (cleanup old seed first) ===
  const oldProps = await prisma.property.findMany({ where: { code: { startsWith: "SEED-" } } });
  if (oldProps.length) {
    await prisma.property.deleteMany({ where: { id: { in: oldProps.map(p => p.id) } } });
    console.log(`🧹 Removed ${oldProps.length} old SEED properties`);
  }

  const propData = [
    {
      code: "SEED-GLV", slug: "green-valley-camp", name: "Green Valley Camp",
      desc: "Kemah premium di tengah lembah hijau Puncak, dikelilingi pegunungan dan sungai jernih. Cocok untuk family gathering dan corporate retreat.",
      city: "Puncak", province: "Jawa Barat", address: "Jl. Raya Puncak Km 80, Cisarua",
      lat: -6.7115, lng: 106.9538,
      images: [
        "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80",
        "https://images.unsplash.com/photo-1517824806704-9040b037703b?w=1200&q=80",
        "https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=1200&q=80",
      ],
    },
    {
      code: "SEED-SVB", slug: "sunset-villa-batu", name: "Sunset Villa Batu",
      desc: "Villa privat dengan pemandangan matahari terbenam spektakuler. Didesain modern minimalis dengan fasilitas lengkap untuk liburan mewah.",
      city: "Batu", province: "Jawa Timur", address: "Jl. Raya Oro-oro Ombo No 200, Batu",
      lat: -7.8683, lng: 112.5241,
      images: [
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
      ],
    },
    {
      code: "SEED-OTW", slug: "ocean-view-karimunjawa", name: "Ocean View Karimunjawa",
      desc: "Glamping tepi pantai dengan pemandangan laut langsung. Snorkeling, diving, dan sunset dinner di tepi pantar.",
      city: "Karimunjawa", province: "Jawa Tengah", address: "Pantai Barakuda, Karimunjawa",
      lat: -5.8485, lng: 110.4404,
      images: [
        "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&q=80",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
        "https://images.unsplash.com/photo-1471479917193-f00955256257?w=1200&q=80",
      ],
    },
  ];

  const allFacilityIds = allFacilities.map(f => f.id);
  const createdProperties: any[] = [];

  for (const p of propData) {
    const prop = await prisma.property.create({
      data: {
        code: p.code, slug: p.slug, name: p.name, description: p.desc,
        city: p.city, province: p.province, address: p.address,
        latitude: p.lat, longitude: p.lng,
        images: { create: p.images.map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 })) },
        propertyFacilities: { create: allFacilityIds.slice(0, 6 + Math.floor(Math.random() * 4)).map(fid => ({ facilityId: fid })) },
      },
    });
    createdProperties.push(prop);
  }
  console.log(`✅ Properties: ${createdProperties.length}`);

  // === UNIT TYPES & UNITS ===
  const unitTypeConfigs = [
    { name: "Tenda Premium", slug: "tenda-premium", desc: "Tenda kapasitas 4 orang, sleeping bag, matras tebal", capacity: 4, units: ["A-01", "A-02", "A-03", "A-04", "A-05"], wp: 350000, wep: 500000 },
    { name: "Tenda Standard", slug: "tenda-standard", desc: "Tenda basic 2 orang, matras, sleeping bag", capacity: 2, units: ["B-01", "B-02", "B-03", "B-04", "B-05", "B-06"], wp: 200000, wep: 350000 },
    { name: "Villa Family", slug: "villa-family", desc: "Villa 2 kamar tidur, dapur, ruang tamu, teras", capacity: 8, units: ["V-01", "V-02", "V-03"], wp: 1200000, wep: 1800000 },
    { name: "Glamping Suite", slug: "glamping-suite", desc: "Glamping premium dengan AC, kamar mandi dalam, balkon", capacity: 4, units: ["G-01", "G-02"], wp: 800000, wep: 1200000 },
  ];

  const unitTypeImages: Record<string, string[]> = {
    "tenda-premium": ["https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&q=80", "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80"],
    "tenda-standard": ["https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800&q=80", "https://images.unsplash.com/photo-1689163439447-3c407d98ab44?w=800&q=80"],
    "villa-family": ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"],
    "glamping-suite": ["https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80", "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80"],
  };

  const allCreatedUnitTypes: any[] = [];

  for (const prop of createdProperties) {
    for (const cfg of unitTypeConfigs) {
      const ut = await prisma.unitType.create({
        data: {
          propertyId: prop.id, name: cfg.name, slug: `${cfg.slug}-${prop.slug}`, description: cfg.desc,
          capacity: cfg.capacity, totalUnits: cfg.units.length,
          weekdayPrice: BigInt(cfg.wp), weekendPrice: BigInt(cfg.wep),
          units: { create: cfg.units.map(code => ({ code, name: `${cfg.name} ${code}`, status: "AVAILABLE" as const })) },
          images: {
            create: (unitTypeImages[cfg.slug] || []).map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 })),
          },
          facilities: {
            create: allFacilityIds.slice(0, 3).map(fid => ({ facilityId: fid })),
          },
        },
      });
      allCreatedUnitTypes.push({ ...ut, propId: prop.id });
      await sleep(10);
    }
  }
  console.log(`✅ Unit types: ${allCreatedUnitTypes.length}`);

  // === BOOKINGS ===
  const guests = [
    { name: "Budi Santoso", phone: "081234567801", email: "budi@mail.com" },
    { name: "Siti Rahayu", phone: "081234567802", email: "siti@mail.com" },
    { name: "Agus Priyanto", phone: "081234567803", email: "agus@mail.com" },
    { name: "Dewi Lestari", phone: "081234567804", email: "dewi@mail.com" },
    { name: "Rizky Pratama", phone: "081234567805", email: "rizky@mail.com" },
    { name: "Maya Sari", phone: "081234567806", email: "maya@mail.com" },
    { name: "Joko Widodo", phone: "081234567807", email: "joko@mail.com" },
    { name: "Indah Permata", phone: "081234567808", email: "indah@mail.com" },
    { name: "Bayu Nugroho", phone: "081234567809", email: "bayu@mail.com" },
    { name: "Rina Anggraini", phone: "081234567810", email: "rina@mail.com" },
    { name: "Hendra Wijaya", phone: "081234567811", email: "hendra@mail.com" },
    { name: "Putri Anjani", phone: "081234567812", email: "putri@mail.com" },
  ];

  const statuses: Array<"PENDING" | "AWAITING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED"> = [
    "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "AWAITING_PAYMENT", "CANCELLED", "PENDING", "CONFIRMED", "CHECKED_OUT",
  ];
  const sources: Array<"SELF_RESERVATION" | "WALK_IN" | "ADMIN"> = ["SELF_RESERVATION", "WALK_IN", "ADMIN"];

  const today = new Date();
  let bCounter = 1;

  for (const ut of allCreatedUnitTypes) {
    for (let i = 0; i < 3; i++) {
      const guest = guests[(bCounter - 1) % guests.length];
      const status = statuses[bCounter % statuses.length];
      const source = sources[bCounter % 3];

      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + (bCounter % 14) - 4);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + (1 + (bCounter % 3)));

      const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
      const basePrice = Number(ut.weekdayPrice);
      const quantity = Math.min(2, Math.floor(ut.totalUnits / 2) || 1);
      const subtotal = BigInt(basePrice * nights * quantity);

      const booking = await prisma.booking.create({
        data: {
          bookingCode: `SEED-${String(bCounter).padStart(4, "0")}`,
          propertyId: ut.propId,
          customerUserId: customer!.id,
          createdByUserId: source === "WALK_IN" ? staff!.id : customer!.id,
          guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone,
          checkInDate: checkIn, checkOutDate: checkOut,
          adults: 2 + (bCounter % 2), children: bCounter % 3 === 0 ? 1 : 0,
          subtotal, discount: BigInt(0), additionalFee: BigInt(0), grandTotal: subtotal,
          status, source,
          createdAt: new Date(today.getTime() - bCounter * 7200000),
          items: {
            create: [{
              unitTypeId: ut.id, unitTypeNameSnapshot: ut.name,
              quantity, subtotal,
              nights: {
                create: Array.from({ length: nights }, (_, ni) => ({
                  stayDate: new Date(checkIn.getTime() + ni * 86400000),
                  unitPrice: BigInt(basePrice), quantity, total: BigInt(basePrice * quantity),
                  rateName: ni >= 5 && ni <= 6 ? "Weekend" : "Weekday",
                })),
              },
            }],
          },
          payments: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(status) ? {
            create: [{
              method: source === "WALK_IN" ? "CASH" : "BANK_TRANSFER",
              status: "PAID" as const, amount: subtotal,
              paidAt: new Date(checkIn.getTime() - 86400000),
              receivedByUserId: staff!.id,
            }],
          } : undefined,
        },
        select: { id: true },
      });

      if (status === "CHECKED_IN") {
        await prisma.booking.update({ where: { id: booking.id }, data: { checkedInAt: new Date(checkIn.getTime() + 3600000), checkedInBy: staff!.id } });
      } else if (status === "CHECKED_OUT") {
        await prisma.booking.update({ where: { id: booking.id }, data: { checkedInAt: new Date(checkIn.getTime() + 3600000), checkedInBy: staff!.id, checkedOutAt: new Date(checkOut.getTime() + 3600000), checkedOutBy: staff!.id } });
      } else if (status === "CANCELLED") {
        await prisma.booking.update({ where: { id: booking.id }, data: { cancelledAt: new Date(), cancelledBy: staff!.id, cancelReason: "Guest request" } });
      }

      const statusEmoji = { PENDING: "⏳", AWAITING_PAYMENT: "💰", CONFIRMED: "✅", CHECKED_IN: "🏨", CHECKED_OUT: "👋", CANCELLED: "❌" }[status];
      process.stdout.write(`  ${statusEmoji} SEED-${String(bCounter).padStart(4, "0")} | ${ut.name} ${quantity}x | ${nights}n | Rp${subtotal.toLocaleString("id")} | ${status}\r\n`);
      bCounter++;
      await sleep(5);
    }
  }

  console.log(`\n🎉 Seeded ${bCounter - 1} bookings with items, nights, and payments!`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
