export interface ColumnaInforme {
  key: string;
  label: string;
  width: string;
}

export interface GrupoInforme {
  label: string;
  cols: ColumnaInforme[];
}

export const FIJAS: ColumnaInforme[] = [
  { key: "n", label: "#", width: "2.5rem" },
  { key: "fechaCliente", label: "FECHA QUE ENTREGO EL CLIENTE", width: "7.5rem" },
];

export const GRUPOS: GrupoInforme[] = [
  {
    label: "TIPO DE EQUIPO",
    cols: [
      { key: "cajaTvAnaloga", label: "CAJA TV ANALOGA", width: "5.5rem" },
      { key: "dtt", label: "DTT", width: "3.5rem" },
      { key: "dth", label: "DTH", width: "3.5rem" },
      { key: "modem", label: "MODEM", width: "4.5rem" },
      { key: "ont", label: "ONT", width: "3.5rem" },
      { key: "router", label: "ROUTER", width: "4.5rem" },
      { key: "otros", label: "OTROS", width: "4rem" },
      { key: "tipoEquipo", label: "TIPO DE EQUIPO", width: "7rem" },
      { key: "identificador", label: "IDENTIFICADOR", width: "8rem" },
    ],
  },
  {
    label: "DATOS DEL CLIENTE",
    cols: [
      { key: "modelo", label: "MODELO", width: "6rem" },
      { key: "codigoCliente", label: "Código de Cliente", width: "7rem" },
      { key: "contratoAnulado", label: "Contrato Anulado", width: "7rem" },
      { key: "numeroOrden", label: "Número Orden", width: "6.5rem" },
    ],
  },
  {
    label: "DATOS DEL EQUIPO",
    cols: [
      { key: "serie", label: "Serie", width: "7rem" },
      { key: "codigoBarra", label: "Código Barra", width: "7rem" },
      { key: "tarjeta", label: "Tarjeta", width: "6rem" },
    ],
  },
  {
    label: "DATOS DE RECEPCION DE EQUIPO",
    cols: [
      {
        key: "tecnico",
        label: "NOMBRE DE TÉCNICO DE RECUPERACIÓN DE EQUIPOS",
        width: "11rem",
      },
      { key: "empresaEjecutora", label: "EMPRESA EJECUTORA", width: "8rem" },
      { key: "procedencia", label: "PROCEDENCIA", width: "7rem" },
      { key: "ciudad", label: "CIUDAD", width: "6rem" },
      { key: "region", label: "REGIÓN", width: "6rem" },
      { key: "empresa", label: "EMPRESA", width: "6rem" },
      { key: "supervisor", label: "SUPERVISOR", width: "8rem" },
    ],
  },
  {
    label: "EQUIPO PENDIENTE",
    cols: [
      { key: "cajaTvAnalogaP", label: "CAJA TV ANALOGA_P", width: "6rem" },
      { key: "dttP", label: "DTT_P", width: "4rem" },
      { key: "dthP", label: "DTH_P", width: "4rem" },
      { key: "modemP", label: "MODEM_P", width: "5rem" },
      { key: "ontP", label: "ONT_P", width: "4rem" },
      { key: "routerP", label: "ROUTER_P", width: "5rem" },
      { key: "otrosP", label: "OTROS_P", width: "4.5rem" },
      { key: "totalP", label: "TOTAL_P", width: "4.5rem" },
    ],
  },
];

export const COLUMNAS: ColumnaInforme[] = [
  ...FIJAS,
  ...GRUPOS.flatMap((grupo) => grupo.cols),
];

export type FilaInforme = Record<string, string>;

export interface InformeRecepcionCargaResumen {
  periodo: string;
  archivo: string;
  filas: number;
  createdAt: string;
}

export interface InformeRecepcionActual {
  archivo: string | null;
  createdAt: string | null;
  total: number;
  filas: FilaInforme[];
  periodo: string | null;
  periodos: string[];
  cargas: InformeRecepcionCargaResumen[];
  periodoGuardado?: string | null;
  filasDelPeriodo?: number;
}

export const CLAVES_INFORME = COLUMNAS.map((col) => col.key);

const MAX_CELDA = 500;

export function sanitizarFilasInforme(raw: unknown[]): FilaInforme[] {
  return raw.map((item, index) => {
    const source =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    const fila: FilaInforme = {};
    for (const key of CLAVES_INFORME) {
      const value = source[key];
      fila[key] =
        value == null ? "" : String(value).trim().slice(0, MAX_CELDA);
    }
    if (!fila.n) fila.n = String(index + 1);
    return fila;
  });
}

export function concatenarFilasInforme(grupos: FilaInforme[][]): FilaInforme[] {
  const filas: FilaInforme[] = [];
  for (const grupo of grupos) {
    for (const fila of grupo) {
      filas.push({ ...fila, n: String(filas.length + 1) });
    }
  }
  return filas;
}

export function cargasVigentesPorPeriodo<
  T extends { periodo: string; createdAt: Date },
>(cargas: T[]): T[] {
  const latest = new Map<string, T>();
  const ordenadas = cargas
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const carga of ordenadas) {
    if (!latest.has(carga.periodo)) latest.set(carga.periodo, carga);
  }
  return [...latest.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
}
