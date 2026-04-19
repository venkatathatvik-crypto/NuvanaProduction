import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

interface NetworkStatusContextValue {
  isOnline: boolean;
  wasJustRestored: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  isOnline: true,
  wasJustRestored: false,
});

/** Duration of the "Back online" banner (ms). */
const RESTORE_BANNER_MS = 3_000;

/**
 * Single source of truth for network status.
 * Mount once at the app root so every consumer reads the correct state.
 *
 * Detection strategy:
 *  1. `navigator.onLine` for initial state (synchronous, no flash).
 *  2. Browser `online`/`offline` events for real-time updates — these fire
 *     when the OS-level network adapter changes (WiFi off, airplane mode, etc.)
 *  3. Re-check `navigator.onLine` on tab visibility change — catches status
 *     changes that happened while the tab was in the background.
 *
 * This approach is deployment-agnostic: it does NOT ping any backend or
 * external URL, so it works regardless of where the server is hosted.
 */
export function NetworkStatusProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasJustRestored, setWasJustRestored] = useState(false);

  useEffect(() => {
    let mounted = true;
    let onlineRef = navigator.onLine;
    let restoreTimer: ReturnType<typeof setTimeout> | null = null;

    const transition = (online: boolean) => {
      if (!mounted) return;
      const wasOnline = onlineRef;
      if (online === wasOnline) return;

      onlineRef = online;

      if (online) {
        setIsOnline(true);
        setWasJustRestored(true);
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          if (mounted) setWasJustRestored(false);
        }, RESTORE_BANNER_MS);
      } else {
        setIsOnline(false);
        setWasJustRestored(false);
        if (restoreTimer) {
          clearTimeout(restoreTimer);
          restoreTimer = null;
        }
      }
    };

    const handleOnline = () => transition(true);
    const handleOffline = () => transition(false);

    // When the tab becomes visible again, re-read navigator.onLine in case
    // the status changed while the tab was in the background (events may
    // not fire for background tabs on some browsers).
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        transition(navigator.onLine);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (restoreTimer) clearTimeout(restoreTimer);
    };
  }, []);

  const value = useMemo(
    () => ({ isOnline, wasJustRestored }),
    [isOnline, wasJustRestored],
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatusContext(): NetworkStatusContextValue {
  return useContext(NetworkStatusContext);
}
