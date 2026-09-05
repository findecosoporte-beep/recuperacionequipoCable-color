import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { asignarOrden } from "@/lib/asignaciones";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { asignarOrdenSchema } from "@/lib/validators-asignaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const input = asignarOrdenSchema.parse(await readJson(request));
  return json(await asignarOrden(input));
});
