import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: Bun.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (Bun.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
