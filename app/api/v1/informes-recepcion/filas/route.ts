import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { listarFilasInforme } from "@/lib/informes-filas";
import { informeFilasQuerySchema } from "@/lib/validators-informes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = informeFilasQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await listarFilasInforme(query);
  return json(
    {
      filas: result.filas,
      archivo: result.archivo,
      periodo: result.periodo,
      periodos: result.periodos,
      opciones: result.opciones,
    },
    200,
    { meta: result.meta },
  );
});
