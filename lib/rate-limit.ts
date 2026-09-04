import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getRateLimitMax, getRateLimitWindowMs } from "@/lib/env";
import { tooManyRequests } from "@/lib/errors";
import {
  LIMITS,
  clientIp,
  consumeMemory,
  type ConsumeResult,
  type MemoryBucket,
  type RateLimitKind,
} from "@/lib/rate-limit-policy";

export type { RateLimitKind };

const memory = new Map<string, MemoryBucket>();
let pruneCounter = 0;

function ipKey(kind: string, request: NextRequest): string {
  return `${kind}:ip:${clientIp(request.headers)}`;
}

export function emailLimitKey(email: string): string {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 40);
  return `login:email:${hash}`;
}

async function consumeShared(
  key: string,
  max: number,
  windowMs: number,
): Promise<ConsumeResult> {
  const resetAt = new Date(Date.now() + windowMs);
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: Date }>>`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT (key) DO UPDATE
      SET
        count = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        reset_at = CASE
          WHEN rate_limit_buckets.reset_at <= NOW() THEN ${resetAt}
          ELSE rate_limit_buckets.reset_at
        END
      RETURNING count, reset_at
    `;
    pruneCounter += 1;
    if (pruneCounter % 200 === 0) {
      await prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE reset_at < NOW()`.catch(
        () => undefined,
      );
    }
    const row = rows[0];
    const retryAfterSeconds = row
      ? Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000))
      : Math.ceil(windowMs / 1000);
    return {
      limited: (row?.count ?? 1) > max,
      count: row?.count ?? 1,
      retryAfterSeconds,
    };
  } catch {
    return consumeMemory(memory, `fallback:${key}`, Date.now(), max, windowMs);
  }
}

function deny(message: string, retryAfterSeconds: number): never {
  throw tooManyRequests(message, retryAfterSeconds);
}

export async function enforceRateLimit(
  request: NextRequest,
  kind: RateLimitKind = "api",
): Promise<void> {
  const now = Date.now();

  if (kind === "health") {
    const burst = consumeMemory(
      memory,
      ipKey("health", request),
      now,
      LIMITS.healthBurstMax,
      LIMITS.healthBurstWindowMs,
    );
    if (burst.limited) {
      deny("Demasiadas comprobaciones de salud. Espera unos segundos.", burst.retryAfterSeconds);
    }
    return;
  }

  if (kind === "login") {
    const burst = consumeMemory(
      memory,
      ipKey("login-burst", request),
      now,
      LIMITS.loginBurstMax,
      LIMITS.loginBurstWindowMs,
    );
    if (burst.limited) {
      deny(
        "Demasiados intentos de entrada. Espera un minuto y vuelve a probar.",
        burst.retryAfterSeconds,
      );
    }
    const shared = await consumeShared(
      ipKey("login", request),
      LIMITS.loginIpMax,
      LIMITS.loginIpWindowMs,
    );
    if (shared.limited) {
      deny(
        "Demasiados intentos de entrada desde esta red. Espera 15 minutos.",
        shared.retryAfterSeconds,
      );
    }
    return;
  }

  const burst = consumeMemory(
    memory,
    ipKey("api-burst", request),
    now,
    LIMITS.apiBurstMax,
    LIMITS.apiBurstWindowMs,
  );
  if (burst.limited) {
    deny("Demasiadas solicitudes seguidas. Espera unos segundos.", burst.retryAfterSeconds);
  }

  const shared = await consumeShared(
    ipKey("api", request),
    getRateLimitMax(),
    getRateLimitWindowMs(),
  );
  if (shared.limited) {
    deny(
      `Límite de ${getRateLimitMax()} solicitudes por minuto alcanzado`,
      shared.retryAfterSeconds,
    );
  }
}

export async function enforceLoginEmailLimit(email: string): Promise<void> {
  const result = await consumeShared(
    emailLimitKey(email),
    LIMITS.loginEmailMax,
    LIMITS.loginEmailWindowMs,
  );
  if (result.limited) {
    deny(
      "Demasiados intentos de entrada para esta cuenta. Espera 15 minutos.",
      result.retryAfterSeconds,
    );
  }
}
