import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { createTecnico, listTecnicos } from "@/lib/tecnicos";
import {
  tecnicoCreateSchema,
  tecnicoListQuerySchema,
} from "@/lib/validators-tecnicos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const query = tecnicoListQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await listTecnicos(query);
  return json(result.items, 200, { meta: result.meta });
});

export const POST = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const input = tecnicoCreateSchema.parse(await readJson(request));
  const tecnico = await createTecnico(input);
  return json(tecnico, 201);
});
