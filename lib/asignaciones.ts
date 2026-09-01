import { prisma } from "@/lib/db";
import { ApiError, badRequest } from "@/lib/errors";
import { noAnuladaWhere, noRecuperadaWhere } from "@/lib/ordenes";
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

export async function asignarCiudad(input: AsignarCiudadInput) {
  const tecnico = await findTecnico(input.tecnicoId);
  if (!tecnico.activo) {
    throw badRequest("El técnico está inactivo");
  }

  const whereCiudad = { ciudad: ciudadEquals(input.ciudad) };
  const result = await prisma.orden.updateMany({
    where:
      input.modo === "libres"
        ? { AND: [whereCiudad, pendientesAsignacion(), { tecnicoId: null }] }
        : { AND: [whereCiudad, pendientesAsignacion()] },
    data: { tecnicoId: tecnico.id },
  });

  return {
    updated: result.count,
    ciudad: input.ciudad,
    tecnicoId: tecnico.id,
    modo: input.modo,
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
