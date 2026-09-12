/* eslint-disable */
/**
 * Verification for src/lib/storage.ts (Browser storage utilities).
 * Run: tsx scripts/test-storage.ts
 */

// 1. Mock global window and storage APIs BEFORE importing the module
class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

(global as any).window = {
  localStorage: new MockStorage(),
  sessionStorage: new MockStorage(),
};

import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getJsonStorageItem,
  setJsonStorageItem,
  getSessionStorageItem,
  setSessionStorageItem,
} from "../src/lib/storage";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("storage: LocalStorage wrappers");
{
  setStorageItem("username", "sagar");
  check("writes string to localStorage", getStorageItem("username") === "sagar");

  removeStorageItem("username");
  check("removes item from localStorage", getStorageItem("username") === null);
}

console.log("storage: JSON LocalStorage serialization");
{
  const complexData = { name: "Paris", rating: 4.8, active: true };
  setJsonStorageItem("favorite_city", complexData);

  const parsedData = getJsonStorageItem<any>("favorite_city", null);
  check(
    "serializes and parses JSON objects correctly",
    parsedData !== null && parsedData.name === "Paris" && parsedData.rating === 4.8
  );

  const parsedFallback = getJsonStorageItem("non_existent_key", { defaultVal: true });
  check("resolves fallback value for missing items", parsedFallback.defaultVal === true);

  // Set invalid JSON and check that fallback triggers
  setStorageItem("broken_json", "{invalid-json");
  const parsedBroken = getJsonStorageItem("broken_json", "fallback_str");
  check("gracefully handles invalid JSON and returns fallback", parsedBroken === "fallback_str");
}

console.log("storage: SessionStorage wrappers");
{
  setSessionStorageItem("session_id", "session_abc123");
  check(
    "writes values into sessionStorage",
    getSessionStorageItem("session_id") === "session_abc123"
  );
}

if (failures > 0) {
  console.error(`\nStorage verification failed with ${failures} failure(s)`);
  process.exit(1);
} else {
  console.log("\nAll storage wrappers tests passed successfully!");
  process.exit(0);
}
