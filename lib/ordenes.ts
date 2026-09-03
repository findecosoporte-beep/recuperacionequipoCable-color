import { prisma } from "@/lib/db";
import {
  acusePublico,
  comentarioSinAcuse,
  extraerAcuse,
  type AcuseRecibido,
} from "@/lib/acuse";
import { esOrdenRecuperada } from "@/lib/estado-orden";
import { notFound } from "@/lib/errors";
import type { ListQuery, OrdenCreateInput, OrdenUpdateInput } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

const tecnicoSelect = {
  id: true,
  nombre: true,
  email: true,
  activo: true,
} as const;

const ordenInclude = {
  tecnico: { select: tecnicoSelect },
  acuse: true,
} as const;

function serializeOrden<T extends { acuse?: Parameters<typeof acusePublico>[0] | null }>(
  orden: T,
) {
  return {
    ...orden,
    acuse: acusePublico(orden.acuse),
  };
}

function datosAcuse(acuse: AcuseRecibido) {
  return {
    cliente: acuse.cliente,
    contrato: acuse.contrato,
    fecha: acuse.fecha,
    modemOnu: acuse.modemOnu,
    router: acuse.router,
    equipoDigital: acuse.equipoDigital,
    accesorios: acuse.accesorios as Prisma.InputJsonValue,
    nombreFirma: acuse.nombreFirma,
  };
}

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

const recuperadaComentarioFiltro = {
  OR: [
    { comentario: contains("---ACUSE---") },
    { comentario: contains("Recuperó equipo: sí") },
    { comentario: contains("Recuperó equipo: si") },
    { comentario: contains("Equipos recuperados:") },
    { comentario: contains("Se recibe equipo") },
  ],
};

export const recuperadaFiltro = {
  OR: [
    { recuperadoPorId: { not: null } },
    recuperadaComentarioFiltro,
    { acuse: { isNot: null } },
  ],
};

export function noRecuperadaWhere() {
  return {
    recuperadoPorId: null,
    acuse: { is: null },
    OR: [{ comentario: null }, { NOT: recuperadaComentarioFiltro }],
  };
}

export function noAnuladaWhere() {
  return {
    OR: [{ estadoAnulacion: null }, { estadoAnulacion: { not: "anulada" } }],
  };
}

function buildWhere(query: ListQuery) {
  const filters = [
    ...(query.ciudad ? [{ ciudad: contains(query.ciudad) }] : []),
    ...(query.colonia ? [{ colonia: contains(query.colonia) }] : []),
    ...(query.cliente ? [{ cliente: contains(query.cliente) }] : []),
    ...(query.orden ? [{ orden: contains(query.orden) }] : []),
    ...(query.estado === "recuperada"
      ? [{ AND: [recuperadaFiltro, { estadoAnulacion: null }] }]
      : []),
    ...(query.estado === "por_recuperar"
      ? [{ AND: [noRecuperadaWhere(), { estadoAnulacion: null }] }]
      : []),
    ...(query.estado === "por_anular" ? [{ estadoAnulacion: "por_anular" }] : []),
    ...(query.estado === "anulada" ? [{ estadoAnulacion: "anulada" }] : []),
    ...(query.tecnicoId ? [{ tecnicoId: query.tecnicoId }] : []),
    ...(query.recuperadoPorId ? [{ recuperadoPorId: query.recuperadoPorId }] : []),
    ...(query.asignacion === "sin_asignar" ? [{ tecnicoId: null }] : []),
    ...(query.asignacion === "asignada" ? [{ tecnicoId: { not: null } }] : []),
    ...(query.q
      ? [
          {
            OR: [
              { orden: contains(query.q) },
              { cliente: contains(query.q) },
              { ciudad: contains(query.q) },
              { colonia: contains(query.q) },
              { direccion: contains(query.q) },
              { telefono: contains(query.q) },
              { comentario: contains(query.q) },
            ],
          },
        ]
      : []),
  ];

  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { AND: filters };
}

function buildOrderBy(sort: ListQuery["sort"], order: ListQuery["order"]) {
  switch (sort) {
    case "orden":
      return { orden: order } as const;
    case "cliente":
      return { cliente: order } as const;
    case "ciudad":
      return { ciudad: order } as const;
    default:
      return { createdAt: order } as const;
  }
}

export async function listOrdenes(query: ListQuery) {
  const where = buildWhere(query);
  const orderBy = buildOrderBy(query.sort, query.order);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await prisma.$transaction([
    prisma.orden.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      include: ordenInclude,
    }),
    prisma.orden.count({ where }),
  ]);

  return {
    items: items.map(serializeOrden),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function findOrden(idOrNumero: string) {
  const orden = await prisma.orden.findFirst({
    where: {
      OR: [{ id: idOrNumero }, { orden: idOrNumero }],
    },
    include: ordenInclude,
  });

  if (!orden) {
    throw notFound("Orden no encontrada");
  }

  return serializeOrden(orden);
}

export async function createOrden(input: OrdenCreateInput) {
  const orden = await prisma.orden.create({
    data: input,
    include: ordenInclude,
  });
  return serializeOrden(orden);
}

export async function updateOrden(
  idOrNumero: string,
  input: OrdenUpdateInput,
  actorId?: string | null,
) {
  const current = await findOrden(idOrNumero);
  const data: OrdenUpdateInput & { recuperadoPorId?: string | null } = { ...input };
  const acuseDelComentario =
    input.comentario !== undefined ? extraerAcuse(input.comentario) : null;

  if (input.comentario !== undefined) {
    const comentarioLimpio = comentarioSinAcuse(input.comentario);
    data.comentario = comentarioLimpio ? comentarioLimpio : null;
    const seraRecuperada = esOrdenRecuperada(data.comentario, acuseDelComentario ?? current.acuse);
    if (!seraRecuperada) {
      data.recuperadoPorId = null;
    } else if (actorId && (!esOrdenRecuperada(current.comentario, current.acuse) || !current.recuperadoPorId)) {
      data.recuperadoPorId = actorId;
    }
  }

  const orden = await prisma.$transaction(async (tx) => {
    await tx.orden.update({
      where: { id: current.id },
      data,
    });

    if (input.comentario !== undefined) {
      if (acuseDelComentario) {
        const campos = datosAcuse(acuseDelComentario);
        await tx.infoAcuseRecibido.upsert({
          where: { ordenId: current.id },
          create: { ordenId: current.id, ...campos },
          update: campos,
        });
      } else if (!esOrdenRecuperada(data.comentario)) {
        await tx.infoAcuseRecibido.deleteMany({ where: { ordenId: current.id } });
      }
    }

    return tx.orden.findUniqueOrThrow({
      where: { id: current.id },
      include: ordenInclude,
    });
  });

  return serializeOrden(orden);
}

export async function deleteOrden(idOrNumero: string) {
  const current = await findOrden(idOrNumero);
  await prisma.orden.delete({ where: { id: current.id } });
  return current;
}

export async function createOrdenesBulk(inputs: OrdenCreateInput[]) {
  const seen = new Set<string>();
  const uniqueInputs: OrdenCreateInput[] = [];
  const duplicadosEnLote: string[] = [];

  for (const item of inputs) {
    if (seen.has(item.orden)) {
      duplicadosEnLote.push(item.orden);
      continue;
    }
    seen.add(item.orden);
    uniqueInputs.push(item);
  }

  const numeros = uniqueInputs.map((item) => item.orden);
  const existentes = await prisma.orden.findMany({
    where: { orden: { in: numeros } },
    select: { orden: true },
  });
  const duplicados = new Set(
    existentes.map((item: { orden: string }) => item.orden),
  );
  const nuevos = uniqueInputs.filter((item) => !duplicados.has(item.orden));

  if (nuevos.length > 0) {
    await prisma.orden.createMany({ data: nuevos });
  }

  const insertados = nuevos.length
    ? await prisma.orden.findMany({
        where: {
          orden: { in: nuevos.map((item) => item.orden) },
        },
        orderBy: { createdAt: "desc" },
        include: ordenInclude,
      })
    : [];

  return {
    inserted: insertados.length,
    skipped: duplicados.size + duplicadosEnLote.length,
    duplicates: [...new Set([...duplicados, ...duplicadosEnLote])],
    items: insertados.map(serializeOrden),
  };
}
