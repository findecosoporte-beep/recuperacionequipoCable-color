import { prisma } from "@/lib/db";
import { limitesDiaUtc } from "@/lib/fecha";

export function serializeSolicitudAnulacion(row: {
  id: string;
  ordenId: string | null;
  numeroOrden: string;
  cliente: string;
  ciudad: string;
  colonia: string;
  telefono: string;
  motivo: string;
  solicitadoPor: { nombre: string } | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    ordenId: row.ordenId,
    numeroOrden: row.numeroOrden,
    cliente: row.cliente,
    ciudad: row.ciudad,
    colonia: row.colonia,
    telefono: row.telefono,
    motivo: row.motivo,
    solicitadoPor: row.solicitadoPor?.nombre ?? "Técnico",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function registrarSolicitudAnulacion(input: {
  ordenId: string;
  numeroOrden: string;
  cliente: string;
  ciudad: string;
  colonia: string;
  telefono: string;
  motivo?: string | null;
  solicitadoPorId?: string | null;
}) {
  const row = await prisma.solicitudAnulacion.create({
    data: {
      ordenId: input.ordenId,
      numeroOrden: input.numeroOrden,
      cliente: input.cliente,
      ciudad: input.ciudad,
      colonia: input.colonia,
      telefono: input.telefono,
      motivo: input.motivo?.trim() || "Sin motivo",
      solicitadoPorId: input.solicitadoPorId ?? null,
    },
    include: {
      solicitadoPor: { select: { nombre: true } },
    },
  });
  return serializeSolicitudAnulacion(row);
}

export async function listSolicitudesAnulacion(query: { desde: string; hasta: string }) {
  const rows = await prisma.solicitudAnulacion.findMany({
    where: {
      createdAt: {
        gte: limitesDiaUtc(query.desde),
        lte: limitesDiaUtc(query.hasta, true),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      solicitadoPor: { select: { nombre: true } },
    },
  });
  return rows.map(serializeSolicitudAnulacion);
}
