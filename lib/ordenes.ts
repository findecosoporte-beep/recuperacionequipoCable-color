import { prisma } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { ListQuery, OrdenCreateInput, OrdenUpdateInput } from "@/lib/validators";

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

const recuperadaFiltro = {
  OR: [
    { comentario: contains("Recuperó equipo: sí") },
    { comentario: contains("Recuperó equipo: si") },
    { comentario: contains("Recupero equipo: sí") },
    { comentario: contains("Recupero equipo: si") },
    { comentario: contains("Equipos recuperados:") },
    { comentario: contains("Se recibe equipo") },
  ],
};

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
      ? [
          {
            AND: [
              { comentario: contains("Recuperar") },
              { NOT: recuperadaFiltro },
              { estadoAnulacion: null },
            ],
          },
        ]
      : []),
    ...(query.estado === "por_anular" ? [{ estadoAnulacion: "por_anular" }] : []),
    ...(query.estado === "anulada" ? [{ estadoAnulacion: "anulada" }] : []),
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
    }),
    prisma.orden.count({ where }),
  ]);

  return {
    items,
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
  });

  if (!orden) {
    throw notFound("Orden no encontrada");
  }

  return orden;
}

export async function createOrden(input: OrdenCreateInput) {
  return prisma.orden.create({ data: input });
}

export async function updateOrden(idOrNumero: string, input: OrdenUpdateInput) {
  const current = await findOrden(idOrNumero);
  return prisma.orden.update({
    where: { id: current.id },
    data: input,
  });
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
      })
    : [];

  return {
    inserted: insertados.length,
    skipped: duplicados.size + duplicadosEnLote.length,
    duplicates: [...new Set([...duplicados, ...duplicadosEnLote])],
    items: insertados,
  };
}
