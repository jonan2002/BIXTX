import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Global styles — must be imported before the app so Tailwind loads first
import "../styles/index.css";
import "../styles/fonts.css";

import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
