export type RateLimitKind = "api" | "login" | "health";

export interface MemoryBucket {
  count: number;
  resetAt: number;
}

export interface ConsumeResult {
  limited: boolean;
  count: number;
  retryAfterSeconds: number;
}

export const LIMITS = {
  apiBurstMax: 30,
  apiBurstWindowMs: 10_000,
  apiSharedMax: 90,
  apiSharedWindowMs: 60_000,
  loginBurstMax: 8,
  loginBurstWindowMs: 60_000,
  loginIpMax: 10,
  loginIpWindowMs: 15 * 60_000,
  loginEmailMax: 8,
  loginEmailWindowMs: 15 * 60_000,
  healthBurstMax: 20,
  healthBurstWindowMs: 10_000,
} as const;

export function clientIp(headers: {
  get(name: string): string | null;
}): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().slice(0, 80) || "unknown";
  }
  return "unknown";
}

export function consumeMemory(
  buckets: Map<string, MemoryBucket>,
  key: string,
  now: number,
  max: number,
  windowMs: number,
  maxKeys = 4_000,
): ConsumeResult {
  if (buckets.size >= maxKeys) {
    for (const [itemKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(itemKey);
    }
    if (buckets.size >= maxKeys) {
      return { limited: true, count: max + 1, retryAfterSeconds: 10 };
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, count: 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  current.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return {
    limited: current.count > max,
    count: current.count,
    retryAfterSeconds,
  };
}
