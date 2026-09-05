import { NextRequest } from "next/server";
import { assertAuth, requireAdmin } from "@/lib/auth";
import { badRequest, forbidden } from "@/lib/errors";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { deleteOrden, findOrden, updateOrden } from "@/lib/ordenes";
import { ROL_TECNICO } from "@/lib/roles";
import { registrarSolicitudAnulacion } from "@/lib/solicitudes-anulacion";
import { ordenUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

async function ordenParaTecnico(request: NextRequest, id: string) {
  const auth = await assertAuth(request);
  const orden = await findOrden(id);
  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    const esSuya =
      orden.tecnicoId === auth.user.sub || orden.recuperadoPorId === auth.user.sub;
    if (!esSuya) {
      throw forbidden("Esta orden no está asignada a tu cuenta");
    }
  }
  return { auth, orden };
}

export const GET = apiHandler(async (request, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const { orden } = await ordenParaTecnico(request, id);
  return json(orden);
});

export const PATCH = apiHandler(async (request: NextRequest, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const { auth, orden } = await ordenParaTecnico(request, id);
  const body = await readJson(request);
  const input = ordenUpdateSchema.parse(body);
  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    const permitido: {
      comentario?: typeof input.comentario;
      estadoAnulacion?: typeof input.estadoAnulacion;
      motivoAnulacion?: typeof input.motivoAnulacion;
    } = {};
    if (input.comentario !== undefined) {
      permitido.comentario = input.comentario;
    }
    if (input.estadoAnulacion !== undefined) {
      permitido.estadoAnulacion = input.estadoAnulacion;
    }
    if (input.motivoAnulacion !== undefined) {
      permitido.motivoAnulacion = input.motivoAnulacion;
    }
    if (
      permitido.comentario === undefined &&
      permitido.estadoAnulacion === undefined &&
      permitido.motivoAnulacion === undefined
    ) {
      throw forbidden("Solo puedes actualizar el comentario, el estado o el motivo de anulación");
    }
    const actualizada = await updateOrden(id, permitido, auth.user.sub);
    if (
      permitido.estadoAnulacion === "por_anular" &&
      orden.estadoAnulacion !== "por_anular"
    ) {
      await registrarSolicitudAnulacion({
        ordenId: actualizada.id,
        numeroOrden: actualizada.orden,
        cliente: actualizada.cliente,
        ciudad: actualizada.ciudad,
        colonia: actualizada.colonia,
        telefono: actualizada.telefono,
        motivo: actualizada.motivoAnulacion,
        solicitadoPorId: auth.user.sub,
      });
    }
    return json(actualizada);
  }
  const actualizada = await updateOrden(id, input, auth.kind === "jwt" ? auth.user.sub : null);
  return json(actualizada);
});

export const PUT = PATCH;

export const DELETE = apiHandler(async (request, params) => {
  const id = params.id;
  if (!id) {
    throw badRequest("Falta el identificador de la orden");
  }
  const { auth } = await ordenParaTecnico(request, id);
  if (auth.kind === "jwt" && auth.user.rol === ROL_TECNICO) {
    throw forbidden("Los técnicos no pueden eliminar órdenes");
  }
  await requireAdmin(request);
  const orden = await deleteOrden(id);
  return json({ deleted: true, orden });
});
