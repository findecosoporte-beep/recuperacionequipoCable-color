import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { obtenerDashboard } from "@/lib/dashboard-db";
import { apiHandler, handleOptions, json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  return json(await obtenerDashboard());
});
