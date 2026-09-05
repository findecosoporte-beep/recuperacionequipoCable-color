import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { motivoNoAsignable, whereAsignarCiudad } from "./asignaciones";

describe("asignación por ciudad", () => {
  it("en modo libres solo toma órdenes sin técnico", () => {
    const where = whereAsignarCiudad("Tegucigalpa", "libres");
    const condiciones = where.AND;
    assert.deepEqual(condiciones[condiciones.length - 1], { tecnicoId: null });
  });

  it("en modo todas no filtra por técnico vacío", () => {
    const where = whereAsignarCiudad("Tegucigalpa", "todas");
    const serialized = JSON.stringify(where);
    assert.equal(serialized.includes("tecnicoId"), false);
  });
});

describe("asignación por orden", () => {
  it("bloquea recuperadas y anuladas, y deja pasar las pendientes", () => {
    assert.equal(motivoNoAsignable({ estadoAnulacion: "anulada" }), "No se puede asignar una orden anulada");
    assert.equal(
      motivoNoAsignable({ comentario: "Equipos recuperados: SN-1" }),
      "No se puede reasignar una orden recuperada",
    );
    assert.equal(motivoNoAsignable({ comentario: "Recuperar equipos" }), null);
  });
});
