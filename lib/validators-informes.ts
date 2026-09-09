import { z } from "zod";

const periodoSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodo inválido");

export const informeResumenClientesSchema = z.object({
  ciudad: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  tipoEquipo: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  empresaEjecutora: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const informeResumenPendienteSchema = z.object({
  ciudad: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  periodo: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(periodoSchema.optional()),
  tipoEquipo: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  empresaEjecutora: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const informeRecepcionListSchema = z.object({
  periodo: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(periodoSchema.optional()),
});

const emptyToUndefined = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const numberFromQuery = (fallback: number, min: number, max?: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") {
      return fallback;
    }
    return Number(value);
  }, z.number().int().min(min).max(max ?? Number.MAX_SAFE_INTEGER));

export const informeFilasQuerySchema = z.object({
  periodo: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(periodoSchema.optional()),
  ciudad: emptyToUndefined(100),
  tipoEquipo: emptyToUndefined(80),
  codigoCliente: emptyToUndefined(80),
  numeroOrden: emptyToUndefined(80),
  empresa: emptyToUndefined(100),
  empresaEjecutora: emptyToUndefined(100),
  q: emptyToUndefined(150),
  page: numberFromQuery(1, 1),
  limit: numberFromQuery(10, 1, 100),
});

export type InformeFilasQuery = z.infer<typeof informeFilasQuerySchema>;

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
