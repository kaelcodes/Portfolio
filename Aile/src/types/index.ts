// Trimmed TypeScript types matching the applied Supabase schema
// (supabase/migrations/0001_init.sql). Field names are snake_case to match
// the database columns exactly; timestamps are ISO strings (Postgres
// timestamptz) and dates are "YYYY-MM-DD" (Postgres date).

export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type AccentColor = "indigo" | "emerald" | "amber" | "rose" | "sky";

/** Row shape of public.tasks. */
export interface TaskRow {
  id: string;                     // uuid
  user_id: string;                // uuid (auth.users.id)
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  category: string | null;
  deadline: string | null;        // date, "YYYY-MM-DD"
  estimated_duration: number | null;
  created_at: string;             // timestamptz, ISO 8601
  completed_at: string | null;    // timestamptz, ISO 8601
  updated_at: string;             // timestamptz, ISO 8601
  deleted_at: string | null;      // timestamptz, ISO 8601 (soft-delete tombstone)
}

/** Row shape of public.preferences (one row per user). */
export interface PreferencesRow {
  user_id: string;                // uuid (auth.users.id), primary key
  default_priority: Priority;
  default_status: TaskStatus;
  accent_color: AccentColor;
  updated_at: string;             // timestamptz, ISO 8601
}
