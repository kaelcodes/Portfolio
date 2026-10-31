// Supabase browser client for Aile Mobile.
//
// Uses the PUBLIC anon/publishable key only. Row Level Security (forced on
// every table) is what protects data — never put a service_role key in the
// frontend; it would bypass RLS and leak in the shipped bundle.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail clearly and early if configuration is missing, rather than letting
// createClient throw an opaque error later.
if (!url || !anonKey) {
  const missing = [
    !url && "VITE_SUPABASE_URL",
    !anonKey && "VITE_SUPABASE_ANON_KEY",
  ]
    .filter(Boolean)
    .join(", ");
  throw new Error(
    `Missing Supabase configuration: ${missing}. ` +
      `Copy .env.example to .env and set these values (see README).`
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persist the session in localStorage and restore it on reload.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
