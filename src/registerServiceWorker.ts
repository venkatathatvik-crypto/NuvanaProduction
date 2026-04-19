import { logger } from '@/lib/logger';
/**
 * Registers the legacy /service-worker.js so that existing users receive
 * the new cleanup version (which unregisters itself and removes old caches).
 *
 * The actual PWA service worker is generated and registered automatically by
 * vite-plugin-pwa (Workbox) during the production build — this function only
 * exists to push the cleanup SW to browsers that still have the old version.
 *
 * Once all users have migrated (typically after one release cycle) this
 * function can safely be turned into a no-op.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // The registered SW is the cleanup version — it will unregister
        // itself on activate, so no further update checks are needed here.
        logger.log('[SW] Legacy cleanup SW registered:', registration.scope);
      })
      .catch((error) => {
        // Non-fatal — the Workbox SW still handles caching even if this fails.
        logger.warn('[SW] Legacy cleanup SW registration failed:', error);
      });
  });
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
    logger.log("App can be installed");

    // Optionally, you can create a custom install button
    // and trigger deferredPrompt.prompt() when clicked
  });

  window.addEventListener("appinstalled", () => {
    logger.log("App installed successfully");
    deferredPrompt = null;
  });

  return deferredPrompt;
}
