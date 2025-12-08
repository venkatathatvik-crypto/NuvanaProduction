export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered successfully:", registration);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // New service worker available
                console.log("New content is available; please refresh.");
                
              }
            });
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }
}

// Function to prompt user to install the app
export function setupInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // You can show your own install button here
    console.log("App can be installed");

    // Optionally, you can create a custom install button
    // and trigger deferredPrompt.prompt() when clicked
  });

  window.addEventListener("appinstalled", () => {
    console.log("App installed successfully");
    deferredPrompt = null;
  });

  return deferredPrompt;
}
