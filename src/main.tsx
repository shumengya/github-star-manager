import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./app/i18n";
import "./app/styles/fonts.css";
import "./app/styles/tokens.css";

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
  if ("caches" in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        void caches.delete(key);
      }
    });
  }
}

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
