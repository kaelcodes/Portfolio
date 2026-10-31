// Shared preferences state for the authenticated app. Loads the user's row
// once on mount (via the existing service), falls back to DEFAULT_PREFERENCES
// for display WITHOUT persisting, applies the accent color, and exposes a
// save() that upserts and updates local state.
//
// Both the Tasks defaults and the Preferences page read from here, so there is
// a single source of truth and no duplicated Supabase queries in components.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getPreferences,
  upsertPreferences,
  DEFAULT_PREFERENCES,
  type PreferencesInput,
} from "../services/preferences";
import { applyAccent } from "../lib/accent";

interface PreferencesContextValue {
  /** Current effective preferences (saved row, or defaults if none yet). */
  prefs: PreferencesInput;
  /** True while the initial load is in flight. */
  loading: boolean;
  /** Whether a persisted row exists for this user. */
  hasRow: boolean;
  error: string | null;
  /** Persist new preferences; resolves true on success. */
  save: (next: PreferencesInput) => Promise<boolean>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined
);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<PreferencesInput>(DEFAULT_PREFERENCES);
  const [hasRow, setHasRow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const row = await getPreferences();
        if (!active) return;
        if (row) {
          const loaded: PreferencesInput = {
            default_priority: row.default_priority,
            default_status: row.default_status,
            accent_color: row.accent_color,
          };
          setPrefs(loaded);
          setHasRow(true);
          applyAccent(loaded.accent_color);
        } else {
          // No row: use defaults for display only, do NOT persist.
          setPrefs(DEFAULT_PREFERENCES);
          setHasRow(false);
          applyAccent(DEFAULT_PREFERENCES.accent_color);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load preferences.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async (next: PreferencesInput): Promise<boolean> => {
    setError(null);
    try {
      const saved = await upsertPreferences(next);
      const applied: PreferencesInput = {
        default_priority: saved.default_priority,
        default_status: saved.default_status,
        accent_color: saved.accent_color,
      };
      setPrefs(applied);
      setHasRow(true);
      applyAccent(applied.accent_color);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences.");
      return false;
    }
  };

  const value = useMemo<PreferencesContextValue>(
    () => ({ prefs, loading, hasRow, error, save }),
    [prefs, loading, hasRow, error]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within a PreferencesProvider.");
  }
  return ctx;
}
