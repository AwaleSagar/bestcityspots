/**
 * US-08 (audit AF-5): shareable saved-places token.
 *
 * Format (before base64url): `1|<city>|<id>,<id>,…`
 *  - version prefix for forward compatibility
 *  - place IDs only — notes are NEVER encoded (private by default)
 *  - the common Google place-ID prefix "ChIJ" is stripped to "~" so a
 *    50-place list stays comfortably under the 2k URL budget
 *
 * Pure functions, no browser APIs at module scope — unit-testable and safe
 * to import anywhere.
 */

export const SHARE_PARAM = "shared";
export const MAX_SHARED_PLACES = 50;

// v1: ids only. v2 (US-10): each entry may carry a day suffix `@<n>`.
const VERSION_V1 = "1";
const VERSION_V2 = "2";
const GOOGLE_PREFIX = "ChIJ";
const PREFIX_MARKER = "~";

export interface SharedList {
  city: string;
  ids: string[];
  /** US-10: itinerary day per place id (1-based); absent = unassigned. */
  days: Record<string, number>;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function compressId(id: string): string {
  return id.startsWith(GOOGLE_PREFIX) ? PREFIX_MARKER + id.slice(GOOGLE_PREFIX.length) : id;
}

function expandId(id: string): string {
  return id.startsWith(PREFIX_MARKER) ? GOOGLE_PREFIX + id.slice(PREFIX_MARKER.length) : id;
}

export function encodeSharedList(
  city: string,
  ids: readonly string[],
  days: Record<string, number> = {}
): string {
  const unique = [...new Set(ids)].slice(0, MAX_SHARED_PLACES);
  const entries = unique.map((id) => {
    // id is a validated place id (regex-checked at the call boundary) used as a
    // Record<string, number> key, not arbitrary user input here.
    // eslint-disable-next-line security/detect-object-injection
    const day = days[id];
    const suffix = typeof day === "number" && day > 0 ? `@${day}` : "";
    return compressId(id) + suffix;
  });
  const version = entries.some((entry) => entry.includes("@")) ? VERSION_V2 : VERSION_V1;
  const payload = `${version}|${city.replace(/\|/g, " ")}|${entries.join(",")}`;
  return toBase64Url(payload);
}

export function decodeSharedList(token: string): SharedList | null {
  if (!token || token.length > 4096) return null;
  const payload = fromBase64Url(token);
  if (!payload) return null;

  const [version, city, idsRaw] = payload.split("|");
  if ((version !== VERSION_V1 && version !== VERSION_V2) || !city || idsRaw === undefined) {
    return null;
  }

  const ids: string[] = [];
  const days: Record<string, number> = {};
  for (const rawEntry of idsRaw.split(",")) {
    const [rawId, rawDay] = rawEntry.trim().split("@");
    const id = expandId(rawId);
    if (!/^[A-Za-z0-9_-]{4,128}$/.test(id)) continue;
    ids.push(id);
    if (version === VERSION_V2 && rawDay) {
      const day = Number.parseInt(rawDay, 10);
      // id is regex-validated above (`/^[A-Za-z0-9_-]{4,128}$/`) before this
      // assignment, and day is a bounded integer; both are safe Record keys.
      // eslint-disable-next-line security/detect-object-injection
      if (Number.isInteger(day) && day > 0 && day <= 99) days[id] = day;
    }
  }

  const unique = [...new Set(ids)].slice(0, MAX_SHARED_PLACES);
  if (unique.length === 0) return null;
  return { city, ids: unique, days };
}
