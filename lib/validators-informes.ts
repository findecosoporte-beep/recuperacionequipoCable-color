import { z } from "zod";

export const informeRecepcionCreateSchema = z.object({
  archivo: z
    .string()
    .trim()
    .min(1, "archivo es obligatorio")
    .max(180),
  filas: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "El Excel no tiene filas")
    .max(5000, "El Excel no puede superar 5000 filas"),
});

export type InformeRecepcionCreateInput = z.infer<typeof informeRecepcionCreateSchema>;
