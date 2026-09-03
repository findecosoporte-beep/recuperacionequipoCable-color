import { prisma } from "@/lib/db";
import { acusePublico } from "@/lib/acuse";
import type { AcuseListQuery } from "@/lib/validators";

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export async function listAcuses(query: AcuseListQuery) {
  const search = query.q?.trim();
  const where = search
    ? {
        OR: [
          { cliente: contains(search) },
          { contrato: contains(search) },
          { nombreFirma: contains(search) },
          { modemOnu: contains(search) },
          { router: contains(search) },
          { equipoDigital: contains(search) },
          { fecha: contains(search) },
          { orden: { orden: contains(search) } },
          { orden: { cliente: contains(search) } },
          { orden: { ciudad: contains(search) } },
          { orden: { colonia: contains(search) } },
        ],
      }
    : {};

  const skip = (query.page - 1) * query.limit;
  const [rows, total] = await prisma.$transaction([
    prisma.infoAcuseRecibido.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: query.limit,
      include: {
        orden: {
          select: {
            orden: true,
            ciudad: true,
            colonia: true,
            telefono: true,
          },
        },
      },
    }),
    prisma.infoAcuseRecibido.count({ where }),
  ]);

  return {
    items: rows.map((row) => {
      const acuse = acusePublico(row);
      return {
        id: row.id,
        ordenId: row.ordenId,
        numeroOrden: row.orden.orden,
        cliente: acuse?.cliente ?? row.cliente,
        contrato: acuse?.contrato ?? row.contrato,
        fecha: acuse?.fecha ?? row.fecha,
        modemOnu: acuse?.modemOnu ?? row.modemOnu,
        router: acuse?.router ?? row.router,
        equipoDigital: acuse?.equipoDigital ?? row.equipoDigital,
        accesorios: acuse?.accesorios ?? {},
        nombreFirma: acuse?.nombreFirma ?? row.nombreFirma,
        ciudad: row.orden.ciudad,
        colonia: row.orden.colonia,
        telefono: row.orden.telefono,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}
