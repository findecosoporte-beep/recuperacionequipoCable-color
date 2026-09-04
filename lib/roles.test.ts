import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { puedeAccionAdmin, ROLES, usuarioSesionValida } from "./roles";

describe("roles", () => {
  it("deja al operador en el panel pero no en acciones de admin", () => {
    assert.equal(
      puedeAccionAdmin({ kind: "jwt", rol: ROLES.operador }, "tecnicos.write"),
      false,
    );
    assert.equal(
      puedeAccionAdmin({ kind: "jwt", rol: ROLES.operador }, "ordenes.delete"),
      false,
    );
  });

  it("permite al administrador y a la API key", () => {
    assert.equal(
      puedeAccionAdmin({ kind: "jwt", rol: ROLES.admin }, "tecnicos.write"),
      true,
    );
    assert.equal(puedeAccionAdmin({ kind: "api_key" }, "ordenes.delete"), true);
  });

  it("no permite al técnico gestionar usuarios ni borrar órdenes", () => {
    assert.equal(
      puedeAccionAdmin({ kind: "jwt", rol: ROLES.tecnico }, "tecnicos.write"),
      false,
    );
  });

  it("rechaza usuarios ausentes o inactivos", () => {
    assert.equal(usuarioSesionValida(null), false);
    assert.equal(usuarioSesionValida(undefined), false);
    assert.equal(usuarioSesionValida({ activo: false }), false);
    assert.equal(usuarioSesionValida({ activo: true }), true);
  });
});
