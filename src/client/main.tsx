import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = document.getElementById("app");
if (!root) throw new Error("Elemen aplikasi tidak ditemukan.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
