import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esOrdenRecuperada, estadoOrden, withRecupero } from "./estado-orden";

describe("estado de orden", () => {
  it("marca recuperada si hay acuse o la marca de la app", () => {
    assert.equal(esOrdenRecuperada("Recuperó equipo: sí"), true);
    assert.equal(esOrdenRecuperada("nota", { cliente: "Ana" }), true);
    assert.equal(esOrdenRecuperada("RECUPERO EQUIPO: SI"), false);
  });

  it("prioriza anulación sobre recuperada", () => {
    assert.equal(
      estadoOrden({
        comentario: "Recuperó equipo: sí",
        estadoAnulacion: "por_anular",
      }),
      "por_anular",
    );
    assert.equal(
      estadoOrden({
        comentario: null,
        estadoAnulacion: "anulada",
      }),
      "anulada",
    );
  });

  it("escribe la marca de recupero sin mezclar con la anterior", () => {
    const texto = withRecupero("Recuperó equipo: no", "si");
    assert.equal(texto.includes("Recuperó equipo: sí"), true);
    assert.equal(texto.includes("Recuperó equipo: no"), false);
  });
});
