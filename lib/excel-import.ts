import type { OrdenCreateInput } from "@/lib/validators";

export interface ExcelParseResult {
  ordenes: OrdenCreateInput[];
  avisos: string[];
  omitidas: number;
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

function mapHeader(header: string): keyof OrdenCreateInput | "nombre" | null {
  if (
    header === "NUM" ||
    header === "NUMERO" ||
    header === "N" ||
    header === "ORDEN" ||
    header === "NO ORDEN" ||
    header === "NRO ORDEN" ||
    header === "NUMERO ORDEN"
  ) {
    return "orden";
  }
  if (
    header === "CLIENTE" ||
    header === "COD CLIENTE" ||
    header === "CODIGO" ||
    header === "CODIGO CLIENTE"
  ) {
    return "cliente";
  }
  if (header.includes("NOMBRE")) return "nombre";
  if (
    header.includes("TELEFONO") ||
    header === "TEL" ||
    header === "CELULAR" ||
    header === "CEL"
  ) {
    return "telefono";
  }
  if (header === "COLONIA" || header === "BARRIO" || header === "SECTOR") {
    return "colonia";
  }
  if (header === "CIUDAD") return "ciudad";
  if (header.includes("DIRECCION")) return "direccion";
  if (
    header === "COMENTARIO" ||
    header === "COMENTARIOS" ||
    header === "OBSERVACION" ||
    header === "OBSERVACIONES" ||
    header === "DESCRIPCION" ||
    header === "DESCRIPCIONES" ||
    header === "NOTA" ||
    header === "NOTAS"
  ) {
    return "comentario";
  }
  return null;
}

function cellToString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") {
    if (Number.isFinite(value) && Math.abs(value) < 1e15) {
      const rounded = Math.round(value);
      if (Math.abs(value - rounded) < 1e-6) return String(rounded);
    }
    return String(value);
  }
  const raw = String(value).trim();
  if (/[eE]/.test(raw)) {
    const parsed = Number(raw.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed.toFixed(0);
  }
  return raw;
}

function telefono(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export async function parseOrdenesExcel(
  buffer: ArrayBuffer,
): Promise<ExcelParseResult> {
  const XLSX = await import("xlsx");
  const data =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : buffer;
  const workbook = XLSX.read(data, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("El Excel no tiene hojas");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error("El archivo está vacío");
  }

  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => cellToString(cell).length > 0),
  );
  if (headerIndex < 0) {
    throw new Error("No se encontraron encabezados");
  }

  const columns = new Map<string, number>();
  rows[headerIndex].forEach((cell, index) => {
    const mapped = mapHeader(normalizeHeader(cellToString(cell)));
    if (mapped && !columns.has(mapped)) {
      columns.set(mapped, index);
    }
  });

  if (
    !columns.has("orden") &&
    !columns.has("cliente") &&
    !columns.has("nombre")
  ) {
    throw new Error(
      "No se reconocieron columnas. Se esperan: Orden, Cliente, Ciudad, Colonia, Direccion, Telefono, Comentario",
    );
  }

  const avisos: string[] = [];
  const ordenes: OrdenCreateInput[] = [];
  let omitidas = 0;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const get = (key: string) => {
      const idx = columns.get(key);
      if (idx == null || idx >= row.length) return "";
      return cellToString(row[idx]);
    };

    const cliente = get("cliente") || get("nombre");
    let orden = get("orden");
    if (!orden && cliente) {
      orden = `F${i + 1}`;
    }

    if (!orden && !cliente) {
      continue;
    }

    const ciudad = get("ciudad") || "SIN CIUDAD";
    const colonia = get("colonia") || "SIN COLONIA";
    const direccion = get("direccion") || "SIN DIRECCION";
    const phone = telefono(get("telefono"));
    const comentario = get("comentario") || null;

    if (cliente.length < 2 || phone.length < 8 || direccion.length < 5) {
      omitidas += 1;
      continue;
    }

    ordenes.push({
      orden: orden.slice(0, 50),
      cliente: cliente.slice(0, 150),
      ciudad: ciudad.slice(0, 100),
      colonia: colonia.slice(0, 100),
      direccion: direccion.slice(0, 255),
      telefono: phone.slice(0, 80),
      comentario,
    });
  }

  if (ordenes.length === 0) {
    throw new Error("No se encontró ninguna orden válida en el archivo");
  }

  if (!columns.has("orden")) {
    avisos.push(
      "No se detectó columna Orden; se generó un número automático.",
    );
  }
  if (!columns.has("direccion")) {
    avisos.push("No se detectó columna Dirección; se usó SIN DIRECCION.");
  }
  if (omitidas > 0) {
    avisos.push(
      `${omitidas} filas se omitieron por datos incompletos (cliente o teléfono).`,
    );
  }

  return { ordenes, avisos, omitidas };
}

export async function downloadPlantillaExcel(): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Orden", "Cliente", "Ciudad", "Colonia", "Direccion", "Telefono", "Comentario"],
    [
      "1003",
      "Ana Ruiz",
      "Guadalajara",
      "Centro",
      "Av. Hidalgo 12",
      "3311112233",
      "Entregar en la mañana",
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Ordenes");
  XLSX.writeFile(workbook, "plantilla-ordenes.xlsx");
}
