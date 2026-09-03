import { z } from "zod";

const text = (min: number, max: number, field: string) =>
  z
    .string({ error: `${field} es obligatorio` })
    .trim()
    .min(min, `${field} debe tener al menos ${min} caracteres`)
    .max(max, `${field} no puede superar ${max} caracteres`);

export const ordenCreateSchema = z.object({
  orden: text(1, 50, "orden"),
  cliente: text(2, 150, "cliente"),
  ciudad: text(2, 100, "ciudad"),
  colonia: text(2, 100, "colonia"),
  direccion: text(5, 255, "direccion"),
  telefono: z
    .string({ error: "telefono es obligatorio" })
    .trim()
    .min(8, "telefono debe tener al menos 8 caracteres")
    .max(80, "telefono no puede superar 80 caracteres")
    .regex(/^[+\d\s()-]+$/, "telefono tiene un formato inválido"),
  comentario: z
    .string()
    .trim()
    .max(2000, "comentario no puede superar 2000 caracteres")
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  estadoAnulacion: z.enum(["por_anular", "anulada"]).nullable().optional(),
  tecnicoId: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .nullable()
    .optional(),
});

export const ordenUpdateSchema = ordenCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Debes enviar al menos un campo para actualizar" },
);

export const ordenBulkSchema = z
  .array(ordenCreateSchema)
  .min(1, "Debes enviar al menos una orden")
  .max(500, "El lote no puede superar 500 órdenes");

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

export const listQuerySchema = z.object({
  page: numberFromQuery(1, 1),
  limit: numberFromQuery(20, 1, 100),
  q: emptyToUndefined(150),
  ciudad: emptyToUndefined(100),
  colonia: emptyToUndefined(100),
  cliente: emptyToUndefined(150),
  orden: emptyToUndefined(50),
  estado: z.enum(["recuperada", "por_recuperar", "por_anular", "anulada"]).optional(),
  tecnicoId: emptyToUndefined(40),
  recuperadoPorId: emptyToUndefined(40),
  asignacion: z.enum(["sin_asignar", "asignada"]).optional(),
  sort: z.enum(["createdAt", "orden", "cliente", "ciudad", "recuperadaEn"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  desde: emptyToUndefined(10),
  hasta: emptyToUndefined(10),
  equipo: emptyToUndefined(80),
});

export const acuseListQuerySchema = z.object({
  page: numberFromQuery(1, 1),
  limit: numberFromQuery(20, 1, 100),
  q: emptyToUndefined(150),
});

export type OrdenCreateInput = z.infer<typeof ordenCreateSchema>;
export type OrdenUpdateInput = z.infer<typeof ordenUpdateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type AcuseListQuery = z.infer<typeof acuseListQuerySchema>;
