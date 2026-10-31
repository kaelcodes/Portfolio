// Preferences UI: default priority, default status, and accent color.
// Reads/writes through the shared PreferencesProvider (no direct Supabase
// queries here). Shows loading, success, and error states.

import { useEffect, useState } from "react";
import type { Priority, TaskStatus, AccentColor } from "../types";
import { usePreferences } from "../preferences/PreferencesProvider";
import { ACCENTS, ACCENT_HEX } from "../lib/accent";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function Preferences() {
  const { prefs, loading, hasRow, error, save } = usePreferences();

  // Local editable copy, seeded from the shared prefs once loaded.
  const [priority, setPriority] = useState<Priority>(prefs.default_priority);
  const [status, setStatus] = useState<TaskStatus>(prefs.default_status);
  const [accent, setAccent] = useState<AccentColor>(prefs.accent_color);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep the local form in sync when the shared prefs finish loading/change.
  useEffect(() => {
    setPriority(prefs.default_priority);
    setStatus(prefs.default_status);
    setAccent(prefs.accent_color);
  }, [prefs]);

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    const ok = await save({
      default_priority: priority,
      default_status: status,
      accent_color: accent,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  };

  if (loading) {
    return <p className="msg msg-muted">Loading preferences…</p>;
  }

  return (
    <div className="card">
      <p className="card-title">Preferences</p>
      {!hasRow && (
        <p className="msg msg-hint">
          No preferences saved yet — showing defaults. They are not stored until
          you save.
        </p>
      )}

      <div className="field">
        <label className="label" htmlFor="p-priority">Default priority</label>
        <select
          id="p-priority"
          className="select"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          disabled={saving}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="p-status">Default status</label>
        <select
          id="p-status"
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
          disabled={saving}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label">Accent color</label>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`swatch${accent === a ? " is-selected" : ""}`}
              style={{ background: ACCENT_HEX[a] }}
              onClick={() => setAccent(a)}
              disabled={saving}
              aria-label={a}
              aria-pressed={accent === a}
              title={a}
            />
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="msg msg-error" style={{ marginTop: 6 }}>
          {error}
        </p>
      )}
      {saved && (
        <p className="msg msg-success" style={{ marginTop: 6 }}>
          Preferences saved.
        </p>
      )}

      <div className="actions">
        <button onClick={onSave} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
