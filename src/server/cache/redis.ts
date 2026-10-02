import "server-only";

import { Redis } from "@upstash/redis";

const cachePrefix = `argus:${process.env.NODE_ENV ?? "development"}:${process.env.DEMO_MODE ?? "unset"}:cache`;
const cacheVersionKey = `${cachePrefix}:version`;

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

async function cacheVersion() {
  if (!redis) return 1;
  try {
    await redis.set(cacheVersionKey, 1, { nx: true });
    return (await redis.get<number>(cacheVersionKey)) ?? 1;
  } catch {
    return 1;
  }
}

export async function withCache<T>(parts: string[], loader: () => Promise<T>, ttlSeconds = 10): Promise<T> {
  if (!redis) return loader();
  const key = `${cachePrefix}:v${await cacheVersion()}:${parts.map((part) => encodeURIComponent(part)).join(":")}`;
  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) return cached;
  } catch {
    // Redis is an optional accelerator; a connection failure must not block reads.
  }

  const value = await loader();
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Keep the database response successful when the cache write fails.
  }
  return value;
}

export async function invalidateCache() {
  if (!redis) return;
  try {
    await redis.incr(cacheVersionKey);
  } catch {
    // Cache invalidation is best effort; TTL remains the fallback boundary.
  }
}
