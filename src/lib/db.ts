import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

/** Avoid holding connections across warm serverless invocations (Vercel + Neon). */
if (process.env.VERCEL) {
  process.on("beforeExit", () => {
    void prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
