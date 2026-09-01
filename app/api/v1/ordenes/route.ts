import { NextRequest } from "next/server";
import { assertAuth } from "@/lib/auth";
import { forbidden } from "@/lib/errors";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { createOrden, listOrdenes } from "@/lib/ordenes";
import { ROL_TECNICO } from "@/lib/roles";
import { listQuerySchema, ordenCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const GET = apiHandler(async (request: NextRequest) => {
  const auth = await assertAuth(request);
  const parsed = listQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const query =
    auth.kind === "jwt" && auth.user.rol === ROL_TECNICO
      ? parsed.estado === "recuperada"
        ? { ...parsed, recuperadoPorId: auth.user.sub, tecnicoId: undefined }
        : { ...parsed, tecnicoId: auth.user.sub, recuperadoPorId: undefined }
      : parsed;
  const result = await listOrdenes(query);
  return json(result.items, 200, { meta: result.meta });
});

export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await assertAuth(request);
  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    throw forbidden("Los técnicos no pueden crear órdenes");
  }
  const body = await readJson(request);
  const input = ordenCreateSchema.parse(body);
  const orden = await createOrden(input);
  return json(orden, 201);
});
