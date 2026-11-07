// Accent color palette. Single source of truth for the 5 allowed accents
// (matching the DB check constraint) and their hex values. The chosen accent
// is applied to the `--accent` CSS custom property on the document root.

import type { AccentColor } from "../types";

export const ACCENT_HEX: Record<AccentColor, string> = {
  indigo: "#4f46e5",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
  sky: "#0284c7",
};

export const ACCENTS: AccentColor[] = ["indigo", "emerald", "amber", "rose", "sky"];

/** Apply an accent to the document root as the `--accent` CSS variable. */
export function applyAccent(accent: AccentColor): void {
  document.documentElement.style.setProperty("--accent", ACCENT_HEX[accent]);
}

const CACHE_KEY = "aile-accent";

/** Read the last-saved accent from localStorage. Returns null if absent or invalid. */
export function getCachedAccent(): AccentColor | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CACHE_KEY);
  if (value && (ACCENTS as string[]).includes(value)) {
    return value as AccentColor;
  }
  return null;
}

/** Persist the current accent to localStorage for use on the next load. */
export function setCachedAccent(accent: AccentColor): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, accent);
}

/** Remove the cached accent from localStorage (call on sign-out). */
export function clearCachedAccent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
