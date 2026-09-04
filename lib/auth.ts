import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getApiKey, isProduction } from "@/lib/env";
import { forbidden, unauthorized } from "@/lib/errors";
import { esAdmin, esRolPanel, usuarioSesionValida } from "@/lib/roles";
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
  telefono?: string | null;
  zona?: string | null;
  activo?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    telefono: user.telefono ?? null,
    zona: user.zona ?? null,
    activo: user.activo ?? true,
  };
}

const authPorRequest = new WeakMap<NextRequest, Promise<AuthContext>>();

async function resolverAuth(request: NextRequest): Promise<AuthContext> {
  const bearer = extractBearer(request);
  const headerKey = request.headers.get("x-api-key")?.trim() ?? null;

  if (bearer && looksLikeJwt(bearer)) {
    const payload = await verifyAuthToken(bearer);
    const user = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    });
    if (!usuarioSesionValida(user) || !user) {
      throw unauthorized("Usuario inactivo o no encontrado");
    }
    return {
      kind: "jwt",
      user: {
        ...payload,
        sub: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
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

export function assertAuth(request: NextRequest): Promise<AuthContext> {
  let pending = authPorRequest.get(request);
  if (!pending) {
    pending = resolverAuth(request);
    authPorRequest.set(request, pending);
  }
  return pending;
}

export async function requirePanelAccess(request: NextRequest) {
  const auth = await assertAuth(request);
  if (auth.kind === "api_key") {
    return auth;
  }
  if (!esRolPanel(auth.user.rol)) {
    throw forbidden("Esta cuenta es de técnico recuperador. Usa la app de campo.");
  }
  return auth;
}

export async function requireAdmin(request: NextRequest) {
  const auth = await assertAuth(request);
  if (auth.kind === "api_key") {
    return auth;
  }
  if (!esAdmin(auth.user.rol)) {
    throw forbidden("Solo el administrador puede hacer esta acción");
  }
  return auth;
}

export async function requireSessionUser(request: NextRequest) {
  const auth = await assertAuth(request);
  if (auth.kind !== "jwt" || !auth.user.sub) {
    throw unauthorized("Inicia sesión para continuar");
  }

  const user = await prisma.usuario.findUnique({
    where: { id: auth.user.sub },
    select: {
      id: true,
      email: true,
      nombre: true,
      rol: true,
      activo: true,
      telefono: true,
      zona: true,
    },
  });

  if (!usuarioSesionValida(user) || !user) {
    throw unauthorized("Usuario inactivo o no encontrado");
  }

  return publicUser(user);
}
