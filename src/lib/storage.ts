// Cache the result — `typeof window` and the `localStorage` getter both
// trigger work in some environments (especially when the browser disables
// storage). One probe per session is plenty.
let cachedHasLocalStorage: boolean | undefined;
let cachedHasSessionStorage: boolean | undefined;

const hasLocalStorage = (): boolean => {
  if (cachedHasLocalStorage !== undefined) return cachedHasLocalStorage;
  cachedHasLocalStorage =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  return cachedHasLocalStorage;
};

const hasSessionStorage = (): boolean => {
  if (cachedHasSessionStorage !== undefined) return cachedHasSessionStorage;
  cachedHasSessionStorage =
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  return cachedHasSessionStorage;
};

// Throttle warn() output — a quota-exceeded loop on a hot path can otherwise
// spam the console with thousands of identical messages per second.
const recentWarnings = new Map<string, number>();
const WARN_THROTTLE_MS = 5_000;
function warnOnce(key: string, ...args: unknown[]): void {
  const now = Date.now();
  const last = recentWarnings.get(key) ?? 0;
  if (now - last < WARN_THROTTLE_MS) return;
  recentWarnings.set(key, now);
  console.warn(...args);
}

export const getStorageItem = (key: string): string | null => {
  if (!hasLocalStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    warnOnce("local.read", "Storage read failed", error);
    return null;
  }
};

export const setStorageItem = (key: string, value: string) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    warnOnce("local.write", "Storage write failed", error);
  }
};

export const removeStorageItem = (key: string) => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    warnOnce("local.remove", "Storage remove failed", error);
  }
};

export const getJsonStorageItem = <T>(key: string, fallback: T): T => {
  const raw = getStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    warnOnce("local.parse", "Storage JSON parse failed", error);
    return fallback;
  }
};

export const setJsonStorageItem = <T>(key: string, value: T) => {
  // Skip serialization entirely on the server / when storage is unavailable.
  if (!hasLocalStorage()) return;
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    warnOnce("local.stringify", "Storage JSON stringify failed", error);
  }
};

export const getSessionStorageItem = (key: string): string | null => {
  if (!hasSessionStorage()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    warnOnce("session.read", "Session storage read failed", error);
    return null;
  }
};

export const setSessionStorageItem = (key: string, value: string) => {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    warnOnce("session.write", "Session storage write failed", error);
  }
};
