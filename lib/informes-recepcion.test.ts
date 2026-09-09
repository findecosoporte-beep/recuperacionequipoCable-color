import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizarFilasInforme } from "./informes-tabla";

describe("informes recepción", () => {
  it("deja solo las columnas de la tabla y recorta celdas", () => {
    const [fila] = sanitizarFilasInforme([
      {
        n: " 2 ",
        serie: "SN-99",
        extra: "no",
        numeroOrden: "1003",
      },
    ]);
    assert.equal(fila.n, "2");
    assert.equal(fila.serie, "SN-99");
    assert.equal(fila.numeroOrden, "1003");
    assert.equal(fila.extra, undefined);
    assert.equal(fila.ciudad, "");
  });

  it("numera la fila si el Excel no trae #", () => {
    const [fila] = sanitizarFilasInforme([{}]);
    assert.equal(fila.n, "1");
  });
});
