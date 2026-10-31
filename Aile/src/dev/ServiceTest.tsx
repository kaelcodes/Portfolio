// TEMPORARY development-only service verification harness.
//
// Renders only when import.meta.env.DEV is true AND the auth gate has already
// confirmed a session (App.tsx only mounts this inside the authenticated
// shell). It reuses the existing services for all normal operations; the only
// direct DB reads are narrowly scoped to the authenticated user's id and the
// exact test record, to inspect fields the services don't return (e.g. a
// soft-deleted row's deleted_at).
//
// Safety: test tasks are soft-deleted via the service during cleanup;
// preferences are snapshotted and restored (or the test-created row removed).
// No secrets or tokens are rendered. Do NOT ship this component.

import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  listTasks,
  createTask,
  updateTask,
  softDeleteTask,
} from "../services/tasks";
import { getPreferences, upsertPreferences } from "../services/preferences";
import type { PreferencesRow } from "../types";

type Outcome = "PASS" | "FAIL" | "SKIPPED";

interface StepResult {
  name: string;
  outcome: Outcome;
  detail: string;
}

/** Narrowly-scoped direct read of one task row owned by the given user. */
async function readOwnTaskById(userId: string, id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,description,status,completed_at,deleted_at")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`direct read failed: ${error.message}`);
  return data;
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function ServiceTest() {
  // Hard guard: never run outside dev, even if accidentally mounted.
  if (!import.meta.env.DEV) return null;

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);

  const runAll = async () => {
    if (running) return; // prevent duplicate submissions
    setRunning(true);
    const steps: StepResult[] = [];
    const push = (name: string, outcome: Outcome, detail = "") =>
      steps.push({ name, outcome, detail });

    // Track created artifacts for guaranteed cleanup.
    let createdTaskId: string | null = null;
    const marker = `__svctest ${new Date().toISOString()} ${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // Preferences snapshot state.
    let userId = "";
    let prefSnapshot: PreferencesRow | null = null;
    let prefRowExistedBefore = false;

    try {
      // Resolve the authenticated user id once (scopes direct reads).
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        push("auth", "FAIL", `no session: ${userErr?.message ?? "none"}`);
        setResults([...steps]);
        setRunning(false);
        return;
      }
      userId = userData.user.id;

      // ── TASK TESTS ──────────────────────────────────────────────────────
      // 1. List active tasks (baseline).
      let baselineCount = 0;
      try {
        const list = await listTasks();
        baselineCount = list.length;
        push("1. listTasks (baseline)", "PASS", `${baselineCount} active task(s)`);
      } catch (e) {
        push("1. listTasks (baseline)", "FAIL", errText(e));
      }

      // 2. Create a test task (unique marker in the title).
      try {
        const created = await createTask({
          title: marker,
          description: "temporary service-test record",
          priority: "low",
          status: "todo",
        });
        createdTaskId = created.id;
        push("2. createTask", "PASS", `id=${created.id}`);
      } catch (e) {
        push("2. createTask", "FAIL", errText(e));
      }

      // 3. Retrieve it via listTasks().
      if (createdTaskId) {
        try {
          const list = await listTasks();
          const found = list.find((t) => t.id === createdTaskId);
          if (found && list.length === baselineCount + 1) {
            push("3. retrieve via listTasks", "PASS", "test task present");
          } else {
            push(
              "3. retrieve via listTasks",
              "FAIL",
              found ? "count mismatch" : "test task not found"
            );
          }
        } catch (e) {
          push("3. retrieve via listTasks", "FAIL", errText(e));
        }
      } else {
        push("3. retrieve via listTasks", "SKIPPED", "no task created");
      }

      // 4. Update title and description.
      if (createdTaskId) {
        try {
          const updated = await updateTask(createdTaskId, {
            title: `${marker} (edited)`,
            description: "edited description",
          });
          if (
            updated.title === `${marker} (edited)` &&
            updated.description === "edited description"
          ) {
            push("4. updateTask title/description", "PASS", "fields updated");
          } else {
            push("4. updateTask title/description", "FAIL", "returned values mismatch");
          }
        } catch (e) {
          push("4. updateTask title/description", "FAIL", errText(e));
        }
      } else {
        push("4. updateTask title/description", "SKIPPED", "no task created");
      }

      // 5. Status -> done, completed_at populated.
      if (createdTaskId) {
        try {
          const done = await updateTask(createdTaskId, { status: "done" });
          if (done.status === "done" && done.completed_at) {
            push("5. status=done sets completed_at", "PASS", `completed_at=${done.completed_at}`);
          } else {
            push(
              "5. status=done sets completed_at",
              "FAIL",
              `status=${done.status} completed_at=${done.completed_at}`
            );
          }
        } catch (e) {
          push("5. status=done sets completed_at", "FAIL", errText(e));
        }
      } else {
        push("5. status=done sets completed_at", "SKIPPED", "no task created");
      }

      // 6. Status -> todo, completed_at cleared.
      if (createdTaskId) {
        try {
          const back = await updateTask(createdTaskId, { status: "todo" });
          if (back.status === "todo" && back.completed_at === null) {
            push("6. status=todo clears completed_at", "PASS", "completed_at cleared");
          } else {
            push(
              "6. status=todo clears completed_at",
              "FAIL",
              `status=${back.status} completed_at=${back.completed_at}`
            );
          }
        } catch (e) {
          push("6. status=todo clears completed_at", "FAIL", errText(e));
        }
      } else {
        push("6. status=todo clears completed_at", "SKIPPED", "no task created");
      }

      // 7. Soft-delete; no longer in listTasks().
      let softDeleted = false;
      if (createdTaskId) {
        try {
          await softDeleteTask(createdTaskId);
          softDeleted = true;
          const list = await listTasks();
          const stillThere = list.some((t) => t.id === createdTaskId);
          push(
            "7. softDeleteTask drops from listTasks",
            stillThere ? "FAIL" : "PASS",
            stillThere ? "still listed" : "removed from active list"
          );
        } catch (e) {
          push("7. softDeleteTask drops from listTasks", "FAIL", errText(e));
        }
      } else {
        push("7. softDeleteTask drops from listTasks", "SKIPPED", "no task created");
      }

      // 8. Direct scoped read confirms deleted_at populated.
      if (createdTaskId) {
        try {
          const row = await readOwnTaskById(userId, createdTaskId);
          if (row && row.deleted_at) {
            push("8. deleted_at populated (fresh DB read)", "PASS", `deleted_at=${row.deleted_at}`);
          } else {
            push(
              "8. deleted_at populated (fresh DB read)",
              "FAIL",
              row ? "deleted_at is null" : "row not found"
            );
          }
        } catch (e) {
          push("8. deleted_at populated (fresh DB read)", "FAIL", errText(e));
        }
      } else {
        push("8. deleted_at populated (fresh DB read)", "SKIPPED", "no task created");
      }

      // ── PREFERENCES TESTS (snapshot first) ──────────────────────────────
      try {
        prefSnapshot = await getPreferences();
        prefRowExistedBefore = prefSnapshot !== null;
        push(
          "9. getPreferences (snapshot)",
          "PASS",
          prefRowExistedBefore ? "existing row captured" : "null (no row yet)"
        );
      } catch (e) {
        push("9. getPreferences (snapshot)", "FAIL", errText(e));
      }

      // 10. Upsert valid enum values and verify via a fresh read.
      let prefUpserted = false;
      try {
        const testPrefs = {
          default_priority: "high" as const,
          default_status: "in_progress" as const,
          accent_color: "emerald" as const,
        };
        await upsertPreferences(testPrefs);
        prefUpserted = true;
        const reread = await getPreferences();
        if (
          reread &&
          reread.default_priority === "high" &&
          reread.default_status === "in_progress" &&
          reread.accent_color === "emerald"
        ) {
          push("10. upsertPreferences + fresh read", "PASS", "saved values confirmed");
        } else {
          push("10. upsertPreferences + fresh read", "FAIL", "reread mismatch");
        }
      } catch (e) {
        push("10. upsertPreferences + fresh read", "FAIL", errText(e));
      }

      // ── CLEANUP ─────────────────────────────────────────────────────────
      // Task cleanup: soft-delete if created and not already soft-deleted.
      if (createdTaskId && !softDeleted) {
        try {
          await softDeleteTask(createdTaskId);
          push("cleanup: soft-delete test task", "PASS", `id=${createdTaskId}`);
        } catch (e) {
          push(
            "cleanup: soft-delete test task",
            "FAIL",
            `MANUAL: soft-delete task id=${createdTaskId}. ${errText(e)}`
          );
        }
      }

      // Preferences cleanup: restore snapshot, or remove the test-created row.
      if (prefUpserted) {
        if (prefRowExistedBefore && prefSnapshot) {
          try {
            await upsertPreferences({
              default_priority: prefSnapshot.default_priority,
              default_status: prefSnapshot.default_status,
              accent_color: prefSnapshot.accent_color,
            });
            const restored = await getPreferences();
            const ok =
              restored &&
              restored.default_priority === prefSnapshot.default_priority &&
              restored.default_status === prefSnapshot.default_status &&
              restored.accent_color === prefSnapshot.accent_color;
            push(
              "cleanup: restore original preferences",
              ok ? "PASS" : "FAIL",
              ok ? "original values restored" : "restore verification mismatch"
            );
          } catch (e) {
            push(
              "cleanup: restore original preferences",
              "FAIL",
              `MANUAL: restore your preferences row (user_id=${userId}). ${errText(e)}`
            );
          }
        } else {
          // No row existed before — remove only this user's test-created row.
          try {
            const { error } = await supabase
              .from("preferences")
              .delete()
              .eq("user_id", userId);
            if (error) throw new Error(error.message);
            const check = await getPreferences();
            push(
              "cleanup: remove test-created preferences row",
              check === null ? "PASS" : "FAIL",
              check === null ? "row removed" : "row still present"
            );
          } catch (e) {
            push(
              "cleanup: remove test-created preferences row",
              "FAIL",
              `MANUAL: delete preferences where user_id=${userId}. ${errText(e)}`
            );
          }
        }
      }

      setResults([...steps]);
    } catch (e) {
      push("harness", "FAIL", `unexpected: ${errText(e)}`);
      if (createdTaskId) {
        push(
          "cleanup note",
          "SKIPPED",
          `verify/soft-delete task id=${createdTaskId} manually if it persists`
        );
      }
      setResults([...steps]);
    } finally {
      setRunning(false);
    }
  };

  const color = (o: Outcome) =>
    o === "PASS" ? "#067647" : o === "FAIL" ? "#b42318" : "#9a6700";

  return (
    <section style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <strong>Service Test Harness</strong>
        <span style={{ fontSize: 12, color: "#9a6700" }}>dev-only · temporary</span>
        <button onClick={runAll} disabled={running} style={btn}>
          {running ? "Running…" : "Run all tests"}
        </button>
      </div>
      {results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
          {results.map((r, i) => (
            <li key={i} style={{ fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: color(r.outcome), fontWeight: 700, width: 70, display: "inline-block" }}>
                {r.outcome}
              </span>
              <span>{r.name}</span>
              {r.detail && <span style={{ color: "#667085" }}> — {r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const box: React.CSSProperties = {
  border: "1px dashed #c9a227",
  background: "#fffbeb",
  borderRadius: 8,
  padding: 14,
  marginTop: 8,
};
const btn: React.CSSProperties = {
  padding: "7px 12px",
  border: "1px solid #cbd2dc",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
