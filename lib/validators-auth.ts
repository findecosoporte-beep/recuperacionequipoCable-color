import { z } from "zod";

export const loginSchema = z.object({
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
});
