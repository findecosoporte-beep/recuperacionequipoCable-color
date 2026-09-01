import { NextRequest } from "next/server";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { deleteOrden, findOrden, updateOrden } from "@/lib/ordenes";
import { ordenUpdateSchema } from "@/lib/validators";
import { badRequest } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (_request, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const orden = await findOrden(id);
  return json(orden);
});

export const PATCH = apiHandler(async (request: NextRequest, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const body = await readJson(request);
  const input = ordenUpdateSchema.parse(body);
  const orden = await updateOrden(id, input);
  return json(orden);
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (_request, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const orden = await deleteOrden(id);
  return json({ deleted: true, orden });
});
