import { prisma } from "@/lib/db";
import { publicUser } from "@/lib/auth";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { signAuthToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { enforceLoginEmailLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators-auth";
import { unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(
  async (request) => {
    const input = loginSchema.parse(await readJson(request, { maxBytes: 8_192 }));
    await enforceLoginEmailLimit(input.email);
    const user = await prisma.usuario.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.activo) {
      throw unauthorized("Email o contraseña incorrectos");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw unauthorized("Email o contraseña incorrectos");
    }

    const token = await signAuthToken(user);
    return json({
      token,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
      user: publicUser(user),
    });
  },
  { auth: false, rateLimit: "login" },
);
