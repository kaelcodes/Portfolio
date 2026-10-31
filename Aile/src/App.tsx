// Auth gate: loading -> Login (unauthenticated) -> minimal authenticated shell.
// No router yet (foundation only).

import { useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { Login } from "./pages/Login";
import { Tasks } from "./pages/Tasks";
import { Preferences } from "./pages/Preferences";
import { PreferencesProvider } from "./preferences/PreferencesProvider";
import { AccessTest } from "./dev/AccessTest";
// TEMPORARY dev-only service verification harness (not shipped in production).
import { ServiceTest } from "./dev/ServiceTest";

type View = "tasks" | "preferences";

export default function App() {
  const { session, loading, error, signOut } = useAuth();
  const [view, setView] = useState<View>("tasks");

  if (loading) {
    return (
      <main className="center-screen">
        <p className="msg msg-muted">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <PreferencesProvider>
      <main className="shell">
        <header className="app-header">
          <span className="brand">Aile Mobile</span>
          <button onClick={signOut} className="btn btn-sm">
            Log out
          </button>
        </header>

        <nav className="app-nav">
          <button
            onClick={() => setView("tasks")}
            className={`tab${view === "tasks" ? " is-active" : ""}`}
            aria-current={view === "tasks" ? "page" : undefined}
          >
            Tasks
          </button>
          <button
            onClick={() => setView("preferences")}
            className={`tab${view === "preferences" ? " is-active" : ""}`}
            aria-current={view === "preferences" ? "page" : undefined}
          >
            Preferences
          </button>
        </nav>

        <section className="container">
          <p className="signed-in">
            Signed in as <strong>{session.user.email}</strong>
          </p>

          {error && (
            <p role="alert" className="msg msg-error">
              {error}
            </p>
          )}

          {view === "tasks" ? <Tasks /> : <Preferences />}

          {/* Dev-only diagnostics; stripped from production builds. */}
          {import.meta.env.DEV && <AccessTest />}
          {import.meta.env.DEV && <ServiceTest />}
        </section>
      </main>
    </PreferencesProvider>
  );
}
