import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sanitizarFilasInforme, type InformeRecepcionActual } from "@/lib/informes-tabla";

function serializeCarga(carga: {
  archivo: string;
  createdAt: Date;
  items: Array<{ datos: Prisma.JsonValue; posicion: number }>;
}): InformeRecepcionActual {
  const filas = carga.items
    .slice()
    .sort((a, b) => a.posicion - b.posicion)
    .map((item) => sanitizarFilasInforme([item.datos])[0]);
  return {
    archivo: carga.archivo,
    createdAt: carga.createdAt.toISOString(),
    total: filas.length,
    filas,
  };
}

export async function obtenerInformeRecepcion(): Promise<InformeRecepcionActual> {
  const carga = await prisma.informeRecepcionCarga.findFirst({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  if (!carga) {
    return { archivo: null, createdAt: null, total: 0, filas: [] };
  }
  return serializeCarga(carga);
}

export async function guardarInformeRecepcion(input: {
  archivo: string;
  filas: unknown[];
  subidoPorId?: string | null;
}): Promise<InformeRecepcionActual> {
  const filas = sanitizarFilasInforme(input.filas);
  const carga = await prisma.$transaction(async (tx) => {
    const creada = await tx.informeRecepcionCarga.create({
      data: {
        archivo: input.archivo.slice(0, 180),
        filas: filas.length,
        subidoPorId: input.subidoPorId ?? null,
      },
    });
    await tx.informeRecepcionFila.createMany({
      data: filas.map((datos, posicion) => ({
        id: randomUUID(),
        cargaId: creada.id,
        posicion,
        datos: datos as Prisma.InputJsonValue,
      })),
    });
    return tx.informeRecepcionCarga.findUniqueOrThrow({
      where: { id: creada.id },
      include: { items: true },
    });
  });
  return serializeCarga(carga);
}
