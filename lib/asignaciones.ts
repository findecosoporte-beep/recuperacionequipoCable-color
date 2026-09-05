import { prisma } from "@/lib/db";
import { ApiError, badRequest } from "@/lib/errors";
import { esOrdenRecuperada } from "@/lib/estado-orden";
import { findOrden, noAnuladaWhere, noRecuperadaWhere } from "@/lib/ordenes";
import { findTecnico } from "@/lib/tecnicos";
import type {
  AsignacionQuery,
  AsignarCiudadInput,
  LiberarCiudadInput,
} from "@/lib/validators-asignaciones";

function ciudadEquals(ciudad: string) {
  return { equals: ciudad, mode: "insensitive" as const };
}

function pendientesAsignacion() {
  return {
    AND: [noRecuperadaWhere(), noAnuladaWhere()],
  };
}

export async function resumenAsignacion(query: AsignacionQuery) {
  const groups = await prisma.orden.groupBy({
    by: ["ciudad", "tecnicoId"],
    _count: { _all: true },
    where: {
      AND: [
        pendientesAsignacion(),
        ...(query.q ? [{ ciudad: { contains: query.q, mode: "insensitive" as const } }] : []),
      ],
    },
  });

  const ciudades = new Map<
    string,
    {
      ciudad: string;
      total: number;
      libres: number;
      asignadas: number;
      otras: number;
    }
  >();

  for (const group of groups) {
    const current = ciudades.get(group.ciudad) ?? {
      ciudad: group.ciudad,
      total: 0,
      libres: 0,
      asignadas: 0,
      otras: 0,
    };
    current.total += group._count._all;
    if (!group.tecnicoId) {
      current.libres += group._count._all;
    } else if (query.tecnicoId && group.tecnicoId === query.tecnicoId) {
      current.asignadas += group._count._all;
    } else {
      current.otras += group._count._all;
    }
    ciudades.set(group.ciudad, current);
  }

  const items = [...ciudades.values()].sort((a, b) =>
    a.ciudad.localeCompare(b.ciudad, "es"),
  );

  let tecnico: {
    id: string;
    nombre: string;
    zona: string | null;
    activo: boolean;
  } | null = null;

  if (query.tecnicoId) {
    try {
      const user = await findTecnico(query.tecnicoId);
      tecnico = {
        id: user.id,
        nombre: user.nombre,
        zona: user.zona,
        activo: user.activo,
      };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) {
        throw error;
      }
    }
  }

  const totalAsignadas = query.tecnicoId
    ? await prisma.orden.count({
        where: { AND: [{ tecnicoId: query.tecnicoId }, pendientesAsignacion()] },
      })
    : 0;

  return {
    tecnico,
    totalAsignadas,
    ciudades: items,
  };
}

export function whereAsignarCiudad(ciudad: string, modo: "libres" | "todas") {
  const whereCiudad = { ciudad: ciudadEquals(ciudad) };
  if (modo === "libres") {
    return { AND: [whereCiudad, pendientesAsignacion(), { tecnicoId: null }] };
  }
  return { AND: [whereCiudad, pendientesAsignacion()] };
}

export async function asignarCiudad(input: AsignarCiudadInput) {
  const tecnico = await findTecnico(input.tecnicoId);
  if (!tecnico.activo) {
    throw badRequest("El técnico está inactivo");
  }

  const result = await prisma.orden.updateMany({
    where: whereAsignarCiudad(input.ciudad, input.modo),
    data: { tecnicoId: tecnico.id },
  });

  return {
    updated: result.count,
    ciudad: input.ciudad,
    tecnicoId: tecnico.id,
    modo: input.modo,
  };
}

export function motivoNoAsignable(orden: {
  comentario?: string | null;
  acuse?: unknown | null;
  estadoAnulacion?: string | null;
}): string | null {
  if (orden.estadoAnulacion === "anulada") {
    return "No se puede asignar una orden anulada";
  }
  if (esOrdenRecuperada(orden.comentario, orden.acuse)) {
    return "No se puede reasignar una orden recuperada";
  }
  return null;
}

export async function asignarOrden(input: { ordenId: string; tecnicoId: string | null }) {
  const orden = await findOrden(input.ordenId);
  const bloqueo = motivoNoAsignable(orden);
  if (bloqueo) throw badRequest(bloqueo);

  let tecnicoId: string | null = null;
  if (input.tecnicoId) {
    const tecnico = await findTecnico(input.tecnicoId);
    if (!tecnico.activo) {
      throw badRequest("El técnico está inactivo");
    }
    tecnicoId = tecnico.id;
  }

  const actualizada = await prisma.orden.update({
    where: { id: orden.id },
    data: { tecnicoId },
    include: {
      tecnico: { select: { id: true, nombre: true, email: true, activo: true } },
    },
  });

  return {
    id: actualizada.id,
    orden: actualizada.orden,
    tecnicoId: actualizada.tecnicoId,
    tecnico: actualizada.tecnico,
  };
}

export async function liberarCiudad(input: LiberarCiudadInput) {
  const tecnico = await findTecnico(input.tecnicoId);
  const result = await prisma.orden.updateMany({
    where: {
      AND: [
        { tecnicoId: tecnico.id },
        { ciudad: ciudadEquals(input.ciudad) },
        pendientesAsignacion(),
      ],
    },
    data: { tecnicoId: null },
  });

  return {
    updated: result.count,
    ciudad: input.ciudad,
    tecnicoId: tecnico.id,
  };
}
