import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { jwtExpiresForRole, getJwtSecret } from "@/lib/env";
import { ApiError, unauthorized } from "@/lib/errors";

export interface AuthTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  nombre: string;
  rol: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export async function signAuthToken(user: {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}): Promise<string> {
  return new SignJWT({
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(jwtExpiresForRole(user.rol))
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") {
      throw unauthorized("Sesión inválida");
    }
    return payload as AuthTokenPayload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw unauthorized("Sesión inválida o expirada");
  }
}

export function looksLikeJwt(token: string): boolean {
  return token.split(".").length === 3;
}
