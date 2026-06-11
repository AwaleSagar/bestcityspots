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

const VERSION = "1";
const GOOGLE_PREFIX = "ChIJ";
const PREFIX_MARKER = "~";

export interface SharedList {
  city: string;
  ids: string[];
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

export function encodeSharedList(city: string, ids: readonly string[]): string {
  const unique = [...new Set(ids)].slice(0, MAX_SHARED_PLACES);
  const payload = `${VERSION}|${city.replace(/\|/g, " ")}|${unique.map(compressId).join(",")}`;
  return toBase64Url(payload);
}

export function decodeSharedList(token: string): SharedList | null {
  if (!token || token.length > 4096) return null;
  const payload = fromBase64Url(token);
  if (!payload) return null;

  const [version, city, idsRaw] = payload.split("|");
  if (version !== VERSION || !city || idsRaw === undefined) return null;

  const ids = idsRaw
    .split(",")
    .map((id) => expandId(id.trim()))
    .filter((id) => /^[A-Za-z0-9_-]{4,128}$/.test(id))
    .slice(0, MAX_SHARED_PLACES);

  if (ids.length === 0) return null;
  return { city, ids: [...new Set(ids)] };
}
