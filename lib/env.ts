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
  return optional("JWT_EXPIRES_IN", "12h");
}

export function getJwtExpiresInTecnico(): string {
  return optional("JWT_EXPIRES_IN_TECNICO", "7d");
}

export function jwtExpiresForRole(rol: string): string {
  return rol === "tecnico" ? getJwtExpiresInTecnico() : getJwtExpiresIn();
}

export function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.trim();
  const parsed = configured
    ? configured
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  if (!isProduction()) {
    return parsed.length > 0 ? parsed : ["*"];
  }

  const withoutWildcard = parsed.filter((origin) => origin !== "*");
  if (withoutWildcard.length > 0) {
    return withoutWildcard;
  }

  const domain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().replace(/^https?:\/\//, "");
  if (domain) {
    return [`https://${domain}`];
  }
  return [];
}

export function corsAllowOrigin(origin: string | null, allowed: string[]): string {
  if (allowed.includes("*")) {
    return "*";
  }
  if (origin && allowed.includes(origin)) {
    return origin;
  }
  if (!origin) {
    return allowed[0] ?? "null";
  }
  return "null";
}

export function getRateLimitMax(): number {
  const parsed = Number(optional("RATE_LIMIT_MAX", "90"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export function getRateLimitWindowMs(): number {
  const parsed = Number(optional("RATE_LIMIT_WINDOW_MS", "60000"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}
