type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

/** Simple in-memory TTL cache to spare provider rate limits. */
export function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);
  return fetcher().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

/** Return the cached value only if still within its TTL. */
export function cacheGetFresh<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  return hit && hit.expiresAt > Date.now() ? hit.value : undefined;
}

/** Return the last cached value regardless of expiry (stale-while-error). */
export function cacheGetStale<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  return hit?.value;
}

/** Manually store a value (used to seed the cache from a batch fetch). */
export function cacheSet<T>(key: string, ttlMs: number, value: T): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
