// Email/password login. No sign-up, no password reset — public sign-ups are
// disabled and this is a single-owner app.

import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // On success, AuthProvider's onAuthStateChange swaps the view; nothing
      // else to do here. Only surface an error.
      if (error) setError(error.message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-wrap">
      <form onSubmit={onSubmit} className="card auth-card" aria-busy={submitting}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Aile Mobile</h1>
        <p className="msg msg-muted" style={{ marginBottom: 8 }}>
          Sign in to continue
        </p>

        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        {error && (
          <p role="alert" className="msg msg-error" style={{ marginTop: 6 }}>
            {error}
          </p>
        )}

        <div className="actions">
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
