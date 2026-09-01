import type { ApiResponse } from "@/lib/types";

const TOKEN_KEY = "ordenes_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const auth = token === undefined ? getStoredToken() : token;
  if (auth) {
    headers.set("Authorization", `Bearer ${auth}`);
  }

  const response = await fetch(path, { ...options, headers });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !("success" in body) || body.success !== true) {
    const message =
      "error" in body ? body.error?.message : "No se pudo completar la solicitud";
    throw new Error(message ?? "No se pudo completar la solicitud");
  }

  return body.data;
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<{
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  const auth = token === undefined ? getStoredToken() : token;
  if (auth) {
    headers.set("Authorization", `Bearer ${auth}`);
  }

  const response = await fetch(path, { ...options, headers });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !("success" in body) || body.success !== true) {
    const message =
      "error" in body ? body.error?.message : "No se pudo completar la solicitud";
    throw new Error(message ?? "No se pudo completar la solicitud");
  }

  return { data: body.data, meta: body.meta };
}
