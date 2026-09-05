import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  destinosWhatsApp,
  enlaceWhatsAppOrden,
  mensajeWhatsApp,
  numeroWhatsApp,
  numerosWhatsAppDe,
  plantillaPorEmpresa,
  telefonoWhatsApp1,
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

  it("usa solo el Teléfono 1 si hay dos números", () => {
    assert.equal(telefonoWhatsApp1("92763326 / 98755858"), "50492763326");
    const destinos = destinosWhatsApp([
      orden({ orden: "1001", cliente: "Ana Ruiz", telefono: "92763326 / 98755858" }),
    ]);
    assert.equal(destinos.length, 1);
    assert.equal(destinos[0]?.wa, "50492763326");
  });

  it("arma el enlace de WhatsApp con el mensaje personalizado", () => {
    const texto = mensajeWhatsApp("Hola {nombre}, orden {orden} en {ciudad}", {
      wa: "50499887766",
      ordenId: "1001",
      nombre: "Ana Ruiz",
      ordenes: ["1001"],
      ciudad: "Tegucigalpa",
      colonia: "Kennedy",
    });
    assert.equal(texto, "Hola Ana Ruiz, orden 1001 en Tegucigalpa");
    assert.ok(urlWhatsApp("50499887766", texto).startsWith("https://wa.me/50499887766?text="));
  });

  it("escribe ISG o Cable Color según el cliente del mensaje", () => {
    assert.match(plantillaPorEmpresa("isg"), /le escribimos de ISG/);
    assert.match(plantillaPorEmpresa("cable_color"), /le escribimos de Cable Color/);
    const url = enlaceWhatsAppOrden(
      orden({ orden: "93036922", cliente: "Maria Estela", telefono: "92763326" }),
      plantillaPorEmpresa("isg"),
    );
    assert.ok(url?.includes(encodeURIComponent("ISG")));
    assert.equal(url?.includes(encodeURIComponent("Cable Color")), false);
  });

  it("arma el enlace de WhatsApp de una orden por el Teléfono 1", () => {
    const url = enlaceWhatsAppOrden(
      orden({ orden: "1001", cliente: "Ana Ruiz", telefono: "92763326 / 98755858" }),
    );
    assert.ok(url?.startsWith("https://wa.me/50492763326?text="));
    assert.ok(url?.includes(encodeURIComponent("Ana Ruiz")));
    assert.equal(
      enlaceWhatsAppOrden(orden({ orden: "1002", cliente: "Sin numero", telefono: "123" })),
      null,
    );
  });
});
