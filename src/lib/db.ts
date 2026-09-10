import { PrismaClient } from "@prisma/client";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const log =
    process.env.NODE_ENV === "development" ? (["warn", "error"] as const) : (["error"] as const);

  if (databaseUrl.includes("neon.tech") || process.env.USE_NEON_SERVERLESS === "true") {
    neonConfig.webSocketConstructor = ws;
    // HTTP fetch avoids outbound TCP 5432 (often blocked on Windows) while
    // still returning DateTime values Prisma can parse.
    neonConfig.poolQueryViaFetch = true;
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

/** Avoid holding connections across warm serverless invocations (Vercel + Neon). */
if (process.env.VERCEL) {
  process.on("beforeExit", () => {
    void prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
