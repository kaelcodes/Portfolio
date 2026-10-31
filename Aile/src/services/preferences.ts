// RLS-aware data-access for public.preferences (one row per user).
//
// Ownership (user_id) is always derived from the authenticated session.
// getPreferences() returns null when no row exists; callers may fall back to
// DEFAULT_PREFERENCES for display WITHOUT persisting. Defaults are only
// written when upsertPreferences() is called explicitly.

import { supabase } from "../lib/supabase";
import type { Priority, TaskStatus, AccentColor, PreferencesRow } from "../types";

/** Editable preference fields (everything except ownership/server columns). */
export interface PreferencesInput {
  default_priority: Priority;
  default_status: TaskStatus;
  accent_color: AccentColor;
}

/** Fallback defaults, matching the database column defaults/constraints. */
export const DEFAULT_PREFERENCES: PreferencesInput = {
  default_priority: "medium",
  default_status: "todo",
  accent_color: "indigo",
};

const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];
const STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"];
const ACCENTS: readonly AccentColor[] = [
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
];

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Not authenticated: ${error.message}`);
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated: no active session.");
  return id;
}

/**
 * Retrieve the current user's preferences row, or null if none exists yet.
 * Does NOT persist defaults — returning null lets the caller decide.
 */
export async function getPreferences(): Promise<PreferencesRow | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load preferences: ${error.message}`);
  return data ?? null;
}

/**
 * Upsert the current user's preferences, keyed on user_id. Ownership is taken
 * from the session, never from caller input. Validates all three fields
 * against the database constraints before writing.
 */
export async function upsertPreferences(
  input: PreferencesInput
): Promise<PreferencesRow> {
  const userId = await requireUserId();

  if (!PRIORITIES.includes(input.default_priority)) {
    throw new Error("Invalid default_priority.");
  }
  if (!STATUSES.includes(input.default_status)) {
    throw new Error("Invalid default_status.");
  }
  if (!ACCENTS.includes(input.accent_color)) {
    throw new Error("Invalid accent_color.");
  }

  const row = {
    user_id: userId,
    default_priority: input.default_priority,
    default_status: input.default_status,
    accent_color: input.accent_color,
  };

  const { data, error } = await supabase
    .from("preferences")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to save preferences: ${error.message}`);
  return data;
}
