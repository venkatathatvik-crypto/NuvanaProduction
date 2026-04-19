import React, { useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WifiOff } from 'lucide-react';

interface ConnectivityGuardProps {
  children: React.ReactNode;
  /** Custom message to show in the popup */
  message?: string;
  /** Whether to allow the action to proceed anyway (rarely used) */
  allowAnyway?: boolean;
}

/**
 * ConnectivityGuard wraps interactive elements that REQUIRE an internet connection.
 * It catches clicks in a capture phase and prevents the action if offline,
 * showing a descriptive popup instead.
 */
export function ConnectivityGuard({ 
  children, 
  message = "This feature requires an active internet connection to work.",
  allowAnyway = false 
}: ConnectivityGuardProps) {
  const { isOnline } = useNetworkStatus();
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isOnline && !allowAnyway) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  };

  return (
    <>
      <div onClickCapture={handleClick} className="contents">
        {children}
      </div>

      <AlertDialog open={showModal} onOpenChange={setShowModal}>
        <AlertDialogContent className="glass-card border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-orange-400" />
              Connection Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary hover:bg-primary/90">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
