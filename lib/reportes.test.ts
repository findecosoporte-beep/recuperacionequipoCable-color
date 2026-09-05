import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filaDeOrden,
  filasExcelReporte,
  htmlReporte,
  nombreArchivoReporte,
  resumenReporte,
  tituloReporte,
} from "./reportes";

describe("reportes", () => {
  const recuperada = filaDeOrden({
    id: "1",
    orden: "93036922",
    cliente: "Ana Ruiz (727396)",
    ciudad: "la paz",
    colonia: "centro",
    direccion: "calle 1",
    telefono: "92763326 / 98755858",
    comentario: "Equipos recuperados: Modem SN-1",
    acuse: {
      cliente: "Ana Ruiz",
      contrato: "727396",
      fecha: "5 de septiembre de 2026",
      modemOnu: "SN-1",
      router: "",
      equipoDigital: "",
      accesorios: {},
      nombreFirma: "Oficial",
    },
    recuperadaEn: "2026-09-05T16:00:00.000Z",
    tecnico: { nombre: "juan perez" },
    recuperadoPor: { nombre: "maria lopez" },
  });

  const porAnular = filaDeOrden({
    id: "2",
    orden: "1002",
    cliente: "Pedro",
    ciudad: "Tegucigalpa",
    colonia: "Kennedy",
    direccion: "Calle 2",
    telefono: "99887766",
    motivoAnulacion: "No contestan los números de teléfono.",
    updatedAt: "2026-09-05T16:00:00.000Z",
  });

  it("arma filas de recuperadas y por anular", () => {
    assert.equal(recuperada.cliente, "Ana Ruiz");
    assert.equal(recuperada.codigoCliente, "727396");
    assert.match(recuperada.equipos, /SN-1/);
    assert.equal(porAnular.motivoAnulacion, "No contestan los números de teléfono.");
  });

  it("resume totales por ciudad", () => {
    const resumen = resumenReporte([recuperada, porAnular, { ...recuperada, id: "3" }]);
    assert.equal(resumen.total, 3);
    assert.equal(resumen.ciudades, 2);
    assert.equal(resumen.porCiudad[0]?.total, 2);
  });

  it("exporta columnas distintas según el tipo", () => {
    const excelRec = filasExcelReporte("recuperadas", [recuperada]);
    const excelAnular = filasExcelReporte("por_anular", [porAnular]);
    assert.ok("Equipos" in excelRec[0]!);
    assert.ok("Motivo" in excelAnular[0]!);
    assert.match(nombreArchivoReporte("recuperadas", "2026-09-01", "2026-09-05"), /recuperadas/);
    assert.match(tituloReporte("por_anular", "2026-09-01", "2026-09-05"), /por anular/);
  });

  it("arma el HTML imprimible sin la URL del panel", () => {
    const html = htmlReporte("recuperadas", [recuperada], "2026-09-01", "2026-09-05");
    assert.match(html, /Reporte de órdenes recuperadas/);
    assert.match(html, /Ana Ruiz/);
    assert.match(html, /@page \{ margin: 0; \}/);
  });
});
