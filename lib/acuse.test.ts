import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comentarioSinAcuse, decodeAcuse, extraerAcuse } from "./acuse";

describe("acuse", () => {
  it("extrae el JSON embebido en el comentario", () => {
    const comentario = [
      "Recuperó equipo: sí",
      "---ACUSE---",
      JSON.stringify({
        cliente: "Ana",
        contrato: "123",
        fecha: "2026-09-03",
        modemOnu: "SN-1",
        router: "",
        equipoDigital: "",
        accesorios: { Control: 1 },
        nombreFirma: "Ana",
      }),
      "---FIN-ACUSE---",
    ].join("\n");

    const acuse = extraerAcuse(comentario);
    assert.equal(acuse?.cliente, "Ana");
    assert.equal(acuse?.modemOnu, "SN-1");
    assert.equal(acuse?.accesorios.Control, 1);
    assert.equal(comentarioSinAcuse(comentario), "Recuperó equipo: sí");
  });

  it("rechaza un JSON sin datos de equipo ni cliente", () => {
    assert.equal(decodeAcuse("{}"), null);
    assert.equal(extraerAcuse("sin marcas"), null);
  });
});
