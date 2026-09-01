import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { asignarCiudad, resumenAsignacion } from "@/lib/asignaciones";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import {
  asignacionQuerySchema,
  asignarCiudadSchema,
} from "@/lib/validators-asignaciones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = asignacionQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  return json(await resumenAsignacion(query));
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const input = asignarCiudadSchema.parse(await readJson(request));
  const result = await asignarCiudad(input);
  return json(result);
});
