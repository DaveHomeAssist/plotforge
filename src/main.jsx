import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import PlotForge from "./PlotForge.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <ErrorBoundary>
      <PlotForge />
    </ErrorBoundary>
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("sw.js", window.location.href), { scope: "./" }).catch(error => {
      console.warn("PlotForge service worker registration failed.", error);
    });
  });
}
