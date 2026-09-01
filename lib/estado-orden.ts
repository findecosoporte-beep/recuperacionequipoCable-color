export type EstadoAnulacion = "por_anular" | "anulada";

export type EstadoOrden =
  | "recuperada"
  | "por_recuperar"
  | "por_anular"
  | "anulada"
  | "sin_registro";

const RECUPERADA_MARCADORES = [
  "recuperó equipo: sí",
  "recupero equipo: sí",
  "recuperó equipo: si",
  "recupero equipo: si",
  "equipos recuperados:",
  "se recibe equipo",
];

export function comentarioNormalizado(comentario: string | null | undefined): string {
  return (comentario ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function esOrdenRecuperada(comentario: string | null | undefined): boolean {
  const text = comentarioNormalizado(comentario);
  return RECUPERADA_MARCADORES.some((marker) => text.includes(comentarioNormalizado(marker)));
}

export function esOrdenPorRecuperar(comentario: string | null | undefined): boolean {
  if (esOrdenRecuperada(comentario)) return false;
  const text = comentarioNormalizado(comentario);
  return text.includes("recuperar");
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
