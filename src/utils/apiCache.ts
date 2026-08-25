// Lightweight in-memory cache for API responses.
// Data is cached in localStorage to allow instant rendering across sessions.
// In-flight requests are shared so a prefetch and a component mounting at the
// same moment result in a single network round-trip.

interface CacheEntry {
  data: any;
  ts: number;
}

const memory = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<any>>();

const DEFAULT_TTL = 5 * 60_000; // 5 minutes
const FRESH_TTL = 2 * 60_000; // 2 minutes — within this window, skip the network

// Hydrate from localStorage
try {
  const stored = localStorage.getItem('pos_api_cache');
  if (stored) {
    const parsed = JSON.parse(stored);
    for (const [key, value] of Object.entries(parsed)) {
      memory.set(key, value as CacheEntry);
    }
  }
} catch (e) {}

function saveToLocalStorage() {
  try {
    const obj = Object.fromEntries(memory);
    localStorage.setItem('pos_api_cache', JSON.stringify(obj));
  } catch (e) {}
}

export { DEFAULT_TTL, FRESH_TTL };

export function getCached<T = any>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) {
    memory.delete(key);
    saveToLocalStorage();
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
  saveToLocalStorage();
}

// Runs `fn` once per key while it is in flight. Concurrent callers with the
// same key await the same promise instead of firing duplicate requests.
export function sharedRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

// Returns the in-flight promise for a key, if one is already running.
export function getInflight<T = any>(key: string): Promise<T> | null {
  return inflight.get(key) as Promise<T> | undefined ?? null;
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    memory.clear();
    inflight.clear();
    saveToLocalStorage();
    return;
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
  saveToLocalStorage();
}