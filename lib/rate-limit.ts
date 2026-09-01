import { NextRequest } from "next/server";
import { getRateLimitMax, getRateLimitWindowMs } from "@/lib/env";
import { tooManyRequests } from "@/lib/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function prune(now: number): void {
  if (buckets.size < 2_000) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function enforceRateLimit(request: NextRequest): void {
  const now = Date.now();
  const windowMs = getRateLimitWindowMs();
  const max = getRateLimitMax();
  const key = clientKey(request);

  prune(now);

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  if (current.count > max) {
    throw tooManyRequests(
      `Límite de ${max} solicitudes por minuto alcanzado`,
    );
  }
}
