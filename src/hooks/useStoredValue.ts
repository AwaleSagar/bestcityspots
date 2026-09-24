"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getStorageItem, removeStorageItem, setStorageItem } from "@/lib/storage";

/**
 * localStorage-backed state shared by every component that reads the same
 * key (e.g. the header "Saved" count and the places explorer stay in sync),
 * including across tabs via the `storage` event.
 *
 * Built on useSyncExternalStore: the server snapshot is the provided
 * fallback, so pre-rendered HTML never depends on browser storage and
 * hydration cannot mismatch.
 */

const LOCAL_EVENT = "bcs:storage";

interface CacheEntry {
  raw: string | null;
  value: unknown;
}

const snapshotCache = new Map<string, CacheEntry>();

function subscribe(key: string, onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) onChange();
  };
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<string>).detail === key) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCAL_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_EVENT, onLocal);
  };
}

function readSnapshot<T>(key: string, parse: (raw: string | null) => T): T {
  const raw = getStorageItem(key);
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  const value = parse(raw);
  snapshotCache.set(key, { raw, value });
  return value;
}

export function writeStoredValue(key: string, raw: string | null) {
  if (raw === null) removeStorageItem(key);
  else setStorageItem(key, raw);
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key }));
}

/**
 * @param parse must tolerate null/garbage and return a fallback.
 * @param serverValue must be referentially stable (module constant).
 */
export function useStoredValue<T>(
  key: string,
  parse: (raw: string | null) => T,
  serverValue: T,
  serialize: (value: T) => string | null = (value) => JSON.stringify(value)
): [T, (update: T | ((previous: T) => T)) => void] {
  const value = useSyncExternalStore(
    useCallback((onChange: () => void) => subscribe(key, onChange), [key]),
    () => readSnapshot(key, parse),
    () => serverValue
  );

  const setValue = useCallback(
    (update: T | ((previous: T) => T)) => {
      const previous = readSnapshot(key, parse);
      const next = typeof update === "function" ? (update as (previous: T) => T)(previous) : update;
      writeStoredValue(key, serialize(next));
    },
    [key, parse, serialize]
  );

  return [value, setValue];
}

/** True after hydration; false during SSR and the hydrating render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function noopSubscribe() {
  return () => {};
}
