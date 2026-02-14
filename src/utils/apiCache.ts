// Lightweight in-memory cache for API responses
// Prevents redundant fetches when navigating between pages

const cache = new Map<string, {data: any;ts: number;}>();
const DEFAULT_TTL = 5 * 60_000; // 5 minutes
const FRESH_TTL = 60_000; // 1 minute — considered "fresh" (skip network)

export { DEFAULT_TTL, FRESH_TTL };

export function getCached<T = any>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    // Stale but still return it — caller can decide to refetch
    return entry.data;
  }
  return entry.data;
}

export function isFresh(key: string, ttl = FRESH_TTL): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.ts <= ttl;
}

export function setCache(key: string, data: any): void {
  cache.set(key, { data, ts: Date.now() });
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}