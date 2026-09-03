export const MOTIVOS_ANULACION = [
  {
    id: "no_contesta",
    label: "No contestan los teléfonos",
    texto:
      "No contestan los números de teléfono. No se pudo contactar al cliente para recuperar el equipo.",
  },
  {
    id: "se_mudo",
    label: "Se mudó de lugar",
    texto:
      "El cliente se mudó de domicilio. Ya no se encuentra en la dirección de la orden.",
  },
  {
    id: "ya_entrego",
    label: "Ya entregó el equipo",
    texto: "El cliente ya entregó el equipo.",
  },
  {
    id: "otro_tecnico",
    label: "A otro técnico",
    texto: "La orden o el retiro del equipo corresponde a otro técnico.",
  },
  {
    id: "cliente_activo",
    label: "Cliente activo",
    texto:
      "No se pudo retirar el equipo. El cliente está activo.",
  },
] as const;

export type MotivoAnulacionId = (typeof MOTIVOS_ANULACION)[number]["id"];

export function textoMotivoAnulacion(id: MotivoAnulacionId): string {
  return MOTIVOS_ANULACION.find((item) => item.id === id)?.texto ?? "";
}
