import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { apiHandler, handleOptions, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

let dbPing: { at: number; ok: boolean } | null = null;
const PING_TTL_MS = 5_000;

async function pingDatabase(): Promise<void> {
  const now = Date.now();
  if (dbPing && now - dbPing.at < PING_TTL_MS) {
    if (!dbPing.ok) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Base de datos no disponible");
    }
    return;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbPing = { at: now, ok: true };
  } catch (error) {
    dbPing = { at: now, ok: false };
    throw error;
  }
}

export const GET = apiHandler(
  async () => {
    const started = Date.now();
    await pingDatabase();

    return json({
      status: "ok",
      service: "api-ordenes",
      database: "connected",
      uptime: process.uptime(),
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  },
  { auth: false, rateLimit: "health" },
);
