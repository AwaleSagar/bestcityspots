"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * Active-option bookkeeping for a combobox listbox (aria-activedescendant
 * pattern: focus stays in the input). Resets whenever the item set changes
 * identity via `resetKey`.
 */
export function useActiveIndex(count: number, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, index: -1 });
  const index = state.key === resetKey && state.index < count ? state.index : -1;

  const setIndex = (next: number) => setState({ key: resetKey, index: next });

  const onArrowKeys = (event: KeyboardEvent) => {
    if (count === 0) return false;
    if (event.key === "ArrowDown") {
      setIndex(index + 1 >= count ? 0 : index + 1);
    } else if (event.key === "ArrowUp") {
      setIndex(index <= 0 ? count - 1 : index - 1);
    } else if (event.key === "Home" && index >= 0) {
      setIndex(0);
    } else if (event.key === "End" && index >= 0) {
      setIndex(count - 1);
    } else {
      return false;
    }
    event.preventDefault();
    return true;
  };

  return { activeIndex: index, setActiveIndex: setIndex, onArrowKeys };
}
