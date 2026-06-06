import "server-only";
import type { CacheFreshness } from "@/lib/cache-config";

export interface CacheSnapshot<T> {
  value: T | null;
  updatedAt: string | null;
}

export interface SwrOrchestrationOptions<T> {
  readCache: () => Promise<CacheSnapshot<T>>;
  classify: (updatedAt: string | null) => CacheFreshness;
  fetchFresh: () => Promise<T | null>;
  writeCache?: (value: T) => Promise<void>;
  onError?: (event: string, error: unknown) => void;
}

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
