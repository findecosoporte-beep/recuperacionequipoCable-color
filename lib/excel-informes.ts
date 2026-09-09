import type { WorkSheet } from "xlsx";
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
  const normalized = normalizeHeader(col.label);
  if (normalized) ALIAS[normalized] = col.key;
}

function excelSerialAFecha(serial: number): string {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000;
  const date = new Date(utc);
  const dia = String(date.getUTCDate()).padStart(2, "0");
  const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${date.getUTCFullYear()}`;
}

function fechaComoEnExcel(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    const dia = String(value.getUTCDate()).padStart(2, "0");
    const mes = String(value.getUTCMonth() + 1).padStart(2, "0");
    return `${dia}/${mes}/${value.getUTCFullYear()}`;
  }
  if (typeof value === "number" && value >= 20_000 && value <= 80_000) {
    return excelSerialAFecha(value);
  }
  const texto = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(texto)) {
    const serial = Number(texto);
    if (serial >= 20_000 && serial <= 80_000) return excelSerialAFecha(serial);
  }
  return texto;
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return fechaComoEnExcel(value);
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

function valorCelda(value: unknown, key: string): string {
  if (key === "fechaCliente") return fechaComoEnExcel(value);
  return cellToString(value);
}

function mapHeader(header: string): string | null {
  const trimmed = header.trim();
  if (!trimmed) return null;
  if (trimmed === "#") return "n";
  const normalized = normalizeHeader(trimmed);
  if (!normalized) return null;
  if (ALIAS[normalized]) return ALIAS[normalized];
  if (
    normalized.includes("FECHA") &&
    (normalized.includes("CLIENTE") || normalized.includes("ENTREG"))
  ) {
    return "fechaCliente";
  }
  return null;
}

function contarEncabezados(row: unknown[]): number {
  return row.reduce<number>((total, cell) => {
    return mapHeader(cellToString(cell)) ? total + 1 : total;
  }, 0);
}

function mappearColumnas(headerRows: unknown[][]): Map<string, number> {
  const columns = new Map<string, number>();
  const width = headerRows.reduce((max, row) => Math.max(max, row.length), 0);
  for (let index = 0; index < width; index += 1) {
    for (let r = headerRows.length - 1; r >= 0; r -= 1) {
      const mapped = mapHeader(cellToString(headerRows[r]?.[index]));
      if (mapped && !columns.has(mapped)) {
        columns.set(mapped, index);
        break;
      }
    }
  }
  if (!columns.has("n")) columns.set("n", 0);
  if (!columns.has("fechaCliente")) columns.set("fechaCliente", 1);
  return columns;
}

function pareceFecha(value: unknown): boolean {
  if (value instanceof Date && Number.isFinite(value.getTime())) return true;
  if (typeof value === "number" && value >= 20_000 && value <= 80_000) return true;
  const texto = String(value ?? "").trim();
  if (!texto) return false;
  if (/^\d{1,2}[/.\\-]\d{1,2}[/.\\-]\d{2,4}$/.test(texto)) return true;
  if (/^\d{4}[/.\\-]\d{1,2}[/.\\-]\d{1,2}$/.test(texto)) return true;
  return /(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(texto);
}

function indiceColumnaFecha(
  rows: unknown[][],
  fromRow: number,
  mapped: number | undefined,
): number {
  const data = rows
    .slice(fromRow)
    .filter((row) => contarEncabezados(row) < 3)
    .slice(0, 50);
  const width = data.reduce((max, row) => Math.max(max, row.length), 0);

  function score(col: number): number {
    let hits = 0;
    let filled = 0;
    for (const row of data) {
      const value = row[col];
      if (value == null || value === "") continue;
      filled += 1;
      if (pareceFecha(value)) hits += 1;
    }
    return filled >= 3 ? hits / filled : 0;
  }

  const mappedScore = mapped == null ? 0 : score(mapped);
  if (mappedScore >= 0.3) return mapped;

  let best = mapped ?? 1;
  let bestScore = mappedScore;
  for (let col = 0; col < Math.min(width, 8); col += 1) {
    const current = score(col);
    if (current > bestScore) {
      bestScore = current;
      best = col;
    }
  }
  return bestScore >= 0.3 ? best : (mapped ?? 1);
}

function valorDeCelda(cell: { w?: string; t?: string; v?: unknown } | undefined): unknown {
  if (!cell) return "";
  const formatted = cell.w != null ? String(cell.w).trim() : "";
  if (formatted && formatted !== "########") return formatted;
  if (cell.t === "d") return cell.v;
  if (cell.v == null) return "";
  return cell.v;
}

function filasDeHoja(
  utils: {
    decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (addr: { r: number; c: number }) => string;
  },
  sheet: WorkSheet,
): unknown[][] {
  if (!sheet["!ref"]) return [];
  const range = utils.decode_range(sheet["!ref"]);
  const rows: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = utils.encode_cell({ r, c });
      row.push(valorDeCelda(sheet[addr]));
    }
    rows.push(row);
  }
  return rows;
}

export async function parseInformesExcel(buffer: ArrayBuffer): Promise<InformeExcelResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true,
    cellText: true,
  });
  if (workbook.SheetNames.length === 0) {
    throw new Error("El Excel no tiene hojas");
  }

  let rows: unknown[][] = [];
  let mejorHoja = -1;
  for (const name of workbook.SheetNames) {
    const candidatas = filasDeHoja(XLSX.utils, workbook.Sheets[name]);
    const score = candidatas.reduce(
      (max, row) => Math.max(max, contarEncabezados(row)),
      -1,
    );
    if (score > mejorHoja) {
      mejorHoja = score;
      rows = candidatas;
    }
  }

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

  const columns = mappearColumnas(rows.slice(0, headerIndex + 1));
  columns.set(
    "fechaCliente",
    indiceColumnaFecha(rows, headerIndex + 1, columns.get("fechaCliente")),
  );

  const filas: FilaInforme[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (contarEncabezados(row) >= 3) continue;
    const valores: FilaInforme = {};
    let tieneDato = false;
    for (const col of COLUMNAS) {
      if (col.key === "n") continue;
      const idx = columns.get(col.key);
      const value =
        idx == null || idx >= row.length ? "" : valorCelda(row[idx], col.key);
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
