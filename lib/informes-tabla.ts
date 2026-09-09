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
