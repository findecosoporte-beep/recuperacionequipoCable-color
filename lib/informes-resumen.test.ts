import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarResumenCodigosClientes, armarResumenEquipoPendiente } from "./informes-resumen";

const filas = [
  {
    ciudad: "SPS",
    empresa: "CABLE COLOR",
    empresaEjecutora: "IPRORED",
    codigoCliente: "1",
    tipoEquipo: "MODEM",
  },
  {
    ciudad: "sps",
    empresa: "CABLE COLOR",
    empresaEjecutora: "IPRORED",
    codigoCliente: "1",
    tipoEquipo: "MODEM",
  },
  {
    ciudad: "SPS",
    empresa: "CABLE COLOR",
    empresaEjecutora: "FILO",
    codigoCliente: "2",
    tipoEquipo: "ROUTER",
  },
  {
    ciudad: "Tegucigalpa",
    empresa: "ISG",
    empresaEjecutora: "ISG ATC",
    codigoCliente: "3",
    tipoEquipo: "ONT",
  },
];

describe("resumen códigos de clientes", () => {
  it("agrupa códigos únicos por empresa y ejecutora", () => {
    const resumen = armarResumenCodigosClientes(filas);
    assert.equal(resumen.total, 3);
    assert.deepEqual(
      resumen.ciudades.map((ciudad) => ciudad.toUpperCase()),
      ["SPS", "TEGUCIGALPA"],
    );
    assert.equal(resumen.grupos[0]?.empresa, "CABLE COLOR");
    assert.equal(resumen.grupos[0]?.clientes, 2);
    assert.equal(resumen.grupos[0]?.hijos[0]?.empresaEjecutora, "FILO");
    assert.equal(resumen.grupos[0]?.hijos[0]?.clientes, 1);
    assert.equal(resumen.grupos[1]?.empresa, "ISG");
    assert.equal(resumen.grupos[1]?.clientes, 1);
  });

  it("filtra por ciudad sin perder el listado de ciudades", () => {
    const resumen = armarResumenCodigosClientes(filas, { ciudad: "Tegucigalpa" });
    assert.equal(resumen.total, 1);
    assert.equal(resumen.grupos.length, 1);
    assert.equal(resumen.grupos[0]?.empresa, "ISG");
    assert.equal(resumen.ciudades.length, 2);
  });

  it("omite filas sin código de cliente", () => {
    const resumen = armarResumenCodigosClientes([
      {
        ciudad: "SPS",
        empresa: "CABLE COLOR",
        empresaEjecutora: "FILO",
        codigoCliente: "  ",
        tipoEquipo: "MODEM",
      },
    ]);
    assert.equal(resumen.total, 0);
    assert.equal(resumen.grupos.length, 0);
  });
});

describe("resumen equipo pendiente", () => {
  const filasPendiente = [
    {
      ciudad: "SPS",
      periodo: "2026-08",
      cajaTvAnalogaP: "100",
      dttP: "",
      dthP: "3",
      modemP: "",
      ontP: "2",
      routerP: "1",
      otrosP: "",
      totalP: "80",
      tipoEquipo: "MODEM",
      empresaEjecutora: "IPRORED",
    },
    {
      ciudad: "Tegucigalpa",
      periodo: "2026-08",
      cajaTvAnalogaP: "7",
      dttP: "",
      dthP: "4",
      modemP: "",
      ontP: "2",
      routerP: "",
      otrosP: "",
      totalP: "88",
      tipoEquipo: "ROUTER",
      empresaEjecutora: "FILO",
    },
    {
      ciudad: "SPS",
      periodo: "2026-07",
      cajaTvAnalogaP: "10",
      dttP: "1",
      dthP: "",
      modemP: "",
      ontP: "",
      routerP: "",
      otrosP: "",
      totalP: "11",
      tipoEquipo: "MODEM",
      empresaEjecutora: "IPRORED",
    },
  ];

  it("suma el total y separa por mes", () => {
    const resumen = armarResumenEquipoPendiente(filasPendiente);
    assert.equal(resumen.pendiente.cajaTvAnalogaP, "117");
    assert.equal(resumen.pendiente.dthP, "7");
    assert.equal(resumen.pendiente.dttP, "1");
    assert.equal(resumen.pendiente.modemP, "");
    assert.equal(resumen.periodos.length, 2);
    assert.equal(resumen.periodos[0]?.periodo, "2026-08");
    assert.equal(resumen.periodos[0]?.pendiente.cajaTvAnalogaP, "107");
    assert.equal(resumen.periodos[1]?.periodo, "2026-07");
    assert.equal(resumen.periodos[1]?.pendiente.cajaTvAnalogaP, "10");
  });

  it("filtra por ciudad y periodo", () => {
    const porCiudad = armarResumenEquipoPendiente(filasPendiente, {
      ciudad: "SPS",
    });
    assert.equal(porCiudad.pendiente.cajaTvAnalogaP, "110");
    assert.equal(porCiudad.ciudades.length, 2);

    const porMes = armarResumenEquipoPendiente(filasPendiente, {
      periodo: "2026-07",
    });
    assert.equal(porMes.pendiente.totalP, "11");
    assert.equal(porMes.periodos.length, 1);
  });
});
