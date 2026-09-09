import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import {
  guardarInformeRecepcion,
  obtenerInformeRecepcion,
} from "@/lib/informes-recepcion";
import {
  informeRecepcionCreateSchema,
  informeRecepcionListSchema,
} from "@/lib/validators-informes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = informeRecepcionListSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await obtenerInformeRecepcion(query.periodo));
});

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await requirePanelAccess(request);
  const input = informeRecepcionCreateSchema.parse(
    await readJson(request, { maxBytes: 4_000_000 }),
  );
  return json(
    await guardarInformeRecepcion({
      archivo: input.archivo,
      filas: input.filas,
      periodo: input.periodo,
      subidoPorId: auth.kind === "jwt" ? auth.user.sub : null,
    }),
    201,
  );
});
