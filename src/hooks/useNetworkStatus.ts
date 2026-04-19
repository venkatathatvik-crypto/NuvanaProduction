import { useNetworkStatusContext } from '@/contexts/NetworkStatusContext';

export interface NetworkStatus {
  /** True when the browser believes it has connectivity. */
  isOnline: boolean;
  /**
   * True for 3 seconds after connectivity is restored.
   * Used to show a brief "Back online" banner before hiding the indicator.
   */
  wasJustRestored: boolean;
}

/**
 * Returns the shared network status from NetworkStatusContext.
 *
 * The context is initialised once at the app root and tracks online/offline
 * events from that point forward. This means even components that mount
 * AFTER an offline event has fired will correctly read isOnline = false,
 * rather than relying on the potentially stale navigator.onLine.
 */
export function useNetworkStatus(): NetworkStatus {
  return useNetworkStatusContext();
}
