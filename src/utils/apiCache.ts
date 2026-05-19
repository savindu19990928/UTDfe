// Lightweight in-memory cache for API responses.
// No preloading, no sessionStorage persistence.
// Data is cached only for the current browsing session in memory.

interface CacheEntry {
  data: any;
  ts: number;
}

const memory = new Map<string, CacheEntry>();

const DEFAULT_TTL = 5 * 60_000; // 5 minutes
const FRESH_TTL = 2 * 60_000; // 2 minutes — within this window, skip the network

export { DEFAULT_TTL, FRESH_TTL };

export function getCached<T = any>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    memory.delete(key);
    return null;
  }
  return entry.data as T;
}

export function isFresh(key: string, ttl = FRESH_TTL): boolean {
  const entry = memory.get(key);
  if (!entry) return false;
  return Date.now() - entry.ts <= ttl;
}

export function setCache(key: string, data: any): void {
  memory.set(key, { data, ts: Date.now() });
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    memory.clear();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}