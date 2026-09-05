import { prisma } from "@/lib/db";
import { limitesDiaUtc } from "@/lib/fecha";
import { etiquetaEmpresa, esEmpresaWhatsApp, telefonoWhatsApp1 } from "@/lib/whatsapp";
import { badRequest, notFound } from "@/lib/errors";

export function serializeAviso(aviso: {
  id: string;
  ordenId: string | null;
  numeroOrden: string;
  cliente: string;
  telefono: string;
  empresa: string;
  enviadoPor: { nombre: string } | null;
  createdAt: Date;
}) {
  return {
    id: aviso.id,
    ordenId: aviso.ordenId,
    numeroOrden: aviso.numeroOrden,
    cliente: aviso.cliente,
    telefono: aviso.telefono,
    empresa: esEmpresaWhatsApp(aviso.empresa) ? aviso.empresa : "isg",
    empresaLabel: esEmpresaWhatsApp(aviso.empresa)
      ? etiquetaEmpresa(aviso.empresa)
      : "ISG",
    enviadoPor: aviso.enviadoPor?.nombre ?? "Panel",
    createdAt: aviso.createdAt.toISOString(),
  };
}

export async function registrarAvisoWhatsApp(input: {
  ordenId: string;
  empresa: string;
  enviadoPorId?: string | null;
}) {
  if (!esEmpresaWhatsApp(input.empresa)) {
    throw badRequest("Elige si el cliente es ISG o Cable Color");
  }

  const orden = await prisma.orden.findUnique({
    where: { id: input.ordenId },
    select: {
      id: true,
      orden: true,
      cliente: true,
      telefono: true,
    },
  });
  if (!orden) {
    throw notFound("Orden no encontrada");
  }

  const telefono = telefonoWhatsApp1(orden.telefono);
  if (!telefono) {
    throw badRequest("La orden no tiene Teléfono 1 válido");
  }

  const aviso = await prisma.avisoWhatsApp.create({
    data: {
      ordenId: orden.id,
      numeroOrden: orden.orden,
      cliente: orden.cliente,
      telefono,
      empresa: input.empresa,
      enviadoPorId: input.enviadoPorId ?? null,
    },
    include: {
      enviadoPor: { select: { nombre: true } },
    },
  });

  return serializeAviso(aviso);
}

export async function listAvisosWhatsApp(query: { desde: string; hasta: string }) {
  const avisos = await prisma.avisoWhatsApp.findMany({
    where: {
      createdAt: {
        gte: limitesDiaUtc(query.desde),
        lte: limitesDiaUtc(query.hasta, true),
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      enviadoPor: { select: { nombre: true } },
    },
  });

  return avisos.map(serializeAviso);
}
