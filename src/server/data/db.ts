import { PrismaClient } from "@prisma/client";

// Data layer: the single PrismaClient instance. Only modules under src/server/data/** import this.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
