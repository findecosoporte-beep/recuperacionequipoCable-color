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

function textoEquals(value: string) {
  return { equals: value, mode: "insensitive" as const };
}

function lugarWhere(ciudad: string, colonia?: string) {
  return {
    ciudad: textoEquals(ciudad),
    ...(colonia !== undefined ? { colonia: textoEquals(colonia) } : {}),
  };
}

function pendientesAsignacion() {
  return {
    AND: [noRecuperadaWhere(), noAnuladaWhere()],
  };
}

function sumarGrupo(
  current: { total: number; libres: number; asignadas: number; otras: number },
  tecnicoId: string | null,
  count: number,
  selectedTecnicoId?: string,
) {
  current.total += count;
  if (!tecnicoId) {
    current.libres += count;
  } else if (selectedTecnicoId && tecnicoId === selectedTecnicoId) {
    current.asignadas += count;
  } else {
    current.otras += count;
  }
}

export async function resumenAsignacion(query: AsignacionQuery) {
  const groups = await prisma.orden.groupBy({
    by: ["ciudad", "colonia", "tecnicoId"],
    _count: { _all: true },
    where: {
      AND: [
        pendientesAsignacion(),
        ...(query.q
          ? [
              {
                OR: [
                  { ciudad: { contains: query.q, mode: "insensitive" as const } },
                  { colonia: { contains: query.q, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
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
  const barrios = new Map<
    string,
    {
      ciudad: string;
      colonia: string;
      total: number;
      libres: number;
      asignadas: number;
      otras: number;
    }
  >();

  for (const group of groups) {
    const ciudad = ciudades.get(group.ciudad) ?? {
      ciudad: group.ciudad,
      total: 0,
      libres: 0,
      asignadas: 0,
      otras: 0,
    };
    sumarGrupo(ciudad, group.tecnicoId, group._count._all, query.tecnicoId);
    ciudades.set(group.ciudad, ciudad);

    const barrioKey = `${group.ciudad.toLowerCase()}\0${group.colonia.toLowerCase()}`;
    const barrio = barrios.get(barrioKey) ?? {
      ciudad: group.ciudad,
      colonia: group.colonia,
      total: 0,
      libres: 0,
      asignadas: 0,
      otras: 0,
    };
    sumarGrupo(barrio, group.tecnicoId, group._count._all, query.tecnicoId);
    barrios.set(barrioKey, barrio);
  }

  const items = [...ciudades.values()].sort((a, b) =>
    a.ciudad.localeCompare(b.ciudad, "es"),
  );
  const itemsBarrio = [...barrios.values()].sort((a, b) => {
    const ciudad = a.ciudad.localeCompare(b.ciudad, "es");
    return ciudad !== 0 ? ciudad : a.colonia.localeCompare(b.colonia, "es");
  });

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
    barrios: itemsBarrio,
  };
}

export function whereAsignarCiudad(ciudad: string, modo: "libres" | "todas", colonia?: string) {
  const whereLugar = lugarWhere(ciudad, colonia);
  if (modo === "libres") {
    return { AND: [whereLugar, pendientesAsignacion(), { tecnicoId: null }] };
  }
  return { AND: [whereLugar, pendientesAsignacion()] };
}

export async function asignarCiudad(input: AsignarCiudadInput) {
  const tecnico = await findTecnico(input.tecnicoId);
  if (!tecnico.activo) {
    throw badRequest("El técnico está inactivo");
  }

  const result = await prisma.orden.updateMany({
    where: whereAsignarCiudad(input.ciudad, input.modo, input.colonia),
    data: { tecnicoId: tecnico.id },
  });

  return {
    updated: result.count,
    ciudad: input.ciudad,
    colonia: input.colonia,
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
        lugarWhere(input.ciudad, input.colonia),
        pendientesAsignacion(),
      ],
    },
    data: { tecnicoId: null },
  });

  return {
    updated: result.count,
    ciudad: input.ciudad,
    colonia: input.colonia,
    tecnicoId: tecnico.id,
  };
}
