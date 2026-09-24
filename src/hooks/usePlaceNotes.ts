"use client";

import { useCallback, useMemo } from "react";
import {
  PLACE_NOTES_STORAGE_KEY,
  parseStoredNotes,
  sanitizeKey,
  type CityNotes,
} from "@/lib/saved-places";
import { useStoredValue } from "./useStoredValue";

const EMPTY = new Map<string, CityNotes>();
const MAX_NOTE_LENGTH = 280;

function parse(raw: string | null) {
  const map = parseStoredNotes(raw);
  return map.size === 0 ? EMPTY : map;
}

function serialize(map: Map<string, CityNotes>) {
  return JSON.stringify(Object.fromEntries(map));
}

/**
 * Private per-place notes for one city (localStorage `atlas_place_notes`,
 * shaped `{ [cityKey]: { [placeKey]: note } }`). Notes never leave the
 * device and are never included in share links.
 */
export function usePlaceNotes(cityName: string) {
  const [all, setAll] = useStoredValue(PLACE_NOTES_STORAGE_KEY, parse, EMPTY, serialize);
  const cityKey = sanitizeKey(cityName);

  const notes = useMemo(() => all.get(cityKey) ?? {}, [all, cityKey]);

  const getNote = useCallback(
    (placeId: string) =>
      Object.entries(notes).find(([key]) => key === sanitizeKey(placeId))?.[1] ?? "",
    [notes]
  );

  const setNote = useCallback(
    (placeId: string, note: string) =>
      setAll((previous) => {
        const next = new Map(previous);
        const cityNotes = new Map(Object.entries(next.get(cityKey) ?? {}));
        const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
        if (trimmed) cityNotes.set(sanitizeKey(placeId), trimmed);
        else cityNotes.delete(sanitizeKey(placeId));
        next.set(cityKey, Object.fromEntries(cityNotes));
        return next;
      }),
    [cityKey, setAll]
  );

  return { getNote, setNote, maxLength: MAX_NOTE_LENGTH };
}
