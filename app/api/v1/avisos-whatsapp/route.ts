import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { listAvisosWhatsApp, registrarAvisoWhatsApp } from "@/lib/avisos-whatsapp";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
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
  const auth = await requirePanelAccess(request);
  const input = avisoWhatsAppCreateSchema.parse(await readJson(request));
  return json(
    await registrarAvisoWhatsApp({
      ...input,
      enviadoPorId: auth.kind === "jwt" ? auth.user.sub : null,
    }),
    201,
  );
});
