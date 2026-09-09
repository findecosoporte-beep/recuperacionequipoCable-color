import {
  COLUMNAS,
  FIJAS,
  GRUPOS,
  type FilaInforme,
} from "@/lib/informes-tabla";

export interface InformeExcelResult {
  filas: FilaInforme[];
}

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/Ñ/g, "N")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS: Record<string, string> = {
  N: "n",
  NUM: "n",
  NUMERO: "n",
  FECHA: "fechaCliente",
  "FECHA QUE ENTREGO EL CLIENTE": "fechaCliente",
  "CAJAS QUE ENTREGO EL CLIENTE": "fechaCliente",
  "CAJA TV ANALOGA": "cajaTvAnaloga",
  "CAJAS TV ANTERIORES": "cajaTvAnaloga",
  DTT: "dtt",
  DIT: "dtt",
  DTH: "dth",
  OTT: "dth",
  MODEM: "modem",
  ONT: "ont",
  ONU: "ont",
  "ON U": "ont",
  ROUTER: "router",
  OTROS: "otros",
  "TIPO DE EQUIPO": "tipoEquipo",
  IDENTIFICADOR: "identificador",
  "ID DE CONTRATO BD": "identificador",
  MODELO: "modelo",
  "CODIGO DE CLIENTE": "codigoCliente",
  "CONTRATO ANULADO": "contratoAnulado",
  "NUMERO ORDEN": "numeroOrden",
  SERIE: "serie",
  "CODIGO BARRA": "codigoBarra",
  "CODIGO MAC": "codigoBarra",
  TARJETA: "tarjeta",
  "NOMBRE DE TECNICO DE RECUPERACION DE EQUIPOS": "tecnico",
  "EMPRESA EJECUTORA": "empresaEjecutora",
  PROCEDENCIA: "procedencia",
  CIUDAD: "ciudad",
  REGION: "region",
  EMPRESA: "empresa",
  SUPERVISOR: "supervisor",
  "CAJA TV ANALOGA P": "cajaTvAnalogaP",
  "CAJAS TV ANTERIORES P": "cajaTvAnalogaP",
  "DTT P": "dttP",
  "EKT P": "dttP",
  "DTH P": "dthP",
  "OTT P": "dthP",
  "MODEM P": "modemP",
  "ONT P": "ontP",
  "ONU P": "ontP",
  "ROUTER P": "routerP",
  "OTROS P": "otrosP",
  "TOTAL P": "totalP",
};

for (const col of COLUMNAS) {
  ALIAS[normalizeHeader(col.label)] = col.key;
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toLocaleDateString("es-HN");
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) && Math.abs(value) < 1e15) {
      const rounded = Math.round(value);
      if (Math.abs(value - rounded) < 1e-6) return String(rounded);
    }
    return String(value);
  }
  return String(value).trim();
}

function mapHeader(header: string): string | null {
  return ALIAS[normalizeHeader(header)] ?? null;
}

function contarEncabezados(row: unknown[]): number {
  return row.reduce<number>((total, cell) => {
    return mapHeader(cellToString(cell)) ? total + 1 : total;
  }, 0);
}

export async function parseInformesExcel(buffer: ArrayBuffer): Promise<InformeExcelResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    raw: false,
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El Excel no tiene hojas");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error("El archivo está vacío");
  }

  let headerIndex = 0;
  let mejor = -1;
  rows.forEach((row, index) => {
    const coincidencias = contarEncabezados(row);
    if (coincidencias > mejor) {
      mejor = coincidencias;
      headerIndex = index;
    }
  });

  if (mejor < 3) {
    throw new Error(
      "No se reconocieron las columnas del control de recepción. Usa la plantilla o un Excel con esos encabezados.",
    );
  }

  const columns = new Map<string, number>();
  rows[headerIndex].forEach((cell, index) => {
    const mapped = mapHeader(cellToString(cell));
    if (mapped && !columns.has(mapped)) {
      columns.set(mapped, index);
    }
  });

  const filas: FilaInforme[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const valores: FilaInforme = {};
    let tieneDato = false;
    for (const col of COLUMNAS) {
      if (col.key === "n") continue;
      const idx = columns.get(col.key);
      const value = idx == null || idx >= row.length ? "" : cellToString(row[idx]);
      valores[col.key] = value;
      if (value) tieneDato = true;
    }
    if (!tieneDato) continue;
    const numero = columns.has("n")
      ? cellToString(row[columns.get("n") as number])
      : "";
    valores.n = numero || String(filas.length + 1);
    filas.push(valores);
  }

  if (filas.length === 0) {
    throw new Error("No se encontró ninguna fila con datos");
  }

  return { filas };
}

export function filasInformeAExcel(filas: FilaInforme[] = []): unknown[][] {
  const grupoRow: string[] = [...FIJAS.map((col) => col.label)];
  const detalleRow: string[] = [...FIJAS.map(() => "")];
  for (const grupo of GRUPOS) {
    grupoRow.push(grupo.label);
    detalleRow.push(grupo.cols[0]?.label ?? "");
    for (let i = 1; i < grupo.cols.length; i += 1) {
      grupoRow.push("");
      detalleRow.push(grupo.cols[i].label);
    }
  }

  const dataRows = filas.map((fila) =>
    COLUMNAS.map((col) => fila[col.key] ?? ""),
  );
  return [grupoRow, detalleRow, ...dataRows];
}

function mergesInformeExcel() {
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
  ];
  let colIndex = FIJAS.length;
  for (const grupo of GRUPOS) {
    merges.push({
      s: { r: 0, c: colIndex },
      e: { r: 0, c: colIndex + grupo.cols.length - 1 },
    });
    colIndex += grupo.cols.length;
  }
  return merges;
}

async function descargarLibroInforme(filas: FilaInforme[], filename: string) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(filasInformeAExcel(filas));
  sheet["!merges"] = mergesInformeExcel();
  XLSX.utils.book_append_sheet(workbook, sheet, "Recepcion");
  XLSX.writeFile(workbook, filename);
}

export async function downloadPlantillaInformes(): Promise<void> {
  await descargarLibroInforme([], "plantilla-control-recepcion.xlsx");
}

export async function downloadInformeExcel(
  filas: FilaInforme[],
  filename: string,
): Promise<void> {
  const safe = filename.replace(/[\\/:*?"<>|]+/g, "-").trim() || "informe.xlsx";
  const withExt = /\.xlsx?$/i.test(safe) ? safe : `${safe}.xlsx`;
  await descargarLibroInforme(filas, withExt);
}
