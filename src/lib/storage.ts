const hasStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const getStorageItem = (key: string): string | null => {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Storage read failed", error);
    return null;
  }
};

export const setStorageItem = (key: string, value: string) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Storage write failed", error);
  }
};

export const removeStorageItem = (key: string) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("Storage remove failed", error);
  }
};

export const getJsonStorageItem = <T>(key: string, fallback: T): T => {
  const raw = getStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("Storage JSON parse failed", error);
    return fallback;
  }
};

export const setJsonStorageItem = <T>(key: string, value: T) => {
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Storage JSON stringify failed", error);
  }
};
