import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { deleteTecnico, getTecnico, updateTecnico } from "@/lib/tecnicos";
import { tecnicoUpdateSchema } from "@/lib/validators-tecnicos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest, params) => {
  await requirePanelAccess(request);
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador del técnico");
  }
  return json(await getTecnico(id));
});

export const PATCH = apiHandler(async (request: NextRequest, params) => {
  await requirePanelAccess(request);
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador del técnico");
  }
  const input = tecnicoUpdateSchema.parse(await readJson(request));
  return json(await updateTecnico(id, input));
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (request: NextRequest, params) => {
  await requirePanelAccess(request);
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador del técnico");
  }
  const tecnico = await deleteTecnico(id);
  return json({ deleted: true, tecnico });
});
