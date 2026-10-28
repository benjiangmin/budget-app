"use client";

import { useSyncExternalStore } from "react";

// Today's date ("YYYY-MM-DD") on YOUR computer's clock, not the server's.
// It's null for a moment while the page first loads (the server can't know your time zone).
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const noop = () => () => {};

export function useToday(): string | null {
  return useSyncExternalStore(noop, localToday, () => null);
}
