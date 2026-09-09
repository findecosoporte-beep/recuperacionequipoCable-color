import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { parseInformesExcel } from "./excel-informes";

describe("excel informes", () => {
  it("llena la tabla con las columnas del control de recepción", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["#", "FECHA QUE ENTREGO EL CLIENTE", "CAJA TV ANALOGA", "Número Orden", "Serie"],
      [1, "9/9/2026", "1", "1003", "SN-1"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Recepcion");
    const written = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const bytes = written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    const result = await parseInformesExcel(buffer);
    assert.equal(result.filas.length, 1);
    assert.equal(result.filas[0].n, "1");
    assert.equal(result.filas[0].numeroOrden, "1003");
    assert.equal(result.filas[0].serie, "SN-1");
    assert.equal(result.filas[0].cajaTvAnaloga, "1");
  });

  it("arma el Excel del informe con encabezados y filas", async () => {
    const { filasInformeAExcel } = await import("./excel-informes");
    const rows = filasInformeAExcel([
      { n: "1", numeroOrden: "1003", serie: "SN-1" },
    ]);
    assert.equal(rows.length, 3);
    const data = rows[2] as string[];
    assert.equal(data[0], "1");
    assert.ok(data.includes("1003"));
    assert.ok(data.includes("SN-1"));
  });
});
