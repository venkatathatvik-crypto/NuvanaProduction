import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, useIsRestoring } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";
import { BrowserRouter } from "react-router-dom";
import { toast } from "sonner";

import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AiChatProvider } from "@/contexts/AiChatContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import { ThemeProvider } from "@/components/theme-provider";
import { InstallPWA } from "@/components/InstallPWA";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import AppBackgroundLayout from "./layouts/AppBackgroundLayout";
import { AppRoutes } from "./routes";
import { idbKeyval } from "@/lib/db";
import { OfflineQueuedError } from "@/lib/apiClient";
import LoadingSpinner from "@/components/LoadingSpinner";

// ─── Query Cache Persister (IndexedDB via Dexie) ─────────────────────────────
// Serialises the entire TanStack Query cache to IndexedDB on every update.
// On the next page load — online or offline — the cache is restored instantly,
// so users see their last-known data with no loading flash.
// Security: the cache is explicitly cleared on logout (see AuthContext) to
// prevent one user's data being visible to another user on the same device.
const CACHE_KEY = 'query-cache';

const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await idbKeyval.set(CACHE_KEY, client);
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    return (await idbKeyval.get(CACHE_KEY)) as PersistedClient | undefined;
  },
  removeClient: async () => {
    await idbKeyval.del(CACHE_KEY);
  },
};

// ─── QueryClient ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // Data stays "fresh" for 1 minute

      // Keep data in memory for 24 h (effectively the whole session).
      // This ensures navigating between pages while offline always finds
      // data in the in-memory cache rather than triggering a failed fetch.
      gcTime: 24 * 60 * 60 * 1000,

      refetchOnWindowFocus: false,    // Don't refetch on window focus
      refetchOnReconnect: true,       // Automatically refetch when back online

      // 'offlineFirst' means TanStack Query runs the queryFn even when offline.
      // Without this the default 'online' mode PAUSES queries when the browser
      // is offline, leaving isLoading=true forever and showing a blank spinner
      // instead of serving the persisted IndexedDB cache.
      networkMode: 'offlineFirst',

      // Don't waste retries when the browser is definitely offline —
      // refetchOnReconnect will handle recovery automatically.
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        const status = (error as any)?.status;
        // Never retry client or auth errors
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 1;
      },

      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
      onError: (error: unknown) => {
        // OfflineQueuedError means the mutation was silently queued for sync.
        // The OfflineIndicator component handles the UX — no toast needed.
        if (error instanceof OfflineQueuedError) return;

        const message = (error as any)?.message || 'An error occurred';
        toast.error(message);
      },
    },
  },
});

// Inner component to access auth context + query restore state
const AppContent = () => {
  const { showSessionExpired, closeSessionExpiredModal } = useAuth();

  // True while PersistQueryClientProvider is loading the cache from IndexedDB.
  // Without this guard, pages that check `isLoading` briefly see a loading
  // state before the persisted data is hydrated — this eliminates that flash.
  const isRestoring = useIsRestoring();

  if (isRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {/* Keep the offline pill visible even during cache restore */}
        <OfflineIndicator />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPWA />

        {/* Global offline / sync status pill — zero visual impact when online */}
        <OfflineIndicator />

        <BrowserRouter>
          <SessionExpiredModal
            isOpen={showSessionExpired}
            onClose={closeSessionExpiredModal}
          />
          <AppBackgroundLayout>
            <AppRoutes />
          </AppBackgroundLayout>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
};

const App = () => (
  <NetworkStatusProvider>
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister: idbPersister,
      // Persisted data older than 24 h is discarded on startup
      maxAge: 24 * 60 * 60 * 1000,
      // Increment 'buster' here to invalidate all clients' caches after
      // a breaking schema change (e.g. 'nuvana360-v2')
      buster: 'nuvana360-v1',
    }}
  >
    <AuthProvider>
      <AiChatProvider>
        <ThemeProvider
          defaultTheme="dark"
          storageKey="vite-ui-theme"
          attribute="class"
        >
          <AppContent />
        </ThemeProvider>
      </AiChatProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
  </NetworkStatusProvider>
);

export default App;
