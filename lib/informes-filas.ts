import { prisma } from "@/lib/db";
import { cargasVigentesPorPeriodo, filaDesdeRelaciones, type FilaInforme } from "@/lib/informes-tabla";
import type { InformeFilasQuery } from "@/lib/validators-informes";
import type { Prisma } from "@prisma/client";

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  const map = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

function whereFilas(
  cargaIds: string[],
  query: InformeFilasQuery,
): Prisma.InformeRecepcionFilaWhereInput {
  const and: Prisma.InformeRecepcionFilaWhereInput[] = [
    { cargaId: { in: cargaIds } },
  ];
  if (query.ciudad) {
    and.push({ datosRecepcion: { is: { ciudad: contains(query.ciudad) } } });
  }
  if (query.tipoEquipo) {
    and.push({ tipoEquipo: { is: { tipoEquipo: contains(query.tipoEquipo) } } });
  }
  if (query.codigoCliente) {
    and.push({
      datosCliente: { is: { codigoCliente: contains(query.codigoCliente) } },
    });
  }
  if (query.numeroOrden) {
    and.push({
      datosCliente: { is: { numeroOrden: contains(query.numeroOrden) } },
    });
  }
  if (query.empresa) {
    and.push({ datosRecepcion: { is: { empresa: contains(query.empresa) } } });
  }
  if (query.empresaEjecutora) {
    and.push({
      datosRecepcion: {
        is: { empresaEjecutora: contains(query.empresaEjecutora) },
      },
    });
  }
  if (query.q) {
    const q = contains(query.q);
    and.push({
      OR: [
        { fechaCliente: q },
        { n: q },
        { datosCliente: { is: { codigoCliente: q } } },
        { datosCliente: { is: { numeroOrden: q } } },
        { datosCliente: { is: { modelo: q } } },
        { datosCliente: { is: { contratoAnulado: q } } },
        { datosEquipo: { is: { serie: q } } },
        { datosEquipo: { is: { codigoBarra: q } } },
        { datosEquipo: { is: { tarjeta: q } } },
        { tipoEquipo: { is: { tipoEquipo: q } } },
        { tipoEquipo: { is: { identificador: q } } },
        { datosRecepcion: { is: { ciudad: q } } },
        { datosRecepcion: { is: { empresa: q } } },
        { datosRecepcion: { is: { empresaEjecutora: q } } },
        { datosRecepcion: { is: { tecnico: q } } },
      ],
    });
  }
  return { AND: and };
}

export interface InformeFilasResultado {
  filas: FilaInforme[];
  archivo: string | null;
  periodo: string | null;
  periodos: string[];
  opciones: {
    ciudades: string[];
    tiposEquipo: string[];
    empresas: string[];
    empresasEjecutoras: string[];
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listarFilasInforme(
  query: InformeFilasQuery,
): Promise<InformeFilasResultado> {
  const todas = await prisma.informeRecepcionCarga.findMany();
  const vigentes = cargasVigentesPorPeriodo(todas);
  const periodos = vigentes.map((carga) => carga.periodo);
  const recientes = [...vigentes].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const carga = query.periodo
    ? vigentes.find((item) => item.periodo === query.periodo)
    : recientes[0];
  const vacio = (): InformeFilasResultado => ({
    filas: [],
    archivo: carga?.archivo ?? null,
    periodo: carga?.periodo ?? query.periodo ?? null,
    periodos,
    opciones: {
      ciudades: [],
      tiposEquipo: [],
      empresas: [],
      empresasEjecutoras: [],
    },
    meta: { page: query.page, limit: query.limit, total: 0, totalPages: 1 },
  });

  if (!carga) return vacio();

  const opcionesRows = await prisma.informeRecepcionFila.findMany({
    where: { cargaId: carga.id },
    select: {
      tipoEquipo: { select: { tipoEquipo: true } },
      datosRecepcion: {
        select: { ciudad: true, empresa: true, empresaEjecutora: true },
      },
    },
  });

  const opciones = {
    ciudades: uniqueSorted(opcionesRows.map((row) => row.datosRecepcion?.ciudad)),
    tiposEquipo: uniqueSorted(opcionesRows.map((row) => row.tipoEquipo?.tipoEquipo)),
    empresas: uniqueSorted(opcionesRows.map((row) => row.datosRecepcion?.empresa)),
    empresasEjecutoras: uniqueSorted(
      opcionesRows.map((row) => row.datosRecepcion?.empresaEjecutora),
    ),
  };

  const where = whereFilas([carga.id], query);
  const total = await prisma.informeRecepcionFila.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, totalPages);
  const items = await prisma.informeRecepcionFila.findMany({
    where,
    include: {
      tipoEquipo: true,
      datosCliente: true,
      datosEquipo: true,
      datosRecepcion: true,
      equipoPendiente: true,
    },
    orderBy: { posicion: "asc" },
    skip: (page - 1) * query.limit,
    take: query.limit,
  });

  return {
    filas: items.map((item) =>
      filaDesdeRelaciones({
        n: item.n,
        fechaCliente: item.fechaCliente,
        tipoEquipo: item.tipoEquipo,
        datosCliente: item.datosCliente,
        datosEquipo: item.datosEquipo,
        datosRecepcion: item.datosRecepcion,
        equipoPendiente: item.equipoPendiente,
      }),
    ),
    archivo: carga.archivo,
    periodo: carga.periodo,
    periodos,
    opciones,
    meta: {
      page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}
