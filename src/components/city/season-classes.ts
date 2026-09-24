import type { Season } from "@/lib/city-display";

export function seasonLabel(season: Season): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

/** Solid fill class for a season (bars, legend swatches). */
export function seasonFillClass(season: Season | null): string {
  switch (season) {
    case "spring":
      return "bg-season-spring";
    case "summer":
      return "bg-season-summer";
    case "autumn":
      return "bg-season-autumn";
    case "winter":
      return "bg-season-winter";
    default:
      return "bg-rule-strong";
  }
}
