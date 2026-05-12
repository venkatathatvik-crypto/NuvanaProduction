import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, Wifi, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface OnlineOnlyGuardProps {
  /** Display name shown in the dialog, e.g. "AI Tutor" */
  featureName: string;
  /** Optional one-line explanation, defaults to a sensible message */
  reason?: string;
  children: ReactNode;
}

/**
 * Route-level guard for features that require an active internet connection.
 *
 * Behaviour:
 *  - While offline (at any point) → show a blocking dialog; page content
 *    is NOT rendered.
 *  - When connectivity is restored → brief "Connecting…" state, then
 *    auto-dismiss and render the page.
 *  - "Go Back" always navigates to the previous page.
 */
export function OnlineOnlyGuard({
  featureName,
  reason,
  children,
}: OnlineOnlyGuardProps) {
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();

  // Show a brief "Connecting..." state when coming back online to smooth
  // the transition from the dialog to the page content.
  const [connecting, setConnecting] = useState(false);
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOfflineRef = useRef(!navigator.onLine);

  // Block whenever the user is offline (whether they navigated here offline
  // or lost connectivity after already loading the page).
  const showBlocker = !isOnline;

  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      // Came back online — show brief "Connecting…" then reveal the page.
      wasOfflineRef.current = false;
      setConnecting(true);
      connectingTimerRef.current = setTimeout(() => {
        setConnecting(false);
      }, 800);
    } else if (!isOnline) {
      wasOfflineRef.current = true;
      setConnecting(false);
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
    }

    return () => {
      if (connectingTimerRef.current) clearTimeout(connectingTimerRef.current);
    };
  }, [isOnline]);

  const handleGoBack = () => navigate(-1);

  const defaultReason =
    `requires a live internet connection and cannot be used offline.`;

  return (
    <>
      {/* Render page content only when online and not in the connecting transition */}
      {isOnline && !connecting ? children : null}

      {/* Offline access blocker dialog — cannot be dismissed by the user */}
      <Dialog open={showBlocker || connecting} onOpenChange={() => {}}>
        <DialogContent
          // Hide the default Radix close (×) button — user must go back
          className="max-w-sm sm:max-w-md [&>button:last-of-type]:hidden"
          // Block all ways of closing the dialog while offline
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center text-center gap-0">
            {/* Icon pill */}
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5 transition-colors duration-500 ${
                connecting || isOnline
                  ? 'bg-green-500/10'
                  : 'bg-orange-500/10'
              }`}
            >
              {connecting || isOnline ? (
                <Wifi className="h-8 w-8 text-green-400" />
              ) : (
                <WifiOff className="h-8 w-8 text-orange-400" />
              )}
            </div>

            <DialogTitle className="text-xl">
              {connecting ? 'Connection Restored' : 'No Internet Connection'}
            </DialogTitle>

            <DialogDescription className="mt-2 text-center leading-relaxed">
              {connecting ? (
                <>Loading <span className="font-semibold text-foreground">{featureName}</span>…</>
              ) : (
                <>
                  <span className="font-semibold text-foreground">{featureName}</span>{' '}
                  {reason ?? defaultReason}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {connecting ? (
              /* Auto-loading state */
              <div className="flex items-center justify-center gap-2 text-green-400 py-1">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Please wait…</span>
              </div>
            ) : (
              <>
                {/* Hint text */}
                <p className="text-xs text-muted-foreground text-center">
                  Check your Wi-Fi or mobile data, then this page will open automatically.
                </p>

                {/* Go back button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
