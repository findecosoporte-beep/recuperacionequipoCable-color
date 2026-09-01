import { NextRequest } from "next/server";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { createOrdenesBulk } from "@/lib/ordenes";
import { ordenBulkSchema } from "@/lib/validators";
import { badRequest } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(async (request: NextRequest) => {
  const body = await readJson(request);
  if (!Array.isArray(body)) {
    throw badRequest("El cuerpo debe ser un arreglo de órdenes");
  }
  const inputs = ordenBulkSchema.parse(body);
  const result = await createOrdenesBulk(inputs);
  return json(result, 201);
});
