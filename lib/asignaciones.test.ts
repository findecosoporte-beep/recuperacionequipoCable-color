import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { whereAsignarCiudad } from "./asignaciones";

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
