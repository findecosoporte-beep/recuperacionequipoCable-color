import { z } from "zod";

const emptyToUndefined = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const asignacionQuerySchema = z.object({
  tecnicoId: emptyToUndefined(40),
  q: emptyToUndefined(100),
});

export const asignarCiudadSchema = z.object({
  tecnicoId: z
    .string({ error: "tecnicoId es obligatorio" })
    .trim()
    .min(1, "tecnicoId es obligatorio")
    .max(40),
  ciudad: z
    .string({ error: "ciudad es obligatoria" })
    .trim()
    .min(2, "ciudad debe tener al menos 2 caracteres")
    .max(100),
  colonia: z.string().trim().max(100).optional(),
  modo: z.enum(["libres", "todas"]).default("libres"),
});

export const liberarCiudadSchema = z.object({
  tecnicoId: z
    .string({ error: "tecnicoId es obligatorio" })
    .trim()
    .min(1, "tecnicoId es obligatorio")
    .max(40),
  ciudad: z
    .string({ error: "ciudad es obligatoria" })
    .trim()
    .min(2, "ciudad debe tener al menos 2 caracteres")
    .max(100),
  colonia: z.string().trim().max(100).optional(),
});

export type AsignacionQuery = z.infer<typeof asignacionQuerySchema>;
export const asignarOrdenSchema = z.object({
  ordenId: z
    .string({ error: "ordenId es obligatorio" })
    .trim()
    .min(1, "ordenId es obligatorio")
    .max(40),
  tecnicoId: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .nullable(),
});

export type AsignarCiudadInput = z.infer<typeof asignarCiudadSchema>;
export type LiberarCiudadInput = z.infer<typeof liberarCiudadSchema>;
export type AsignarOrdenInput = z.infer<typeof asignarOrdenSchema>;
