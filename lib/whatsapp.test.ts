import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  destinosWhatsApp,
  mensajeWhatsApp,
  numeroWhatsApp,
  numerosWhatsAppDe,
  urlWhatsApp,
} from "./whatsapp";
import type { Orden } from "./types";

function orden(parcial: Partial<Orden> & Pick<Orden, "orden" | "cliente" | "telefono">): Orden {
  return {
    id: parcial.id ?? parcial.orden,
    ciudad: "Tegucigalpa",
    colonia: "Kennedy",
    direccion: "Calle 1",
    comentario: "Recuperar equipos",
    estadoAnulacion: null,
    createdAt: "",
    updatedAt: "",
    ...parcial,
  };
}

describe("whatsapp", () => {
  it("antepone 504 a un celular de 8 dígitos", () => {
    assert.equal(numeroWhatsApp("99887766"), "50499887766");
    assert.deepEqual(numerosWhatsAppDe("9988-7766"), ["50499887766"]);
  });

  it("respeta un número que ya trae 504", () => {
    assert.equal(numeroWhatsApp("50499887766"), "50499887766");
  });

  it("agrupa órdenes del mismo teléfono", () => {
    const destinos = destinosWhatsApp([
      orden({ orden: "1001", cliente: "Ana Ruiz", telefono: "99887766" }),
      orden({ orden: "1002", cliente: "Ana Ruiz", telefono: "9988-7766" }),
    ]);
    assert.equal(destinos.length, 1);
    assert.deepEqual(destinos[0]?.ordenes, ["1001", "1002"]);
  });

  it("arma el enlace de WhatsApp con el mensaje", () => {
    const texto = mensajeWhatsApp("Hola {nombre}, orden {orden} en {ciudad}", {
      wa: "50499887766",
      nombre: "Ana Ruiz",
      ordenes: ["1001"],
      ciudad: "Tegucigalpa",
      colonia: "Kennedy",
    });
    assert.equal(texto, "Hola Ana Ruiz, orden 1001 en Tegucigalpa");
    assert.ok(urlWhatsApp("50499887766", texto).startsWith("https://wa.me/50499887766?text="));
  });
});
