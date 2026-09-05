import type { Prisma } from "@prisma/client";
import { acusePublico } from "@/lib/acuse";
import { prisma } from "@/lib/db";
import { limitesDiaUtc } from "@/lib/fecha";
import { recuperadaFiltro } from "@/lib/ordenes";
import { filaDeOrden, resumenReporte, type FilaReporte, type TipoReporte } from "@/lib/reportes";

const LIMITE_REPORTE = 2000;

function contiene(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function rangoFecha(desde?: string, hasta?: string) {
  const gte = desde ? limitesDiaUtc(desde) : undefined;
  const lte = hasta ? limitesDiaUtc(hasta, true) : undefined;
  if (!gte && !lte) return null;
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}

export async function listReporte(query: {
  tipo: TipoReporte;
  desde?: string;
  hasta?: string;
  ciudad?: string;
  q?: string;
}): Promise<{
  tipo: TipoReporte;
  desde?: string;
  hasta?: string;
  total: number;
  truncated: boolean;
  items: FilaReporte[];
  resumen: ReturnType<typeof resumenReporte>;
}> {
  const rango = rangoFecha(query.desde, query.hasta);
  const filtros: Prisma.OrdenWhereInput[] = [
    query.tipo === "recuperadas"
      ? { AND: [recuperadaFiltro, { estadoAnulacion: null }] }
      : { estadoAnulacion: "por_anular" },
    ...(query.ciudad ? [{ ciudad: contiene(query.ciudad) }] : []),
    ...(query.q
      ? [
          {
            OR: [
              { orden: contiene(query.q) },
              { cliente: contiene(query.q) },
              { ciudad: contiene(query.q) },
              { colonia: contiene(query.q) },
              { telefono: contiene(query.q) },
              { motivoAnulacion: contiene(query.q) },
            ],
          },
        ]
      : []),
  ];

  if (rango) {
    if (query.tipo === "recuperadas") {
      filtros.push({
        OR: [{ acuse: { is: { updatedAt: rango } } }, { AND: [{ acuse: { is: null } }, { updatedAt: rango }] }],
      });
    } else {
      filtros.push({ updatedAt: rango });
    }
  }

  const where = { AND: filtros };
  const ordenes = await prisma.orden.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: LIMITE_REPORTE,
    include: {
      tecnico: { select: { id: true, nombre: true, email: true, activo: true } },
      acuse: true,
      recuperadoPor: { select: { nombre: true } },
    },
  });

  const items = ordenes.map((orden) =>
    filaDeOrden({
      id: orden.id,
      orden: orden.orden,
      cliente: orden.cliente,
      ciudad: orden.ciudad,
      colonia: orden.colonia,
      direccion: orden.direccion,
      telefono: orden.telefono,
      comentario: orden.comentario,
      motivoAnulacion: orden.motivoAnulacion,
      acuse: acusePublico(orden.acuse),
      recuperadaEn: orden.acuse?.updatedAt?.toISOString() ?? orden.updatedAt.toISOString(),
      updatedAt: orden.updatedAt.toISOString(),
      tecnico: orden.tecnico,
      recuperadoPor: orden.recuperadoPor,
    }),
  );

  return {
    tipo: query.tipo,
    desde: query.desde,
    hasta: query.hasta,
    total: items.length,
    truncated: ordenes.length === LIMITE_REPORTE,
    items,
    resumen: resumenReporte(items),
  };
}
