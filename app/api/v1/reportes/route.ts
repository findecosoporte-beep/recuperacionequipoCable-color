import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { listReporte } from "@/lib/reportes-db";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { reporteQuerySchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = reporteQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await listReporte(query));
});
