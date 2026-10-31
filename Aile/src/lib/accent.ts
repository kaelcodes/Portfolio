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
