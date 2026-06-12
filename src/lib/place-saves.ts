import "server-only";

import { getServerClient } from "./supabase";

/**
 * US-12 (audit AF-6): anonymous aggregate save counters.
 * Reads/writes go through service-role RPCs (`record_place_save`,
 * `get_place_save_totals`) — the anon role can neither read nor write the
 * underlying table. No user identifiers exist anywhere in this path.
 */

const PLACE_ID_RE = /^[A-Za-z0-9_-]{4,128}$/;

/** Display floor: avoid "1 traveler saved this" noise (US-12 AC). */
export const MIN_DISPLAY_SAVES = 5;

export async function recordPlaceSave(placeId: string): Promise<boolean> {
  if (!PLACE_ID_RE.test(placeId)) return false;
  const client = getServerClient();
  if (!client) return false;

  const { error } = await client.rpc("record_place_save", { p_place_id: placeId });
  return !error;
}

export async function getPlaceSaveTotals(
  placeIds: readonly string[]
): Promise<Record<string, number>> {
  const valid = [...new Set(placeIds)].filter((id) => PLACE_ID_RE.test(id));
  if (valid.length === 0) return {};
  const client = getServerClient();
  if (!client) return {};

  try {
    const { data, error } = await client.rpc("get_place_save_totals", {
      p_place_ids: valid,
    });
    if (error || !Array.isArray(data)) return {};
    const totals: Record<string, number> = {};
    for (const row of data as { place_id: string; total: number }[]) {
      totals[row.place_id] = Number(row.total) || 0;
    }
    return totals;
  } catch {
    return {};
  }
}
