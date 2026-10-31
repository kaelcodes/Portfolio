// Create/edit task form. Presentational: it reports input via callbacks and
// does not touch Supabase directly. When `editing` is set it acts as an edit
// form; otherwise it creates. The parent remounts it via `key` so fields
// reset cleanly between create/edit.

import { useState, type FormEvent } from "react";
import type { TaskRow, Priority, TaskStatus } from "../types";
import type { CreateTaskInput, UpdateTaskPatch } from "../services/tasks";

interface Props {
  editing: TaskRow | null;
  busy: boolean;
  /** Saved default priority for NEW tasks (ignored when editing). */
  defaultPriority: Priority;
  /** Saved default status for NEW tasks (ignored when editing). */
  defaultStatus: TaskStatus;
  onCreate: (input: CreateTaskInput) => void;
  onUpdate: (id: string, patch: UpdateTaskPatch) => void;
  onCancelEdit: () => void;
}

const PRIORITIES: Priority[] = ["low", "medium", "high"];

export function TaskForm({
  editing,
  busy,
  defaultPriority,
  defaultStatus,
  onCreate,
  onUpdate,
  onCancelEdit,
}: Props) {
  const isEdit = editing !== null;

  // When editing, seed from the task's existing values (preserved unless the
  // user changes them). When creating, seed priority from the saved default.
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [priority, setPriority] = useState<Priority>(
    editing?.priority ?? defaultPriority
  );
  const [category, setCategory] = useState(editing?.category ?? "");
  const [deadline, setDeadline] = useState(editing?.deadline ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (title.trim().length === 0) {
      setLocalError("Title is required.");
      return;
    }

    if (isEdit && editing) {
      const patch: UpdateTaskPatch = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category.trim() || null,
        deadline: deadline || null,
      };
      onUpdate(editing.id, patch);
    } else {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status: defaultStatus, // new tasks use the saved default status
        category: category.trim() || null,
        deadline: deadline || null,
      };
      onCreate(input);
    }
  };

  return (
    <form onSubmit={onSubmit} className="card" aria-busy={busy}>
      <p className="card-title">{isEdit ? "Edit task" : "New task"}</p>

      <div className="field">
        <label className="label" htmlFor="t-title">Title</label>
        <input
          id="t-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="t-desc">Description</label>
        <textarea
          id="t-desc"
          className="textarea"
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label className="label" htmlFor="t-priority">Priority</label>
          <select
            id="t-priority"
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            disabled={busy}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="t-deadline">Deadline</label>
          <input
            id="t-deadline"
            type="date"
            className="input"
            value={deadline ?? ""}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="t-category">Category</label>
        <input
          id="t-category"
          className="input"
          value={category ?? ""}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
        />
      </div>

      {localError && (
        <p role="alert" className="msg msg-error" style={{ marginTop: 4 }}>
          {localError}
        </p>
      )}

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add task"}
        </button>
        {isEdit && (
          <button
            type="button"
            className="btn"
            onClick={onCancelEdit}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
