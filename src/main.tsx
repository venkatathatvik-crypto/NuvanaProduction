import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./registerServiceWorker";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
registerServiceWorker();

// Setup install prompt listener for PWA install
setupInstallPrompt();
