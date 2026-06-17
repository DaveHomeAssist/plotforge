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
