import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { armarResumenCodigosClientes } from "./informes-resumen";

const filas = [
  {
    ciudad: "SPS",
    empresa: "CABLE COLOR",
    empresaEjecutora: "IPRORED",
    codigoCliente: "1",
  },
  {
    ciudad: "sps",
    empresa: "CABLE COLOR",
    empresaEjecutora: "IPRORED",
    codigoCliente: "1",
  },
  {
    ciudad: "SPS",
    empresa: "CABLE COLOR",
    empresaEjecutora: "FILO",
    codigoCliente: "2",
  },
  {
    ciudad: "Tegucigalpa",
    empresa: "ISG",
    empresaEjecutora: "ISG ATC",
    codigoCliente: "3",
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
    const resumen = armarResumenCodigosClientes(filas, "Tegucigalpa");
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
      },
    ]);
    assert.equal(resumen.total, 0);
    assert.equal(resumen.grupos.length, 0);
  });
});
