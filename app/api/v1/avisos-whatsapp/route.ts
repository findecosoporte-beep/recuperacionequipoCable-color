import { NextRequest } from "next/server";
import { assertAuth, requirePanelAccess } from "@/lib/auth";
import { forbidden } from "@/lib/errors";
import { listAvisosWhatsApp, registrarAvisoWhatsApp } from "@/lib/avisos-whatsapp";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { findOrden } from "@/lib/ordenes";
import { ROL_TECNICO } from "@/lib/roles";
import { avisoWhatsAppCreateSchema, avisoWhatsAppListSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = avisoWhatsAppListSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await listAvisosWhatsApp(query));
});

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await assertAuth(request);
  const input = avisoWhatsAppCreateSchema.parse(await readJson(request));

  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    const orden = await findOrden(input.ordenId);
    const esSuya =
      orden.tecnicoId === auth.user.sub || orden.recuperadoPorId === auth.user.sub;
    if (!esSuya) {
      throw forbidden("Esta orden no está asignada a tu cuenta");
    }
  } else {
    await requirePanelAccess(request);
  }

  return json(
    await registrarAvisoWhatsApp({
      ...input,
      enviadoPorId: auth.kind === "jwt" ? auth.user.sub : null,
    }),
    201,
  );
});
