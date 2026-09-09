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

export function periodoEnZona(date = new Date()): string {
  return ymdEnZona(date).slice(0, 7);
}

export const MESES_DEL_ANIO = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const;

export function anioEnZona(date = new Date()): number {
  return Number(periodoEnZona(date).slice(0, 4));
}

export function mesEnZona(date = new Date()): string {
  return periodoEnZona(date).slice(5, 7);
}

export function armarPeriodo(anio: number, mes: string): string {
  return `${anio}-${mes}`;
}

export function opcionesAnioCarga(existentes: string[] = []): number[] {
  const actual = anioEnZona();
  const set = new Set([actual - 1, actual, actual + 1]);
  for (const periodo of existentes) {
    if (esPeriodoValido(periodo)) set.add(Number(periodo.slice(0, 4)));
  }
  return [...set].sort((a, b) => b - a);
}

export function esPeriodoValido(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function etiquetaPeriodo(periodo: string): string {
  if (!esPeriodoValido(periodo)) return periodo;
  const raw = new Intl.DateTimeFormat("es-HN", {
    timeZone: ZONA_HORARIA,
    month: "long",
    year: "numeric",
  }).format(new Date(`${periodo}-01T12:00:00-06:00`));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function opcionesPeriodoCarga(existentes: string[] = []): string[] {
  const actual = periodoEnZona();
  const [year, month] = actual.split("-").map(Number);
  const set = new Set(existentes.filter(esPeriodoValido));
  for (let offset = -18; offset <= 1; offset += 1) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    const periodo = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    set.add(periodo);
  }
  return [...set].sort().reverse();
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
