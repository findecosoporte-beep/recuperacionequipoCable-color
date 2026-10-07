import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarControlWhatsApp, armarDashboard, type FilaDashboard } from "./dashboard";

function fila(parcial: Partial<FilaDashboard> = {}): FilaDashboard {
  return {
    ciudad: "TEGUCIGALPA",
    estadoAnulacion: null,
    motivoAnulacion: null,
    comentario: null,
    recuperadoPorId: null,
    acuse: null,
    ...parcial,
  };
}

describe("dashboard", () => {
  it("separa recuperados, mandados a anular y anulados", () => {
    const resumen = armarDashboard([
      fila({
        comentario: "Recuperó equipo: sí",
        acuse: { modemOnu: "ABC", router: "R1", equipoDigital: "" },
      }),
      fila({ estadoAnulacion: "por_anular", motivoAnulacion: "Cliente no entrega" }),
      fila({ estadoAnulacion: "anulada", motivoAnulacion: "Cliente no entrega" }),
      fila({ comentario: "Pendiente de visita" }),
    ]);

    assert.equal(resumen.porRecuperar, 1);
    assert.equal(resumen.recuperados, 1);
    assert.equal(resumen.porAnular, 1);
    assert.equal(resumen.anulados, 1);
    assert.equal(resumen.total, 4);
    assert.equal(resumen.porEquipo.find((item) => item.nombre === "Modem/ONU")?.total, 1);
    assert.equal(resumen.porEquipo.find((item) => item.nombre === "Router")?.total, 1);
    assert.equal(resumen.porMotivo[0]?.nombre, "Cliente no entrega");
    assert.equal(resumen.porMotivo[0]?.total, 2);
  });

  it("no cuenta como recuperada una orden ya mandada a anular", () => {
    const resumen = armarDashboard([
      fila({
        estadoAnulacion: "por_anular",
        comentario: "Recuperó equipo: sí",
        recuperadoPorId: "tec-1",
      }),
    ]);
    assert.equal(resumen.recuperados, 0);
    assert.equal(resumen.porAnular, 1);
    assert.equal(resumen.porRecuperar, 0);
  });

  it("cuenta por recuperar lo que deja el técnico y lo que marca el administrador", () => {
    const resumen = armarDashboard([
      fila({ comentario: "Recuperó equipo: no" }),
      fila({ comentario: null }),
      fila({ recuperadoPorId: "admin-1", comentario: "Recuperó equipo: sí" }),
    ]);
    assert.equal(resumen.porRecuperar, 2);
    assert.equal(resumen.recuperados, 1);
  });
});

describe("control de whatsapp", () => {
  it("agrupa por día, por semana y por técnico", () => {
    const control = armarControlWhatsApp(
      [
        {
          createdAt: "2026-10-07T15:00:00.000Z",
          rol: "tecnico",
          nombre: "ALEX CACERES",
        },
        {
          createdAt: "2026-10-01T15:00:00.000Z",
          rol: "admin",
          nombre: "Administrador",
        },
      ],
      [{ nombre: "ALEX CACERES" }, { nombre: "MARIA LOPEZ" }],
      "2026-10-07",
    );

    assert.equal(control.hoy, 1);
    assert.equal(control.semana, 1);
    assert.equal(control.porDia.length, 7);
    assert.equal(control.porDia[6]?.total, 1);
    assert.equal(control.porSemana.length, 8);
    assert.equal(control.porSemana[7]?.total, 1);
    assert.equal(control.porSemana[6]?.total, 1);
    assert.equal(control.porTecnico[0]?.nombre, "Alex Caceres");
    assert.equal(control.porTecnico[0]?.total, 1);
    assert.equal(control.porTecnico.find((item) => item.nombre === "Maria Lopez")?.total, 0);
  });
});
