/**
 * Formats a number into a human-readable abbreviation (e.g., 100k, 1.2M)
 */
export function formatPopulation(num: number | undefined | null): string {
  if (num === undefined || num === null) return "N/A";

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "k";
  }
  return num.toString();
}
