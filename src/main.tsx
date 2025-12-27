import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "katex/dist/katex.min.css"; // LaTeX formula support
import { registerServiceWorker, setupInstallPrompt } from "./registerServiceWorker";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Register service worker for PWA functionality
registerServiceWorker();

// Setup install prompt listener for PWA install
setupInstallPrompt();
