export type EstadoAnulacion = "por_anular" | "anulada";

export type EstadoOrden =
  | "recuperada"
  | "por_recuperar"
  | "por_anular"
  | "anulada"
  | "sin_registro";

export function comentarioNormalizado(comentario: string | null | undefined): string {
  return (comentario ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function esOrdenRecuperada(comentario: string | null | undefined): boolean {
  const raw = comentario ?? "";
  if (raw.includes("---ACUSE---")) return true;
  // Solo la marca con acento que escribe la app. "RECUPERO EQUIPO: SI" es el trabajo pendiente.
  if (/recuperó equipo:\s*sí/i.test(raw)) return true;
  if (/recuperó equipo:\s*si/i.test(raw)) return true;
  const text = comentarioNormalizado(raw);
  return text.includes("equipos recuperados:") || text.includes("se recibe equipo");
}

export function esOrdenPorRecuperar(comentario: string | null | undefined): boolean {
  if (esOrdenRecuperada(comentario)) return false;
  const text = comentarioNormalizado(comentario);
  return text.includes("recuperar") || text.includes("recupero");
}

export function estadoOrden(orden: {
  comentario: string | null | undefined;
  estadoAnulacion?: string | null;
}): EstadoOrden {
  if (orden.estadoAnulacion === "anulada") return "anulada";
  if (orden.estadoAnulacion === "por_anular") return "por_anular";
  if (esOrdenRecuperada(orden.comentario)) return "recuperada";
  if (esOrdenPorRecuperar(orden.comentario)) return "por_recuperar";
  return "sin_registro";
}

export function equiposRecuperadosDe(comentario: string | null | undefined): string {
  const match = (comentario ?? "").match(/equipos recuperados:\s*(.+)$/im);
  if (match?.[1]?.trim()) return match[1].trim();
  const recibido = (comentario ?? "").match(/se recibe equipo\s+(.+)$/im);
  return recibido?.[1]?.trim() ?? "";
}

export function withEquiposRecuperados(
  comentario: string | null | undefined,
  equipos: string,
): string {
  const limpio = (comentario ?? "")
    .replace(/Equipos recuperados:.*$/gim, "")
    .replace(/se recibe equipo.*$/gim, "")
    .trim();
  if (!equipos.trim()) return limpio;
  return `${limpio}\nEquipos recuperados: ${equipos.trim()}`.trim();
}

export function withRecupero(
  comentario: string | null | undefined,
  value: "si" | "no",
): string {
  const limpio = (comentario ?? "")
    .replace(/Recuperó equipo:.*$/gim, "")
    .replace(/Recupero equipo:.*$/gim, "")
    .replace(/Equipos recuperados:.*$/gim, "")
    .replace(/se recibe equipo.*$/gim, "")
    .trim();
  const linea = value === "si" ? "Recuperó equipo: sí" : "Recuperó equipo: no";
  return [limpio, linea].filter(Boolean).join("\n");
}

export function estadoOrdenLabel(estado: EstadoOrden): string {
  switch (estado) {
    case "recuperada":
      return "Recuperada";
    case "por_recuperar":
      return "Por recuperar";
    case "por_anular":
      return "Por anular";
    case "anulada":
      return "Anulada";
    default:
      return "Sin registro";
  }
}

export function estadoOrdenSeverity(
  estado: EstadoOrden,
): "success" | "warning" | "danger" | "secondary" | "info" {
  switch (estado) {
    case "recuperada":
      return "success";
    case "por_recuperar":
      return "warning";
    case "por_anular":
      return "danger";
    case "anulada":
      return "secondary";
    default:
      return "info";
  }
}
