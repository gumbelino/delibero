import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { pingAppwrite } from "./lib/appwrite";
import "./styles.css";

// Verify the Appwrite connection on startup. Dev only — end users get no value
// from the round trip, and it would run on every page load in production.
if (import.meta.env.DEV) pingAppwrite();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
