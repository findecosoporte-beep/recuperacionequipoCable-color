import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { comentarioSinAcuse, decodeAcuse, extraerAcuse, htmlAcuse, incrustarAcuse } from "./acuse";

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

  it("incrusta y vuelve a leer el acuse como en la app", () => {
    const comentario = incrustarAcuse("Recuperó equipo: sí", {
      cliente: "Maria Estela",
      contrato: "93036922",
      fecha: "5 de septiembre de 2026",
      modemOnu: "SN-1",
      router: "",
      equipoDigital: "",
      accesorios: { "Control Remoto": 1 },
      nombreFirma: "Oficial",
    });
    const acuse = extraerAcuse(comentario);
    assert.equal(acuse?.cliente, "Maria Estela");
    assert.equal(acuse?.modemOnu, "SN-1");
    assert.match(htmlAcuse(acuse!), /<title>Acuse de Recibo<\/title>/);
    assert.match(htmlAcuse(acuse!), /@page \{ margin: 0; \}/);
    assert.match(htmlAcuse(acuse!), /logo-isg/);
    assert.match(htmlAcuse(acuse!), /data:image\/png/);
    assert.match(htmlAcuse(acuse!), /ISG Communications/);
    assert.match(htmlAcuse(acuse!), /Maria Estela/);
  });
});
