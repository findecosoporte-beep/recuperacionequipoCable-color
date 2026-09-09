import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { esPeriodoValido, periodoEnZona } from "@/lib/fecha";
import {
  cargasVigentesPorPeriodo,
  concatenarFilasInforme,
  datosClienteDeFila,
  datosEquipoDeFila,
  datosRecepcionDeFila,
  equipoPendienteDeFila,
  filaDesdeRelaciones,
  sanitizarFilasInforme,
  tipoEquipoDeFila,
  type FilaInforme,
  type InformeDatosClienteCampos,
  type InformeDatosEquipoCampos,
  type InformeDatosRecepcionCampos,
  type InformeEquipoPendienteCampos,
  type InformeRecepcionActual,
  type InformeTipoEquipoCampos,
} from "@/lib/informes-tabla";

const INCLUDE_FILAS = {
  items: {
    include: {
      tipoEquipo: true,
      datosCliente: true,
      datosEquipo: true,
      datosRecepcion: true,
      equipoPendiente: true,
    },
  },
} as const;

type FilaRelacionada = {
  posicion: number;
  n: string;
  fechaCliente: string;
  tipoEquipo: InformeTipoEquipoCampos | null;
  datosCliente: InformeDatosClienteCampos | null;
  datosEquipo: InformeDatosEquipoCampos | null;
  datosRecepcion: InformeDatosRecepcionCampos | null;
  equipoPendiente: InformeEquipoPendienteCampos | null;
};

type CargaConFilas = {
  archivo: string;
  periodo: string;
  createdAt: Date;
  items: FilaRelacionada[];
};

async function createManyInChunks<T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  size = 400,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
  }
}

function filasDeCarga(carga: CargaConFilas): FilaInforme[] {
  return carga.items
    .slice()
    .sort((a, b) => a.posicion - b.posicion)
    .map((item) =>
      filaDesdeRelaciones({
        n: item.n,
        fechaCliente: item.fechaCliente,
        tipoEquipo: item.tipoEquipo,
        datosCliente: item.datosCliente,
        datosEquipo: item.datosEquipo,
        datosRecepcion: item.datosRecepcion,
        equipoPendiente: item.equipoPendiente,
      }),
    );
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
    include: INCLUDE_FILAS,
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

  const filas = concatenarFilasInforme(seleccion.map((carga) => filasDeCarga(carga)));
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
  const registros = filas.map((fila, posicion) => ({
    id: randomUUID(),
    posicion,
    fila,
  }));

  await prisma.$transaction(
    async (tx) => {
      await tx.informeRecepcionCarga.deleteMany({ where: { periodo } });
      const creada = await tx.informeRecepcionCarga.create({
        data: {
          archivo: input.archivo.slice(0, 180),
          filas: filas.length,
          periodo,
          subidoPorId: input.subidoPorId ?? null,
        },
      });

      await createManyInChunks(
        registros.map((item) => ({
          id: item.id,
          cargaId: creada.id,
          posicion: item.posicion,
          n: item.fila.n,
          fechaCliente: item.fila.fechaCliente,
        })),
        (chunk) => tx.informeRecepcionFila.createMany({ data: chunk }),
      );

      await createManyInChunks(
        registros.map((item) => ({
          id: item.id,
          filaId: item.id,
          ...tipoEquipoDeFila(item.fila),
        })),
        (chunk) => tx.informeRecepcionTipoEquipo.createMany({ data: chunk }),
      );

      await createManyInChunks(
        registros.map((item) => ({
          id: `${item.id}-c`,
          filaId: item.id,
          ...datosClienteDeFila(item.fila),
        })),
        (chunk) => tx.informeRecepcionDatosCliente.createMany({ data: chunk }),
      );

      await createManyInChunks(
        registros.map((item) => ({
          id: `${item.id}-e`,
          filaId: item.id,
          ...datosEquipoDeFila(item.fila),
        })),
        (chunk) => tx.informeRecepcionDatosEquipo.createMany({ data: chunk }),
      );

      await createManyInChunks(
        registros.map((item) => ({
          id: `${item.id}-r`,
          filaId: item.id,
          ...datosRecepcionDeFila(item.fila),
        })),
        (chunk) => tx.informeRecepcionDatosRecepcion.createMany({ data: chunk }),
      );

      await createManyInChunks(
        registros.map((item) => ({
          id: `${item.id}-p`,
          filaId: item.id,
          ...equipoPendienteDeFila(item.fila),
        })),
        (chunk) => tx.informeRecepcionEquipoPendiente.createMany({ data: chunk }),
      );
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  const actual = await obtenerInformeRecepcion();
  return {
    ...actual,
    periodoGuardado: periodo,
    filasDelPeriodo: filas.length,
  };
}
