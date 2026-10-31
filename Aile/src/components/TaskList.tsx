// Presentational task list. Renders active tasks and reports user actions via
// callbacks; it performs no data access of its own.

import type { TaskRow, TaskStatus } from "../types";

interface Props {
  tasks: TaskRow[];
  busy: boolean;
  onEdit: (task: TaskRow) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function TaskList({ tasks, busy, onEdit, onStatusChange, onDelete }: Props) {
  return (
    <ul className="task-list">
      {tasks.map((t) => (
        <li key={t.id} className={`task-item prio-${t.priority}`}>
          <div className="task-main">
            <div className="task-titlerow">
              <span className={`task-title${t.status === "done" ? " is-done" : ""}`}>
                {t.title}
              </span>
              <span className={`badge badge-prio-${t.priority}`}>{t.priority}</span>
              {t.category && <span className="chip">{t.category}</span>}
            </div>
            {t.description && <div className="task-desc">{t.description}</div>}
            <div className="task-meta">
              {t.deadline ? `Due ${t.deadline}` : "No deadline"}
              {t.completed_at ? " · Completed" : ""}
            </div>
          </div>

          <div className="task-controls">
            <select
              aria-label="Status"
              className="select btn-sm"
              value={t.status}
              onChange={(e) => onStatusChange(t.id, e.target.value as TaskStatus)}
              disabled={busy}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={() => onEdit(t)} disabled={busy}>
              Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(t.id)}
              disabled={busy}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
