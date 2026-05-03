/**
 * Tiny bounded in-memory LRU cache used as the L1 tier in front of Supabase.
 *
 * Designed to be safe on serverless: bounded size, TTL per entry, and tolerant
 * of loss on cold start. Not a distributed cache.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class LruCache<K, V> {
  private readonly map = new Map<K, Entry<V>>();

  constructor(private readonly maxSize = 200) {}

  get(key: K, now = Date.now()): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.map.delete(key);
      return undefined;
    }
    // Touch: re-insert to move to the end (most recent).
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs: number, now = Date.now()): void {
    // Single Map mutation — `delete` is a no-op if missing, so the explicit
    // `has` check just doubled the lookup. Re-inserting moves to LRU tail.
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: now + ttlMs });
    // Sweep at most a handful of expired entries from the LRU head so we don't
    // evict still-valid entries solely because of recency. Keeps `set` O(1)
    // amortized while preventing TTL-expired entries from blocking writes.
    let swept = 0;
    for (const [k, entry] of this.map) {
      if (entry.expiresAt > now || swept >= 4) break;
      this.map.delete(k);
      swept++;
    }
    // Bounded; LRU eviction. The map only ever exceeds maxSize by 1 because
    // we just inserted, so a single delete is sufficient — no `while` needed.
    if (this.map.size > this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}
