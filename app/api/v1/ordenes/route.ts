import { NextRequest } from "next/server";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { createOrden, listOrdenes } from "@/lib/ordenes";
import { listQuerySchema, ordenCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  const query = listQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const result = await listOrdenes(query);
  return json(result.items, 200, { meta: result.meta });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await readJson(request);
  const input = ordenCreateSchema.parse(body);
  const orden = await createOrden(input);
  return json(orden, 201);
});
