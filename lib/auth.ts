import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getApiKey, isProduction } from "@/lib/env";
import { unauthorized } from "@/lib/errors";
import { looksLikeJwt, verifyAuthToken, type AuthTokenPayload } from "@/lib/jwt";

export type AuthContext =
  | { kind: "jwt"; user: AuthTokenPayload }
  | { kind: "api_key" };

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function extractBearer(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  return null;
}

export function publicUser(user: {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}) {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  };
}

export async function assertAuth(request: NextRequest): Promise<AuthContext> {
  const bearer = extractBearer(request);
  const headerKey = request.headers.get("x-api-key")?.trim() ?? null;

  if (bearer && looksLikeJwt(bearer)) {
    const payload = await verifyAuthToken(bearer);
    return { kind: "jwt", user: payload };
  }

  const expected = getApiKey();
  const provided = headerKey ?? bearer;

  if (expected && provided && safeEqual(provided, expected)) {
    return { kind: "api_key" };
  }

  if (!expected && !isProduction() && !bearer && !headerKey) {
    return { kind: "api_key" };
  }

  throw unauthorized("Credenciales inválidas o sesión expirada");
}

export async function requireSessionUser(request: NextRequest) {
  const auth = await assertAuth(request);
  if (auth.kind !== "jwt" || !auth.user.sub) {
    throw unauthorized("Inicia sesión para continuar");
  }

  const user = await prisma.usuario.findUnique({
    where: { id: auth.user.sub },
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });

  if (!user || !user.activo) {
    throw unauthorized("Usuario inactivo o no encontrado");
  }

  return publicUser(user);
}
