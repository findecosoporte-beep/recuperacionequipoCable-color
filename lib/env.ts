function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getApiKey(): string {
  return process.env.API_KEY ?? "";
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? "";
  if (secret.trim() !== "") {
    return secret;
  }
  if (isProduction()) {
    throw new Error("JWT_SECRET es obligatorio en producción");
  }
  return "dev-jwt-secret-no-usar-en-produccion";
}

export function getJwtExpiresIn(): string {
  return optional("JWT_EXPIRES_IN", "7d");
}

export function getAllowedOrigins(): string[] {
  const raw = optional("ALLOWED_ORIGINS", "*");
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getRateLimitMax(): number {
  const parsed = Number(optional("RATE_LIMIT_MAX", "90"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export function getRateLimitWindowMs(): number {
  const parsed = Number(optional("RATE_LIMIT_WINDOW_MS", "60000"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}
