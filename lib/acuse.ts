export const MARCA_ACUSE_INI = "---ACUSE---";
export const MARCA_ACUSE_FIN = "---FIN-ACUSE---";

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
