import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { obtenerResumenEquipoPendiente } from "@/lib/informes-resumen";
import { informeResumenPendienteSchema } from "@/lib/validators-informes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = informeResumenPendienteSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(
    await obtenerResumenEquipoPendiente({
      ciudad: query.ciudad,
      periodo: query.periodo,
      tipoEquipo: query.tipoEquipo,
      empresaEjecutora: query.empresaEjecutora,
    }),
  );
});
