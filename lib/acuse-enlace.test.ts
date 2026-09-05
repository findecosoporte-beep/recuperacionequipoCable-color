import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firmarEnlaceAcuse, mensajeAcuseWhatsApp, verificarEnlaceAcuse } from "./acuse-enlace";

describe("acuse enlace", () => {
  it("firma y verifica el enlace público del acuse", () => {
    const token = firmarEnlaceAcuse("ord-123");
    assert.equal(verificarEnlaceAcuse(token), "ord-123");
    assert.equal(verificarEnlaceAcuse("ord-123.firma-falsa"), null);
    assert.equal(verificarEnlaceAcuse("sin-punto"), null);
  });

  it("arma el mensaje de WhatsApp con el PDF", () => {
    const texto = mensajeAcuseWhatsApp(
      {
        wa: "50499887766",
        ordenId: "ord-123",
        nombre: "Ana Ruiz",
        ordenes: ["93036922"],
        ciudad: "Tegucigalpa",
        colonia: "Kennedy",
        etiqueta: "Teléfono 1",
      },
      "https://ejemplo.test/a/token",
    );
    assert.match(texto, /Ana Ruiz/);
    assert.match(texto, /93036922/);
    assert.match(texto, /PDF/);
    assert.match(texto, /https:\/\/ejemplo\.test\/a\/token/);
  });
});
