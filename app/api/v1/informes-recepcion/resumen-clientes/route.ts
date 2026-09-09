import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { obtenerResumenCodigosClientes } from "@/lib/informes-resumen";
import { informeResumenClientesSchema } from "@/lib/validators-informes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = informeResumenClientesSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await obtenerResumenCodigosClientes(query.ciudad));
});
