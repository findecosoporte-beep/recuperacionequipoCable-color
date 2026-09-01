import { NextRequest } from "next/server";
import { assertAuth } from "@/lib/auth";
import { badRequest, forbidden } from "@/lib/errors";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { createOrdenesBulk } from "@/lib/ordenes";
import { ROL_TECNICO } from "@/lib/roles";
import { ordenBulkSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await assertAuth(request);
  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    throw forbidden("Los técnicos no pueden importar órdenes");
  }
  const body = await readJson(request);
  if (!Array.isArray(body)) {
    throw badRequest("El cuerpo debe ser un arreglo de órdenes");
  }
  const inputs = ordenBulkSchema.parse(body);
  const result = await createOrdenesBulk(inputs);
  return json(result, 201);
});
