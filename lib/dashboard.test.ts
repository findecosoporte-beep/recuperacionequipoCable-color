import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarDashboard, type FilaDashboard } from "./dashboard";

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

    assert.equal(resumen.recuperados, 1);
    assert.equal(resumen.porAnular, 1);
    assert.equal(resumen.anulados, 1);
    assert.equal(resumen.total, 3);
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
  });
});
