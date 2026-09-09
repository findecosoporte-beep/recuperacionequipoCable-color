import { z } from "zod";

const periodoSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodo inválido");

export const informeRecepcionListSchema = z.object({
  periodo: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(periodoSchema.optional()),
});

export const informeRecepcionCreateSchema = z.object({
  archivo: z
    .string()
    .trim()
    .min(1, "archivo es obligatorio")
    .max(180),
  periodo: periodoSchema.optional(),
  filas: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "El Excel no tiene filas")
    .max(8000, "El Excel no puede superar 8000 filas"),
});

export type InformeRecepcionCreateInput = z.infer<typeof informeRecepcionCreateSchema>;
