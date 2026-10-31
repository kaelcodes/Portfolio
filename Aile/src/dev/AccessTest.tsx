// Authenticated database smoke test. Reads from `tasks` and `preferences`
// using the signed-in client to prove auth + RLS + client wiring work
// end-to-end. READ-ONLY: no insert/update/delete. Empty tables are a valid
// success (RLS allows the owner; they simply have no rows yet).

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Status =
  | { kind: "loading" }
  | { kind: "ok"; tasks: number; preferences: number }
  | { kind: "error"; message: string };

export function AccessTest() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // `count` avoids pulling rows; head:true requests no body.
        const tasksRes = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true });
        const prefsRes = await supabase
          .from("preferences")
          .select("*", { count: "exact", head: true });

        if (!active) return;

        if (tasksRes.error) {
          setStatus({ kind: "error", message: `tasks: ${tasksRes.error.message}` });
          return;
        }
        if (prefsRes.error) {
          setStatus({
            kind: "error",
            message: `preferences: ${prefsRes.error.message}`,
          });
          return;
        }

        setStatus({
          kind: "ok",
          tasks: tasksRes.count ?? 0,
          preferences: prefsRes.count ?? 0,
        });
      } catch (e: unknown) {
        if (!active) return;
        setStatus({
          kind: "error",
          message: e instanceof Error ? e.message : "Database access failed.",
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (status.kind === "loading") {
    return <p style={{ color: "#667085" }}>Checking database access…</p>;
  }

  if (status.kind === "error") {
    return (
      <p role="alert" style={{ color: "#b42318" }}>
        Database access failed: {status.message}
      </p>
    );
  }

  return (
    <div style={{ color: "#067647" }}>
      <strong>Database access OK.</strong>
      <div style={{ color: "#475467", fontSize: 14, marginTop: 4 }}>
        tasks readable (count: {status.tasks}), preferences readable (count:{" "}
        {status.preferences}). Empty is valid.
      </div>
    </div>
  );
}
