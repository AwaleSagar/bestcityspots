const TRAILING_ZERO_RE = /\.0$/;

export function formatPopulation(num: number | undefined | null): string {
  if (num === undefined || num === null) return "N/A";

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(TRAILING_ZERO_RE, "") + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(TRAILING_ZERO_RE, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + "k";
  }
  return num.toString();
}
