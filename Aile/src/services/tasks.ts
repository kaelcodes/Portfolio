// RLS-aware data-access for public.tasks.
//
// Access control is enforced by forced RLS + owner-only policies on the
// database; these helpers never trust a caller-supplied user_id for ownership.
// user_id is always derived from the authenticated session. Writes are
// restricted to a permitted set of columns; id, user_id, created_at,
// updated_at, and deleted_at are never writable through updateTask().

import { supabase } from "../lib/supabase";
import type { Priority, TaskStatus, TaskRow } from "../types";

/** Fields a caller may set when creating a task. */
export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  category?: string | null;
  deadline?: string | null; // "YYYY-MM-DD"
  estimated_duration?: number | null;
}

/** Fields a caller may change on an existing task. */
export interface UpdateTaskPatch {
  title?: string;
  description?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  category?: string | null;
  deadline?: string | null;
  estimated_duration?: number | null;
}

const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];
const STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"];

/** Resolve the authenticated user id, or throw a clear error. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Not authenticated: ${error.message}`);
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated: no active session.");
  return id;
}

function validateDeadline(d: string | null | undefined): void {
  if (d === null || d === undefined || d === "") return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error("Invalid deadline: expected YYYY-MM-DD.");
  }
}

/**
 * List the signed-in user's active (non-soft-deleted) tasks, oldest first.
 * RLS already restricts rows to the owner; the user_id filter is redundant
 * defense-in-depth and keeps the query intent explicit.
 */
export async function listTasks(): Promise<TaskRow[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  return data ?? [];
}

/**
 * Create a task owned by the authenticated user. user_id is stamped from the
 * session, never from caller input. completed_at is set when the initial
 * status is "done".
 */
export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const userId = await requireUserId();

  const title = input.title?.trim() ?? "";
  if (title.length === 0) throw new Error("Title is required.");

  const priority = input.priority ?? "medium";
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority.");

  const status = input.status ?? "todo";
  if (!STATUSES.includes(status)) throw new Error("Invalid status.");

  validateDeadline(input.deadline);

  if (
    input.estimated_duration != null &&
    (!Number.isInteger(input.estimated_duration) || input.estimated_duration < 0)
  ) {
    throw new Error("Invalid estimated_duration: expected a non-negative integer.");
  }

  const row = {
    user_id: userId, // ownership from session only
    title,
    description: input.description?.trim() || null,
    priority,
    status,
    category: input.category?.trim() || null,
    deadline: input.deadline || null,
    estimated_duration: input.estimated_duration ?? null,
    completed_at: status === "done" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

/**
 * Update permitted fields of a task. id, user_id, created_at, updated_at
 * (trigger-managed), and deleted_at cannot be changed here. When status
 * transitions to "done", completed_at is set; when it leaves "done",
 * completed_at is cleared.
 */
export async function updateTask(
  id: string,
  patch: UpdateTaskPatch
): Promise<TaskRow> {
  const userId = await requireUserId();

  const update: Record<string, unknown> = {};

  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (t.length === 0) throw new Error("Title cannot be empty.");
    update.title = t;
  }
  if (patch.description !== undefined) {
    update.description = patch.description?.trim() || null;
  }
  if (patch.priority !== undefined) {
    if (!PRIORITIES.includes(patch.priority)) throw new Error("Invalid priority.");
    update.priority = patch.priority;
  }
  if (patch.category !== undefined) {
    update.category = patch.category?.trim() || null;
  }
  if (patch.deadline !== undefined) {
    validateDeadline(patch.deadline);
    update.deadline = patch.deadline || null;
  }
  if (patch.estimated_duration !== undefined) {
    if (
      patch.estimated_duration != null &&
      (!Number.isInteger(patch.estimated_duration) || patch.estimated_duration < 0)
    ) {
      throw new Error("Invalid estimated_duration: expected a non-negative integer.");
    }
    update.estimated_duration = patch.estimated_duration ?? null;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) throw new Error("Invalid status.");
    update.status = patch.status;
    // Keep completion timestamp consistent with status.
    update.completed_at =
      patch.status === "done" ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    throw new Error("No permitted fields to update.");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId) // defense-in-depth alongside RLS
    .is("deleted_at", null) // do not resurrect/alter tombstoned rows
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data;
}

/**
 * Soft-delete a task by stamping deleted_at. The row is preserved (tombstone)
 * so deletions can propagate during sync. Returns the updated row.
 */
export async function softDeleteTask(id: string): Promise<TaskRow> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null) // idempotent: only affects a currently-active row
    .select("*")
    .single();

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
  return data;
}
