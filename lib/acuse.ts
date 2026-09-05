import { LOGO_ISG_SRC } from "@/lib/logo-isg";
import { parseNombreCliente } from "@/lib/nombre-cliente";

export const MARCA_ACUSE_INI = "---ACUSE---";
export const MARCA_ACUSE_FIN = "---FIN-ACUSE---";

export const ACCESORIOS = [
  "Control Remoto",
  "Cable HDMI",
  "Cable de Red",
  "Cable RCA",
  "Fuente de Poder",
  "Teléfono",
] as const;

export interface AcuseRecibido {
  cliente: string;
  contrato: string;
  fecha: string;
  modemOnu: string;
  router: string;
  equipoDigital: string;
  accesorios: Record<string, number>;
  nombreFirma: string;
}

function texto(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function numero(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(9, Math.floor(n));
}

export function parseAccesorios(raw: unknown): Record<string, number> {
  const accesorios: Record<string, number> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [nombre, qty] of Object.entries(raw as Record<string, unknown>)) {
      const n = numero(qty);
      if (n > 0) accesorios[nombre] = n;
    }
    return accesorios;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const nombre = texto(item);
      if (nombre) accesorios[nombre] = Math.max(accesorios[nombre] ?? 0, 1);
    }
  }
  return accesorios;
}

export function decodeAcuse(raw: string): AcuseRecibido | null {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    if (!json || typeof json !== "object") return null;
    const acuse: AcuseRecibido = {
      cliente: texto(json.cliente ?? json.c),
      contrato: texto(json.contrato ?? json.n),
      fecha: texto(json.fecha ?? json.f),
      modemOnu: texto(json.modemOnu ?? json.modem_onu ?? json.m),
      router: texto(json.router ?? json.r),
      equipoDigital: texto(json.equipoDigital ?? json.equipo_digital ?? json.d),
      accesorios: parseAccesorios(json.accesorios ?? json.a),
      nombreFirma: texto(json.nombreFirma ?? json.nombre_firma ?? json.s),
    };
    if (!acuse.cliente && !acuse.contrato && !acuse.modemOnu && !acuse.router && !acuse.equipoDigital) {
      return null;
    }
    return acuse;
  } catch {
    return null;
  }
}

export function extraerAcuse(comentario: string | null | undefined): AcuseRecibido | null {
  const text = comentario ?? "";
  const start = text.indexOf(MARCA_ACUSE_INI);
  const end = text.indexOf(MARCA_ACUSE_FIN);
  if (start === -1 || end === -1 || end <= start) return null;
  return decodeAcuse(text.slice(start + MARCA_ACUSE_INI.length, end).trim());
}

export function comentarioSinAcuse(comentario: string | null | undefined): string {
  return (comentario ?? "")
    .replace(/---ACUSE---[\s\S]*?---FIN-ACUSE---/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function acusePublico(row: {
  cliente: string;
  contrato: string;
  fecha: string;
  modemOnu: string;
  router: string;
  equipoDigital: string;
  accesorios: unknown;
  nombreFirma: string;
} | null | undefined): AcuseRecibido | null {
  if (!row) return null;
  return {
    cliente: row.cliente,
    contrato: row.contrato,
    fecha: row.fecha,
    modemOnu: row.modemOnu,
    router: row.router,
    equipoDigital: row.equipoDigital,
    accesorios: parseAccesorios(row.accesorios),
    nombreFirma: row.nombreFirma,
  };
}

export function resumenAcuse(acuse: AcuseRecibido | null | undefined): string {
  if (!acuse) return "";
  const equipos = [
    acuse.modemOnu ? `Modem/ONU ${acuse.modemOnu}` : "",
    acuse.router ? `Router ${acuse.router}` : "",
    acuse.equipoDigital ? `Equipo Digital ${acuse.equipoDigital}` : "",
  ].filter(Boolean);
  const accesorios = Object.entries(acuse.accesorios)
    .filter(([, qty]) => qty > 0)
    .map(([nombre, qty]) => `${nombre} (${qty})`);
  return [...equipos, ...accesorios].join(", ");
}

export function accesoriosVacios(): Record<string, number> {
  return Object.fromEntries(ACCESORIOS.map((nombre) => [nombre, 0]));
}

export function acuseDeOrden(orden: {
  comentario?: string | null;
  acuse?: AcuseRecibido | null;
}): AcuseRecibido | null {
  const delComentario = extraerAcuse(orden.comentario);
  if (delComentario) return delComentario;
  return acusePublico(orden.acuse);
}

export function tieneAcuse(orden: {
  comentario?: string | null;
  acuse?: AcuseRecibido | null;
}): boolean {
  const acuse = acuseDeOrden(orden);
  if (!acuse) return false;
  return Boolean(
    acuse.cliente ||
      acuse.contrato ||
      acuse.modemOnu ||
      acuse.router ||
      acuse.equipoDigital ||
      acuse.nombreFirma,
  );
}

export function fechaAcuseLarga(date = new Date()): string {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "America/Tegucigalpa",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function acuseInicialDeOrden(
  orden: {
    orden: string;
    cliente: string;
    comentario?: string | null;
    acuse?: AcuseRecibido | null;
    recuperadaEn?: string | null;
  },
  firma = "",
): AcuseRecibido {
  const existente = acuseDeOrden(orden);
  const { nombre, codigo } = parseNombreCliente(orden.cliente);
  return {
    cliente: existente?.cliente || nombre || orden.cliente,
    contrato: existente?.contrato || codigo || orden.orden,
    fecha:
      existente?.fecha ||
      (orden.recuperadaEn ? fechaAcuseLarga(new Date(orden.recuperadaEn)) : fechaAcuseLarga()),
    modemOnu: existente?.modemOnu ?? "",
    router: existente?.router ?? "",
    equipoDigital: existente?.equipoDigital ?? "",
    accesorios: { ...accesoriosVacios(), ...(existente?.accesorios ?? {}) },
    nombreFirma: existente?.nombreFirma || firma,
  };
}

export function lineaEquiposAcuse(acuse: AcuseRecibido): string {
  return [
    acuse.modemOnu ? `Modem/ONU ${acuse.modemOnu}` : "",
    acuse.router ? `Router ${acuse.router}` : "",
    acuse.equipoDigital ? `Equipo Digital ${acuse.equipoDigital}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export function validarAcuse(acuse: AcuseRecibido): string | null {
  if (!acuse.cliente.trim()) return "Escribe el nombre del cliente";
  if (!acuse.contrato.trim()) return "Escribe el número de contrato";
  if (!acuse.modemOnu && !acuse.router && !acuse.equipoDigital) {
    return "Registra al menos un serial (Modem/ONU, Router o Equipo Digital)";
  }
  if (!acuse.nombreFirma.trim()) return "Escribe el nombre de quien recibe";
  return null;
}

function compactarAcuse(acuse: AcuseRecibido): Record<string, unknown> {
  const accesorios: Record<string, number> = {};
  for (const [nombre, qty] of Object.entries(acuse.accesorios)) {
    if (qty > 0) accesorios[nombre] = qty;
  }
  const payload: Record<string, unknown> = {};
  if (acuse.cliente) payload.c = acuse.cliente;
  if (acuse.contrato) payload.n = acuse.contrato;
  if (acuse.fecha) payload.f = acuse.fecha;
  if (acuse.modemOnu) payload.m = acuse.modemOnu;
  if (acuse.router) payload.r = acuse.router;
  if (acuse.equipoDigital) payload.d = acuse.equipoDigital;
  if (Object.keys(accesorios).length > 0) payload.a = accesorios;
  if (acuse.nombreFirma) payload.s = acuse.nombreFirma;
  return payload;
}

export function incrustarAcuse(comentario: string | null | undefined, acuse: AcuseRecibido): string {
  const base = comentarioSinAcuse(comentario);
  const json = JSON.stringify(compactarAcuse(acuse));
  return [base, `${MARCA_ACUSE_INI}\n${json}\n${MARCA_ACUSE_FIN}`].filter(Boolean).join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineaHtml(value: string): string {
  const trimmed = value.trim();
  return escapeHtml(trimmed || "____________________");
}

const LOGO_ISG_HTML = `<img class="logo-isg" src="${LOGO_ISG_SRC}" alt="ISG Communications" />`;

export function htmlAcuse(acuse: AcuseRecibido): string {
  const accesorios = ACCESORIOS.map((nombre) => {
    const qty = acuse.accesorios[nombre] > 0 ? String(acuse.accesorios[nombre]) : "&nbsp;";
    return `<div class="acc"><span>${escapeHtml(nombre)}</span><span>( ${qty} )</span></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Acuse de Recibo</title>
  <style>
    @page { margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #111111;
      font-family: Arial, Helvetica, sans-serif;
    }
    .page { background: #ffffff; color: #111111; padding: 36px 40px; min-height: 100%; }
    .letterhead {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      margin: 0 0 12px;
      padding: 0;
    }
    .logo-isg { height: 72px; width: auto; max-width: 100%; display: block; }
    h1 { text-align: center; font-size: 22px; margin: 8px 0 28px; color: #111111; }
    .label { font-size: 11px; color: #444444; margin-bottom: 4px; }
    .field { border-bottom: 1px solid #333333; padding-bottom: 4px; margin-bottom: 16px; font-size: 14px; }
    .row { display: flex; gap: 24px; }
    .row > div { flex: 1; }
    .equipos { font-weight: 700; font-size: 12px; margin: 8px 0 14px; }
    .acc { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
    .firma { margin-top: 48px; border-bottom: 1px solid #111111; padding-bottom: 6px; font-size: 14px; }
    .firma-label { text-align: center; font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="letterhead">
      ${LOGO_ISG_HTML}
    </div>
    <h1>Acuse de Recibo</h1>
    <div class="label">Recibimos del cliente:</div>
    <div class="field">${lineaHtml(acuse.cliente)}</div>
    <div class="row">
      <div>
        <div class="label">Contrato:</div>
        <div class="field">${lineaHtml(acuse.contrato)}</div>
      </div>
      <div>
        <div class="label">Fecha:</div>
        <div class="field">${lineaHtml(acuse.fecha)}</div>
      </div>
    </div>
    <div class="equipos">El siguiente Equipo(os) Propiedad de ISG Communications:</div>
    <div class="label">Modem/ONU:</div>
    <div class="field">${lineaHtml(acuse.modemOnu)}</div>
    <div class="label">Router:</div>
    <div class="field">${lineaHtml(acuse.router)}</div>
    <div class="label">Equipo Digital:</div>
    <div class="field">${lineaHtml(acuse.equipoDigital)}</div>
    <div style="margin-top:18px">${accesorios}</div>
    <div class="firma">${lineaHtml(acuse.nombreFirma)}</div>
    <div class="firma-label">Nombre y Firma de Oficial de Negocios Que Recibe</div>
  </div>
</body>
</html>`;
}

export function accesoriosTexto(accesorios: Record<string, number> | null | undefined): string {
  if (!accesorios) return "";
  return Object.entries(accesorios)
    .filter(([, qty]) => qty > 0)
    .map(([nombre, qty]) => `${nombre} (${qty})`)
    .join(", ");
}
