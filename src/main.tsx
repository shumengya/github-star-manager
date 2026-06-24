import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App";
import "./app/i18n";
import "./app/styles/fonts.css";
import "./app/styles/app.css";

registerSW({ immediate: true });

const container = document.querySelector<HTMLDivElement>("#app");

if (!container) {
  throw new Error("Root container #app not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
