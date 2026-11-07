import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { getCachedAccent, applyAccent } from "./lib/accent";

// Apply the cached accent synchronously before React mounts to prevent the
// default-indigo flash on page reload for users with a custom accent saved.
const cached = getCachedAccent();
if (cached) applyAccent(cached);

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found.");

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
