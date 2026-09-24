"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, NotebookPen, Star } from "lucide-react";
import type { Landmark, PlaceType } from "@/lib/places";
import { compactCount, formatPlaceType, priceLabel } from "@/lib/city-display";
import { getAddressContext } from "@/lib/saved-places";
import { Button, buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { MIN_VISIBLE_SAVES, placeDomId } from "./place-helpers";
import { PlaceImage } from "./PlaceImage";

interface PlaceCardProps {
  place: Landmark;
  type: PlaceType;
  rank: number;
  cityName: string;
  saved: boolean;
  saveCount: number;
  note: string;
  active: boolean;
  bookingAffiliateId?: string;
  onToggleSave: () => void;
  onSaveNote: (note: string) => void;
  onFocusPlace: (id: string | null) => void;
  onOutboundClick: (kind: "maps" | "affiliate") => void;
  maxNoteLength: number;
}

export function PlaceCard({
  place,
  type,
  rank,
  cityName,
  saved,
  saveCount,
  note,
  active,
  bookingAffiliateId,
  onToggleSave,
  onSaveNote,
  onFocusPlace,
  onOutboundClick,
  maxNoteLength,
}: PlaceCardProps) {
  const name = place.displayName.text;
  const address = getAddressContext(place.formattedAddress);
  const price = priceLabel(place.priceLevel);
  const reviews = place.userRatingCount ?? 0;
  const [draft, setDraft] = useState(note);
  const [editing, setEditing] = useState(false);
  const headingId = `${placeDomId(place.id)}-name`;

  return (
    <li
      id={placeDomId(place.id)}
      aria-labelledby={headingId}
      onMouseEnter={() => onFocusPlace(place.id)}
      onMouseLeave={() => onFocusPlace(null)}
      onFocus={() => onFocusPlace(place.id)}
      className={cn(
        "bg-surface ease-standard scroll-mt-36 rounded-md border p-3 transition-colors duration-150 sm:p-4",
        active ? "border-accent" : "border-rule"
      )}
    >
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
        <PlaceImage
          src={place.imageUrl}
          blurhash={place.blurhash}
          alt={`${name}, ${cityName}`}
          priority={rank === 1}
          className="aspect-square sm:aspect-[4/3]"
        />
        <div className="min-w-0">
          <p className="text-ink-muted text-xs">
            <span className="tabular-nums">{rank}.</span> {formatPlaceType(place.types)}
          </p>
          <h3 id={headingId} className="mt-0.5 text-lg leading-snug font-semibold">
            {name}
          </h3>
          <p className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {typeof place.rating === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden className="fill-highlight text-highlight size-3.5" />
                <span className="text-ink font-medium tabular-nums">{place.rating.toFixed(1)}</span>
                {reviews > 0 ? (
                  <span className="tabular-nums">({compactCount(reviews)} reviews)</span>
                ) : null}
              </span>
            ) : null}
            {price ? <span aria-label={`Price level ${price}`}>{price}</span> : null}
            {saveCount >= MIN_VISIBLE_SAVES ? (
              <span>Saved by {compactCount(saveCount)} travelers</span>
            ) : null}
          </p>
          {address ? (
            <p className="text-ink-muted mt-1 line-clamp-2 text-sm" title={place.formattedAddress}>
              {[address.primary !== name ? address.primary : null, address.secondary]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-rule mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        <Button
          size="sm"
          variant={saved ? "primary" : "secondary"}
          aria-pressed={saved}
          onClick={onToggleSave}
        >
          {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
          {saved ? "Saved" : "Save"}
        </Button>
        {place.googleMapsUri ? (
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOutboundClick("maps")}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <ExternalLink aria-hidden />
            Maps<span className="sr-only"> for {name} (opens Google Maps)</span>
          </a>
        ) : null}
        {type === "hotels" && bookingAffiliateId ? (
          <a
            href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
              `${name}, ${cityName}`
            )}&aid=${encodeURIComponent(bookingAffiliateId)}`}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => onOutboundClick("affiliate")}
            title="Partner link — booking may earn us a commission at no cost to you."
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            <ExternalLink aria-hidden />
            Check rates<span className="text-ink-muted text-xs">(partner)</span>
          </a>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={editing}
          onClick={() => {
            if (!editing) setDraft(note);
            setEditing(!editing);
          }}
          className="ml-auto"
        >
          <NotebookPen aria-hidden />
          {note ? "Your note" : "Add note"}
        </Button>
      </div>

      {note && !editing ? (
        <p className="bg-sunken mt-3 rounded-md px-3 py-2 text-sm">
          <span className="sr-only">Your note: </span>
          {note}
        </p>
      ) : null}

      {editing ? (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveNote(draft);
            setEditing(false);
          }}
        >
          <label htmlFor={`${headingId}-note`} className="text-sm font-medium">
            Private note for {name}
          </label>
          <textarea
            id={`${headingId}-note`}
            value={draft}
            maxLength={maxNoteLength}
            rows={3}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Opening hours, who recommended it, what to order…"
            className="border-rule-strong bg-paper placeholder:text-ink-subtle focus-visible:outline-accent mt-1.5 w-full rounded-md border px-3 py-2 text-base focus-visible:outline-2"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" variant="primary">
              Save note
            </Button>
            {note ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft("");
                  onSaveNote("");
                  setEditing(false);
                }}
              >
                Delete note
              </Button>
            ) : null}
            <span className="text-ink-muted ml-auto text-xs tabular-nums">
              {draft.length}/{maxNoteLength} · stays on this device
            </span>
          </div>
        </form>
      ) : null}
    </li>
  );
}
