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

export const COLUMNAS_RESUMEN_PENDIENTE = [
  { key: "cajaTvAnalogaP", label: "CAJAS TV ANTERIORES_P" },
  { key: "dthP", label: "OTT_P" },
  { key: "dttP", label: "EKT_P" },
  { key: "modemP", label: "MODEM_P" },
  { key: "ontP", label: "ONU_P" },
  { key: "routerP", label: "ROUTER_P" },
  { key: "otrosP", label: "OTROS_P" },
  { key: "totalP", label: "TOTAL_P" },
] as const;

export type ClaveResumenPendiente = (typeof COLUMNAS_RESUMEN_PENDIENTE)[number]["key"];

export type InformeResumenPendiente = Record<ClaveResumenPendiente, string>;

export interface InformeRecepcionCargaResumen {
  periodo: string;
  archivo: string;
  filas: number;
  createdAt: string;
  usuario: string | null;
  pendiente: InformeResumenPendiente;
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

function celda(fila: FilaInforme, key: string): string {
  return fila[key] ?? "";
}

export interface InformeTipoEquipoCampos {
  cajaTvAnaloga: string;
  dtt: string;
  dth: string;
  modem: string;
  ont: string;
  router: string;
  otros: string;
  tipoEquipo: string;
  identificador: string;
}

export interface InformeDatosClienteCampos {
  modelo: string;
  codigoCliente: string;
  contratoAnulado: string;
  numeroOrden: string;
}

export interface InformeDatosEquipoCampos {
  serie: string;
  codigoBarra: string;
  tarjeta: string;
}

export interface InformeDatosRecepcionCampos {
  tecnico: string;
  empresaEjecutora: string;
  procedencia: string;
  ciudad: string;
  region: string;
  empresa: string;
  supervisor: string;
}

export interface InformeEquipoPendienteCampos {
  cajaTvAnalogaP: string;
  dttP: string;
  dthP: string;
  modemP: string;
  ontP: string;
  routerP: string;
  otrosP: string;
  totalP: string;
}

export function parseNumeroPendiente(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function resumenPendienteDeItems(
  items: Array<Partial<InformeEquipoPendienteCampos>>,
): InformeResumenPendiente {
  const sums: Record<ClaveResumenPendiente, number> = {
    cajaTvAnalogaP: 0,
    dthP: 0,
    dttP: 0,
    modemP: 0,
    ontP: 0,
    routerP: 0,
    otrosP: 0,
    totalP: 0,
  };
  const has: Record<ClaveResumenPendiente, boolean> = {
    cajaTvAnalogaP: false,
    dthP: false,
    dttP: false,
    modemP: false,
    ontP: false,
    routerP: false,
    otrosP: false,
    totalP: false,
  };
  for (const item of items) {
    for (const col of COLUMNAS_RESUMEN_PENDIENTE) {
      const n = parseNumeroPendiente(item[col.key]);
      if (n == null) continue;
      has[col.key] = true;
      sums[col.key] += n;
    }
  }
  const resumen = {} as InformeResumenPendiente;
  for (const col of COLUMNAS_RESUMEN_PENDIENTE) {
    resumen[col.key] = has[col.key] ? String(sums[col.key]) : "";
  }
  return resumen;
}

export function tipoEquipoDeFila(fila: FilaInforme): InformeTipoEquipoCampos {
  return {
    cajaTvAnaloga: celda(fila, "cajaTvAnaloga"),
    dtt: celda(fila, "dtt"),
    dth: celda(fila, "dth"),
    modem: celda(fila, "modem"),
    ont: celda(fila, "ont"),
    router: celda(fila, "router"),
    otros: celda(fila, "otros"),
    tipoEquipo: celda(fila, "tipoEquipo"),
    identificador: celda(fila, "identificador"),
  };
}

export function datosClienteDeFila(fila: FilaInforme): InformeDatosClienteCampos {
  return {
    modelo: celda(fila, "modelo"),
    codigoCliente: celda(fila, "codigoCliente"),
    contratoAnulado: celda(fila, "contratoAnulado"),
    numeroOrden: celda(fila, "numeroOrden"),
  };
}

export function datosEquipoDeFila(fila: FilaInforme): InformeDatosEquipoCampos {
  return {
    serie: celda(fila, "serie"),
    codigoBarra: celda(fila, "codigoBarra"),
    tarjeta: celda(fila, "tarjeta"),
  };
}

export function datosRecepcionDeFila(fila: FilaInforme): InformeDatosRecepcionCampos {
  return {
    tecnico: celda(fila, "tecnico"),
    empresaEjecutora: celda(fila, "empresaEjecutora"),
    procedencia: celda(fila, "procedencia"),
    ciudad: celda(fila, "ciudad"),
    region: celda(fila, "region"),
    empresa: celda(fila, "empresa"),
    supervisor: celda(fila, "supervisor"),
  };
}

export function equipoPendienteDeFila(fila: FilaInforme): InformeEquipoPendienteCampos {
  return {
    cajaTvAnalogaP: celda(fila, "cajaTvAnalogaP"),
    dttP: celda(fila, "dttP"),
    dthP: celda(fila, "dthP"),
    modemP: celda(fila, "modemP"),
    ontP: celda(fila, "ontP"),
    routerP: celda(fila, "routerP"),
    otrosP: celda(fila, "otrosP"),
    totalP: celda(fila, "totalP"),
  };
}

export function filaDesdeRelaciones(input: {
  n: string;
  fechaCliente: string;
  tipoEquipo?: Partial<InformeTipoEquipoCampos> | null;
  datosCliente?: Partial<InformeDatosClienteCampos> | null;
  datosEquipo?: Partial<InformeDatosEquipoCampos> | null;
  datosRecepcion?: Partial<InformeDatosRecepcionCampos> | null;
  equipoPendiente?: Partial<InformeEquipoPendienteCampos> | null;
}): FilaInforme {
  const tipo = input.tipoEquipo ?? {};
  const cliente = input.datosCliente ?? {};
  const equipo = input.datosEquipo ?? {};
  const recepcion = input.datosRecepcion ?? {};
  const pendiente = input.equipoPendiente ?? {};
  return {
    n: input.n,
    fechaCliente: input.fechaCliente,
    cajaTvAnaloga: tipo.cajaTvAnaloga ?? "",
    dtt: tipo.dtt ?? "",
    dth: tipo.dth ?? "",
    modem: tipo.modem ?? "",
    ont: tipo.ont ?? "",
    router: tipo.router ?? "",
    otros: tipo.otros ?? "",
    tipoEquipo: tipo.tipoEquipo ?? "",
    identificador: tipo.identificador ?? "",
    modelo: cliente.modelo ?? "",
    codigoCliente: cliente.codigoCliente ?? "",
    contratoAnulado: cliente.contratoAnulado ?? "",
    numeroOrden: cliente.numeroOrden ?? "",
    serie: equipo.serie ?? "",
    codigoBarra: equipo.codigoBarra ?? "",
    tarjeta: equipo.tarjeta ?? "",
    tecnico: recepcion.tecnico ?? "",
    empresaEjecutora: recepcion.empresaEjecutora ?? "",
    procedencia: recepcion.procedencia ?? "",
    ciudad: recepcion.ciudad ?? "",
    region: recepcion.region ?? "",
    empresa: recepcion.empresa ?? "",
    supervisor: recepcion.supervisor ?? "",
    cajaTvAnalogaP: pendiente.cajaTvAnalogaP ?? "",
    dttP: pendiente.dttP ?? "",
    dthP: pendiente.dthP ?? "",
    modemP: pendiente.modemP ?? "",
    ontP: pendiente.ontP ?? "",
    routerP: pendiente.routerP ?? "",
    otrosP: pendiente.otrosP ?? "",
    totalP: pendiente.totalP ?? "",
  };
}
