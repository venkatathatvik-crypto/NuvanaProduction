import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface OfflineEmptyStateProps {
  /** Optional page/feature name shown in the message */
  pageName?: string;
}

/**
 * Shown when the user is offline AND there is no cached data for the page.
 * Use in place of a loading skeleton when `!isOnline && isLoading`.
 */
export function OfflineEmptyState({ pageName }: OfflineEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
      <div className="p-5 rounded-full bg-zinc-800 border border-zinc-700">
        <WifiOff className="w-10 h-10 text-orange-400" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">You're offline</h2>
      <p className="text-muted-foreground max-w-xs">
        {pageName
          ? `${pageName} data hasn't been cached yet. Connect to the internet to load it for the first time.`
          : "This data hasn't been cached yet. Connect to the internet to load it for the first time."}
      </p>
    </div>
  );
}

/**
 * Returns true when the user is offline AND data is still loading
 * (i.e. there is no cached data to show).
 *
 * Use this to swap loading skeletons for <OfflineEmptyState /> when offline.
 */
export function useOfflineLoading(isLoading: boolean): boolean {
  const { isOnline } = useNetworkStatus();
  return !isOnline && isLoading;
}
