import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AvisoWhatsApp } from "./types";
import { avisoEnviadoHoy } from "./whatsapp-hoy";

function aviso(parcial: Partial<AvisoWhatsApp> & Pick<AvisoWhatsApp, "ordenId" | "telefono">): AvisoWhatsApp {
  return {
    id: parcial.id ?? "1",
    numeroOrden: parcial.numeroOrden ?? "1001",
    cliente: parcial.cliente ?? "Ana",
    empresa: "isg",
    empresaLabel: "ISG",
    enviadoPor: "Panel",
    createdAt: parcial.createdAt ?? "2026-09-05T16:00:00.000Z",
    ...parcial,
  };
}

describe("whatsapp hoy", () => {
  it("detecta el aviso de hoy por orden o por el mismo teléfono", () => {
    const avisos = [aviso({ ordenId: "ord-1", telefono: "50499887766" })];

    assert.equal(avisoEnviadoHoy(avisos, { ordenId: "ord-1" })?.ordenId, "ord-1");
    assert.equal(avisoEnviadoHoy(avisos, { telefono: "9988-7766" })?.telefono, "50499887766");
    assert.equal(avisoEnviadoHoy(avisos, { ordenId: "otra", telefono: "50411112222" }), undefined);
  });
});
