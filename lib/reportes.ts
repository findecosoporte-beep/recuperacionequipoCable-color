import { accesoriosTexto, resumenAcuse, type AcuseRecibido } from "@/lib/acuse";
import { equiposRecuperadosDe } from "@/lib/estado-orden";
import { formatFechaHora, ymdEnZona } from "@/lib/fecha";
import { formatOrdenNumero, telefonosFormateados, titleCase } from "@/lib/format-orden";
import { parseNombreCliente } from "@/lib/nombre-cliente";

export const TIPOS_REPORTE = [
  { id: "recuperadas", label: "Recuperadas" },
  { id: "por_anular", label: "Por anular" },
] as const;

export type TipoReporte = (typeof TIPOS_REPORTE)[number]["id"];

export interface FilaReporte {
  id: string;
  orden: string;
  cliente: string;
  codigoCliente: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  telefono1: string;
  telefono2: string;
  tecnico: string;
  recuperadoPor: string;
  equipos: string;
  motivoAnulacion: string;
  fecha: string;
}

export interface ResumenReporte {
  total: number;
  ciudades: number;
  tecnicos: number;
  porCiudad: Array<{ nombre: string; total: number }>;
}

export function etiquetaTipoReporte(tipo: TipoReporte): string {
  return tipo === "por_anular" ? "órdenes por anular" : "órdenes recuperadas";
}

export function tituloReporte(tipo: TipoReporte, desde?: string, hasta?: string): string {
  const base = tipo === "por_anular" ? "Reporte de órdenes por anular" : "Reporte de órdenes recuperadas";
  if (desde && hasta) return `${base} · ${desde} a ${hasta}`;
  if (desde) return `${base} · desde ${desde}`;
  if (hasta) return `${base} · hasta ${hasta}`;
  return base;
}

export function filaDeOrden(orden: {
  id: string;
  orden: string;
  cliente: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  telefono: string;
  comentario?: string | null;
  motivoAnulacion?: string | null;
  acuse?: AcuseRecibido | null;
  recuperadaEn?: string | null;
  updatedAt?: string | Date;
  tecnico?: { nombre: string } | null;
  recuperadoPor?: { nombre: string } | null;
}): FilaReporte {
  const { nombre, codigo } = parseNombreCliente(orden.cliente);
  const [telefono1, telefono2] = telefonosFormateados(orden.telefono);
  const equipos =
    resumenAcuse(orden.acuse) ||
    accesoriosTexto(orden.acuse?.accesorios) ||
    equiposRecuperadosDe(orden.comentario) ||
    "—";

  return {
    id: orden.id,
    orden: orden.orden,
    cliente: titleCase(nombre || orden.cliente),
    codigoCliente: codigo,
    ciudad: titleCase(orden.ciudad),
    colonia: titleCase(orden.colonia),
    direccion: titleCase(orden.direccion),
    telefono1,
    telefono2,
    tecnico: orden.tecnico?.nombre ? titleCase(orden.tecnico.nombre) : "Sin asignar",
    recuperadoPor: orden.recuperadoPor?.nombre ? titleCase(orden.recuperadoPor.nombre) : "—",
    equipos,
    motivoAnulacion: orden.motivoAnulacion?.trim() || "—",
    fecha: formatFechaHora(orden.recuperadaEn ?? (orden.updatedAt ? String(orden.updatedAt) : null)),
  };
}

export function resumenReporte(filas: FilaReporte[]): ResumenReporte {
  const ciudades = new Map<string, number>();
  const tecnicos = new Set<string>();
  for (const fila of filas) {
    ciudades.set(fila.ciudad, (ciudades.get(fila.ciudad) ?? 0) + 1);
    if (fila.tecnico && fila.tecnico !== "Sin asignar") tecnicos.add(fila.tecnico);
  }
  return {
    total: filas.length,
    ciudades: ciudades.size,
    tecnicos: tecnicos.size,
    porCiudad: [...ciudades.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es")),
  };
}

export function filasExcelReporte(tipo: TipoReporte, filas: FilaReporte[]): Array<Record<string, string>> {
  return filas.map((fila) => {
    const base = {
      Orden: formatOrdenNumero(fila.orden),
      Cliente: fila.cliente,
      "Código cliente": fila.codigoCliente || "—",
      Ciudad: fila.ciudad,
      Colonia: fila.colonia,
      Dirección: fila.direccion,
      "Teléfono 1": fila.telefono1,
      "Teléfono 2": fila.telefono2,
      Técnico: fila.tecnico,
      Fecha: fila.fecha,
    };
    if (tipo === "por_anular") {
      return { ...base, Motivo: fila.motivoAnulacion };
    }
    return { ...base, Equipos: fila.equipos, "Recuperó": fila.recuperadoPor };
  });
}

export function nombreArchivoReporte(tipo: TipoReporte, desde?: string, hasta?: string): string {
  const hoy = ymdEnZona();
  const rango = [desde, hasta].filter(Boolean).join("_") || hoy;
  return `reporte-${tipo}-${rango}.xlsx`;
}

export function htmlReporte(tipo: TipoReporte, filas: FilaReporte[], desde?: string, hasta?: string): string {
  const titulo = tituloReporte(tipo, desde, hasta);
  const resumen = resumenReporte(filas);
  const extraHeader = tipo === "por_anular" ? "<th>Motivo</th>" : "<th>Equipos</th><th>Recuperó</th>";
  const filasHtml = filas
    .map((fila) => {
      const extra =
        tipo === "por_anular"
          ? `<td>${escapeHtml(fila.motivoAnulacion)}</td>`
          : `<td>${escapeHtml(fila.equipos)}</td><td>${escapeHtml(fila.recuperadoPor)}</td>`;
      return `<tr>
        <td>${escapeHtml(formatOrdenNumero(fila.orden))}</td>
        <td>${escapeHtml(fila.cliente)}</td>
        <td>${escapeHtml(fila.ciudad)}</td>
        <td>${escapeHtml(fila.colonia)}</td>
        <td>${escapeHtml(fila.telefono1)}</td>
        <td>${escapeHtml(fila.tecnico)}</td>
        <td>${escapeHtml(fila.fecha)}</td>
        ${extra}
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(titulo)}</title>
  <style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
    .page { padding: 28px 32px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { font-size: 13px; color: #444; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #5c2d91; color: #fff; }
    tr:nth-child(even) td { background: #f7f4fb; }
  </style>
</head>
<body>
  <div class="page">
    <h1>${escapeHtml(titulo)}</h1>
    <p class="meta">${resumen.total} ${escapeHtml(etiquetaTipoReporte(tipo))} · ${resumen.ciudades} ciudad${resumen.ciudades === 1 ? "" : "es"}</p>
    <table>
      <thead>
        <tr>
          <th>Orden</th><th>Cliente</th><th>Ciudad</th><th>Colonia</th>
          <th>Teléfono</th><th>Técnico</th><th>Fecha</th>${extraHeader}
        </tr>
      </thead>
      <tbody>${filasHtml || `<tr><td colspan="9">Sin órdenes en este rango.</td></tr>`}</tbody>
    </table>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
