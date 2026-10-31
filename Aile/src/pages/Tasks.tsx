// First functional task-management UI. Owns load/refresh/error state and
// delegates all data access to src/services/tasks.ts (no direct Supabase
// queries here). Renders the create/edit form and the task list.

import { useCallback, useEffect, useState } from "react";
import {
  listTasks,
  createTask,
  updateTask,
  softDeleteTask,
  type CreateTaskInput,
  type UpdateTaskPatch,
} from "../services/tasks";
import type { TaskRow, TaskStatus } from "../types";
import { TaskForm } from "../components/TaskForm";
import { TaskList } from "../components/TaskList";
import { usePreferences } from "../preferences/PreferencesProvider";

export function Tasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const { prefs } = usePreferences();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await listTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const handleCreate = async (input: CreateTaskInput) => {
    setBusy(true);
    setError(null);
    try {
      await createTask(input);
      await refresh();
      flash("Task created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id: string, patch: UpdateTaskPatch) => {
    setBusy(true);
    setError(null);
    try {
      await updateTask(id, patch);
      setEditing(null);
      await refresh();
      flash("Task updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task.");
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    setBusy(true);
    setError(null);
    try {
      await updateTask(id, { status });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change status.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await softDeleteTask(id);
      if (editing?.id === id) setEditing(null);
      await refresh();
      flash("Task deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete task.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <TaskForm
        key={editing?.id ?? "new"}
        editing={editing}
        busy={busy}
        defaultPriority={prefs.default_priority}
        defaultStatus={prefs.default_status}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onCancelEdit={() => setEditing(null)}
      />

      {notice && <p className="msg msg-success">{notice}</p>}
      {error && (
        <p role="alert" className="msg msg-error">
          {error}
        </p>
      )}

      {loading ? (
        <p className="msg msg-muted">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="msg msg-muted">No tasks yet. Create your first one above.</p>
      ) : (
        <TaskList
          tasks={tasks}
          busy={busy}
          onEdit={(t) => setEditing(t)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
