import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { esPeriodoValido, periodoEnZona } from "@/lib/fecha";
import {
  cargasVigentesPorPeriodo,
  concatenarFilasInforme,
  sanitizarFilasInforme,
  type FilaInforme,
  type InformeRecepcionActual,
} from "@/lib/informes-tabla";
import { badRequest } from "@/lib/errors";

function filasDeCarga(items: Array<{ datos: Prisma.JsonValue; posicion: number }>): FilaInforme[] {
  return items
    .slice()
    .sort((a, b) => a.posicion - b.posicion)
    .map((item) => sanitizarFilasInforme([item.datos])[0]);
}

function respuestaVacia(
  periodo: string | null,
  extras?: Partial<InformeRecepcionActual>,
): InformeRecepcionActual {
  return {
    archivo: null,
    createdAt: null,
    total: 0,
    filas: [],
    periodo,
    periodos: [],
    cargas: [],
    ...extras,
  };
}

export async function obtenerInformeRecepcion(
  periodo?: string | null,
): Promise<InformeRecepcionActual> {
  if (periodo && !esPeriodoValido(periodo)) {
    throw badRequest("periodo inválido");
  }

  const todas = await prisma.informeRecepcionCarga.findMany({
    include: { items: true },
  });
  const vigentes = cargasVigentesPorPeriodo(todas);
  const periodos = vigentes.map((carga) => carga.periodo);
  const cargas = vigentes.map((carga) => ({
    periodo: carga.periodo,
    archivo: carga.archivo,
    filas: carga.items.length,
    createdAt: carga.createdAt.toISOString(),
  }));

  const seleccion = periodo
    ? vigentes.filter((carga) => carga.periodo === periodo)
    : vigentes;

  if (seleccion.length === 0) {
    return respuestaVacia(periodo ?? null, { periodos, cargas });
  }

  const filas = concatenarFilasInforme(seleccion.map((carga) => filasDeCarga(carga.items)));
  const reciente = seleccion.reduce((a, b) =>
    a.createdAt.getTime() >= b.createdAt.getTime() ? a : b,
  );

  return {
    archivo: reciente.archivo,
    createdAt: reciente.createdAt.toISOString(),
    total: filas.length,
    filas,
    periodo: periodo ?? null,
    periodos,
    cargas,
  };
}

export async function guardarInformeRecepcion(input: {
  archivo: string;
  filas: unknown[];
  periodo?: string | null;
  subidoPorId?: string | null;
}): Promise<InformeRecepcionActual> {
  const periodo = input.periodo?.trim() || periodoEnZona();
  if (!esPeriodoValido(periodo)) {
    throw badRequest("periodo inválido");
  }

  const filas = sanitizarFilasInforme(input.filas);
  await prisma.$transaction(async (tx) => {
    await tx.informeRecepcionCarga.deleteMany({ where: { periodo } });
    const creada = await tx.informeRecepcionCarga.create({
      data: {
        archivo: input.archivo.slice(0, 180),
        filas: filas.length,
        periodo,
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
  });

  const actual = await obtenerInformeRecepcion();
  return {
    ...actual,
    periodoGuardado: periodo,
    filasDelPeriodo: filas.length,
  };
}
