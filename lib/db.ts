import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Neon's pooled endpoint can hand back a connection that's gone stale between
// invocations (e.g. after the compute scales to zero) — the *first* query on
// it fails with a connection-terminated error even though the underlying
// service is healthy; a fresh attempt on a new connection succeeds. This is
// a well-documented Neon+serverless gotcha, not an application bug. Wrap any
// DB call that must not silently fail (writes on the critical path) in this.
function isTransientConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /connection.*(terminated|closed|reset)/i.test(message) ||
    /server has closed the connection/i.test(message) ||
    /ECONNRESET/.test(message) ||
    /(^|\s)(P1001|P1017)(\s|$)/.test(message)
  );
}

export async function withDbRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && isTransientConnectionError(error)) {
      return withDbRetry(fn, retries - 1);
    }
    throw error;
  }
}
