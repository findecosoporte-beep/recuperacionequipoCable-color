import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MESES_DEL_ANIO,
  armarPeriodo,
  etiquetaPeriodo,
  esPeriodoValido,
  nombreMesDePeriodo,
  opcionesAnioCarga,
  periodoEnZona,
} from "./fecha";
import {
  cargasVigentesPorPeriodo,
  concatenarFilasInforme,
  filaDesdeRelaciones,
  resumenPendienteDeItems,
  sanitizarFilasInforme,
} from "./informes-tabla";

describe("informes recepción", () => {
  it("deja solo las columnas de la tabla y recorta celdas", () => {
    const [fila] = sanitizarFilasInforme([
      {
        n: " 2 ",
        serie: "SN-99",
        extra: "no",
        numeroOrden: "1003",
      },
    ]);
    assert.equal(fila.n, "2");
    assert.equal(fila.serie, "SN-99");
    assert.equal(fila.numeroOrden, "1003");
    assert.equal(fila.extra, undefined);
    assert.equal(fila.ciudad, "");
  });

  it("numera la fila si el Excel no trae #", () => {
    const [fila] = sanitizarFilasInforme([{}]);
    assert.equal(fila.n, "1");
  });

  it("acumula meses y vuelve a numerar", () => {
    const filas = concatenarFilasInforme([
      [{ n: "1", serie: "A" }],
      [{ n: "1", serie: "B" }, { n: "2", serie: "C" }],
    ]);
    assert.deepEqual(
      filas.map((fila) => [fila.n, fila.serie]),
      [
        ["1", "A"],
        ["2", "B"],
        ["3", "C"],
      ],
    );
  });

  it("arma la fila desde las tablas de cada grupo", () => {
    const fila = filaDesdeRelaciones({
      n: "4",
      fechaCliente: "01/09/2026",
      tipoEquipo: { modem: "1", identificador: "ID-1" },
      datosCliente: { numeroOrden: "1003" },
      datosEquipo: { serie: "SN-99" },
      datosRecepcion: { ciudad: "SPS" },
      equipoPendiente: { totalP: "2" },
    });
    assert.equal(fila.n, "4");
    assert.equal(fila.modem, "1");
    assert.equal(fila.identificador, "ID-1");
    assert.equal(fila.numeroOrden, "1003");
    assert.equal(fila.serie, "SN-99");
    assert.equal(fila.ciudad, "SPS");
    assert.equal(fila.totalP, "2");
    assert.equal(fila.tecnico, "");
  });

  it("suma el resumen de equipo pendiente y deja vacías las columnas sin dato", () => {
    const resumen = resumenPendienteDeItems([
      { cajaTvAnalogaP: "100", dthP: "3", ontP: "2", routerP: "1", otrosP: "0", totalP: "80" },
      { cajaTvAnalogaP: "7", dthP: "4", ontP: "2", totalP: "88" },
    ]);
    assert.equal(resumen.cajaTvAnalogaP, "107");
    assert.equal(resumen.dthP, "7");
    assert.equal(resumen.dttP, "");
    assert.equal(resumen.modemP, "");
    assert.equal(resumen.ontP, "4");
    assert.equal(resumen.routerP, "1");
    assert.equal(resumen.otrosP, "0");
    assert.equal(resumen.totalP, "168");
  });

  it("deja la carga más reciente de cada mes", () => {
    const vigentes = cargasVigentesPorPeriodo([
      { periodo: "2026-02", createdAt: new Date("2026-02-01T00:00:00Z"), id: "vieja" },
      { periodo: "2026-01", createdAt: new Date("2026-01-10T00:00:00Z"), id: "enero" },
      { periodo: "2026-02", createdAt: new Date("2026-02-20T00:00:00Z"), id: "nueva" },
    ]);
    assert.deepEqual(
      vigentes.map((carga) => carga.id),
      ["enero", "nueva"],
    );
  });

  it("escribe el nombre del mes y arma opciones de carga", () => {
    assert.equal(esPeriodoValido("2026-09"), true);
    assert.equal(esPeriodoValido("2026-13"), false);
    assert.match(etiquetaPeriodo("2026-09"), /septiembre/i);
    assert.equal(MESES_DEL_ANIO.length, 12);
    assert.equal(MESES_DEL_ANIO[0]?.label, "Enero");
    assert.equal(MESES_DEL_ANIO[11]?.label, "Diciembre");
    assert.equal(nombreMesDePeriodo("2026-09"), "Septiembre");
    assert.equal(armarPeriodo(2026, "09"), "2026-09");
    const anios = opcionesAnioCarga(["2024-01"]);
    assert.ok(anios.includes(2024));
    assert.ok(anios.includes(Number(periodoEnZona().slice(0, 4))));
  });
});
