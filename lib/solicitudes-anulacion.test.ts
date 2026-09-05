import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeSolicitudAnulacion } from "./solicitudes-anulacion";

describe("control de anulaciones de la app", () => {
  it("serializa la solicitud del técnico con motivo y hora", () => {
    const item = serializeSolicitudAnulacion({
      id: "s1",
      ordenId: "o1",
      numeroOrden: "123",
      cliente: "Ana 9988",
      ciudad: "Tegucigalpa",
      colonia: "Kennedy",
      telefono: "99887766",
      motivo: "No contestan",
      solicitadoPor: { nombre: "Carlos Técnico" },
      createdAt: new Date("2026-09-05T16:30:00.000Z"),
    });
    assert.equal(item.numeroOrden, "123");
    assert.equal(item.motivo, "No contestan");
    assert.equal(item.solicitadoPor, "Carlos Técnico");
    assert.equal(item.createdAt, "2026-09-05T16:30:00.000Z");
  });

  it("usa Técnico si no hay nombre del solicitante", () => {
    const item = serializeSolicitudAnulacion({
      id: "s2",
      ordenId: null,
      numeroOrden: "9",
      cliente: "Luis",
      ciudad: "SPS",
      colonia: "",
      telefono: "111",
      motivo: "",
      solicitadoPor: null,
      createdAt: new Date("2026-09-05T12:00:00.000Z"),
    });
    assert.equal(item.solicitadoPor, "Técnico");
  });
});
