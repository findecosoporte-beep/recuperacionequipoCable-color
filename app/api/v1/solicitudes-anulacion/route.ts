import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json } from "@/lib/http";
import { listSolicitudesAnulacion } from "@/lib/solicitudes-anulacion";
import { avisoWhatsAppListSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = avisoWhatsAppListSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await listSolicitudesAnulacion(query));
});
