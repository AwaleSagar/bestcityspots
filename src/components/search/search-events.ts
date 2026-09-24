/** Window event that opens the global search dialog from anywhere. */
export const OPEN_SEARCH_EVENT = "bcs:open-search";

export function openSearch(initialQuery?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: initialQuery ?? "" }));
}
