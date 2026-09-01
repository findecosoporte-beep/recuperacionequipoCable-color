import { z } from "zod";

const text = (min: number, max: number, field: string) =>
  z
    .string({ error: `${field} es obligatorio` })
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar ${max} caracteres`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const tecnicoCreateSchema = z.object({
  nombre: text(2, 150, "nombre"),
  email: z
    .string({ error: "email es obligatorio" })
    .trim()
    .email("email no es válido")
    .max(150)
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: "password es obligatorio" })
    .min(6, "password debe tener al menos 6 caracteres")
    .max(100),
  telefono: z
    .string()
    .trim()
    .max(20, "telefono no puede superar 20 caracteres")
    .regex(/^$|^[+\d\s()-]+$/, "telefono tiene un formato inválido")
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  zona: optionalText(100),
  activo: z.boolean().optional().default(true),
});

export const tecnicoUpdateSchema = z
  .object({
    nombre: text(2, 150, "nombre").optional(),
    email: z
      .string()
      .trim()
      .email("email no es válido")
      .max(150)
      .transform((value) => value.toLowerCase())
      .optional(),
    password: z
      .string()
      .min(6, "password debe tener al menos 6 caracteres")
      .max(100)
      .optional(),
    telefono: z
      .string()
      .trim()
      .max(20, "telefono no puede superar 20 caracteres")
      .regex(/^$|^[+\d\s()-]+$/, "telefono tiene un formato inválido")
      .optional()
      .nullable()
      .transform((value) => (value ? value : null)),
    zona: optionalText(100),
    activo: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
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

export const tecnicoListQuerySchema = z.object({
  page: numberFromQuery(1, 1),
  limit: numberFromQuery(20, 1, 100),
  q: emptyToUndefined(150),
  zona: emptyToUndefined(100),
  activo: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => {
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      return undefined;
    }),
});

export type TecnicoCreateInput = z.infer<typeof tecnicoCreateSchema>;
export type TecnicoUpdateInput = z.infer<typeof tecnicoUpdateSchema>;
export type TecnicoListQuery = z.infer<typeof tecnicoListQuerySchema>;
