import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { syncQueueManager } from '@/lib/syncQueue';
import { toast } from 'sonner';

/**
 * Global offline/sync status indicator.
 *
 * Renders a fixed pill at the bottom-centre of the screen in three states:
 *  1. Offline — orange pill showing pending change count (if any)
 *  2. Just restored — green pill briefly confirming reconnection + sync start
 *  3. Syncing online — yellow pill while pending items are flushed
 *
 * Returns null when online with nothing pending and not just restored,
 * so it has zero visual impact during normal usage.
 */
export function OfflineIndicator() {
  const { isOnline, wasJustRestored } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Populate initial count from IndexedDB
    syncQueueManager.getPendingCount().then(setPendingCount);

    // Keep count in sync as mutations are queued / flushed
    const unsubscribe = syncQueueManager.subscribe(setPendingCount);
    return unsubscribe;
  }, []);

  // ── Network Change Toasts ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) {
      toast.error("You are now offline. Some features may be limited.", {
        id: "offline-status",
        icon: <WifiOff className="h-4 w-4" />,
        duration: Infinity, // Keep it visible until online
      });
    } else {
      // Clear the offline toast if it exists
      toast.dismiss("offline-status");
      
      if (wasJustRestored) {
        toast.success("Back online! Resuming sync...", {
          icon: <Wifi className="h-4 w-4" />,
          duration: 3000,
        });
      }
    }
  }, [isOnline, wasJustRestored]);

  // Nothing to show — normal online state
  if (isOnline && !wasJustRestored && pendingCount === 0) return null;

  const pillBase =
    'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg select-none transition-all duration-300';

  // ── Offline ───────────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div
        className={`${pillBase} bg-zinc-900 border border-zinc-700 text-zinc-100`}
        role="status"
        aria-live="polite"
      >
        <WifiOff className="h-4 w-4 text-orange-400 shrink-0" />
        <span>
          You&rsquo;re offline — showing cached data
          {pendingCount > 0 && (
            <span className="ml-1 text-orange-400">
              ({pendingCount} change{pendingCount !== 1 ? 's' : ''} pending)
            </span>
          )}
        </span>
      </div>
    );
  }

  // ── Just came back online ─────────────────────────────────────────────────
  if (wasJustRestored) {
    return (
      <div
        className={`${pillBase} bg-zinc-900 border border-green-700 text-green-400`}
        role="status"
        aria-live="polite"
      >
        <Wifi className="h-4 w-4 shrink-0" />
        {pendingCount > 0 ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>
              Back online — syncing {pendingCount} change
              {pendingCount !== 1 ? 's' : ''}…
            </span>
          </>
        ) : (
          <span>Back online</span>
        )}
      </div>
    );
  }

  // ── Online but still flushing pending items ───────────────────────────────
  if (pendingCount > 0) {
    return (
      <div
        className={`${pillBase} bg-zinc-900 border border-yellow-700 text-yellow-400`}
        role="status"
        aria-live="polite"
      >
        <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
        <span>
          Syncing {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}…
        </span>
      </div>
    );
  }

  return null;
}
