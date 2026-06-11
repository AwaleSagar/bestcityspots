import "server-only";
import type { CacheFreshness } from "@/lib/cache-config";

export interface CacheSnapshot<T> {
  value: T | null;
  updatedAt: string | null;
}

export interface SwrOrchestrationOptions<T> {
  /**
   * Stable identity for this cache entry (e.g. `weather:123`). When provided,
   * concurrent calls for the same key share a single in-flight orchestration —
   * stampede protection so a crawler burst hitting one cold page triggers at
   * most one provider fetch per process (incident action P1).
   */
  key?: string;
  readCache: () => Promise<CacheSnapshot<T>>;
  classify: (updatedAt: string | null) => CacheFreshness;
  fetchFresh: () => Promise<T | null>;
  writeCache?: (value: T) => Promise<void>;
  onError?: (event: string, error: unknown) => void;
}

// Per-process single-flight registry. Bounded by the number of concurrently
// cold keys; entries are removed as soon as their orchestration settles.
const inFlight = new Map<string, Promise<unknown>>();

async function safeWrite<T>(
  writeCache: ((value: T) => Promise<void>) | undefined,
  value: T,
  onError?: (event: string, error: unknown) => void
): Promise<void> {
  if (!writeCache) return;
  try {
    await writeCache(value);
  } catch (error) {
    onError?.("cache_write_failed", error);
  }
}

export async function runCacheFirstSWR<T>(options: SwrOrchestrationOptions<T>): Promise<T | null> {
  if (!options.key) {
    return orchestrate(options);
  }

  const existing = inFlight.get(options.key);
  if (existing) {
    return existing as Promise<T | null>;
  }

  const run = orchestrate(options).finally(() => {
    inFlight.delete(options.key as string);
  });
  inFlight.set(options.key, run);
  return run;
}

async function orchestrate<T>(options: SwrOrchestrationOptions<T>): Promise<T | null> {
  let cached: CacheSnapshot<T> = { value: null, updatedAt: null };

  try {
    cached = await options.readCache();
  } catch (error) {
    options.onError?.("cache_read_failed", error);
  }

  if (cached.value !== null) {
    const freshness = options.classify(cached.updatedAt);

    if (freshness === "fresh") {
      return cached.value;
    }

    if (freshness === "swr") {
      void options
        .fetchFresh()
        .then(async (fresh) => {
          if (fresh !== null) {
            await safeWrite(options.writeCache, fresh, options.onError);
          }
        })
        .catch((error) => {
          options.onError?.("background_refresh_failed", error);
        });

      return cached.value;
    }
  }

  try {
    const fresh = await options.fetchFresh();
    if (fresh !== null) {
      await safeWrite(options.writeCache, fresh, options.onError);
      return fresh;
    }
  } catch (error) {
    options.onError?.("live_fetch_failed", error);
  }

  return cached.value;
}
