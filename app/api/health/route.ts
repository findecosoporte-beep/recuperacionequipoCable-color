import { prisma } from "@/lib/db";
import { apiHandler, handleOptions, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(
  async () => {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;

    return json({
      status: "ok",
      service: "api-ordenes",
      database: "connected",
      uptime: process.uptime(),
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  },
  { auth: false },
);
