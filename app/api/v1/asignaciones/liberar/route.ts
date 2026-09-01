import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { liberarCiudad } from "@/lib/asignaciones";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { liberarCiudadSchema } from "@/lib/validators-asignaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const input = liberarCiudadSchema.parse(await readJson(request));
  return json(await liberarCiudad(input));
});
