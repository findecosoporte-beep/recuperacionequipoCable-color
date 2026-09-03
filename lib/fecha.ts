export const ZONA_HORARIA = "America/Tegucigalpa";

const DIAS_LUNES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function ymdEnZona(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function sumarDiasYmd(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00-06:00`);
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  return ymdEnZona(date);
}

function indiceLunes(ymd: string): number {
  const date = new Date(`${ymd}T12:00:00-06:00`);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
  }).format(date);
  const index = DIAS_LUNES.indexOf(wd as (typeof DIAS_LUNES)[number]);
  return index >= 0 ? index : 0;
}

export function inicioSemanaYmd(ymd = ymdEnZona()): string {
  return sumarDiasYmd(ymd, -indiceLunes(ymd));
}

export function etiquetaSemana(inicio: string): string {
  const fin = sumarDiasYmd(inicio, 6);
  const desde = new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
  }).format(new Date(`${inicio}T12:00:00-06:00`));
  const hasta = new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${fin}T12:00:00-06:00`));
  return `${desde} – ${hasta}`;
}

export function nombreDia(ymd: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
  }).format(new Date(`${ymd}T12:00:00-06:00`));
}

export function fechaCorta(ymd: string): string {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
  }).format(new Date(`${ymd}T12:00:00-06:00`));
}

export function ymdDeIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return ymdEnZona(new Date(iso));
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function limitesDiaUtc(ymd: string, fin = false): Date {
  return new Date(`${ymd}T${fin ? "23:59:59.999" : "00:00:00.000"}-06:00`);
}
