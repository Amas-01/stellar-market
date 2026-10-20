'use client';

import Link from 'next/link';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { WifiOff, RefreshCw, LogIn } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, hasPendingSync, needsReauth } = useOfflineStatus();

  if (isOnline && !hasPendingSync && !needsReauth) {
    return null;
  }

  return (
    <div
      className="fixed top-16 left-0 right-0 z-40 bg-amber-500 dark:bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>You are offline. Some features may be unavailable.</span>
          </>
        ) : needsReauth ? (
          <>
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>
              Some changes you made offline couldn&apos;t be sent because your session expired.
              They&apos;re still saved on this device.{' '}
              <Link href="/auth/login" className="underline">
                Sign in again
              </Link>{' '}
              to resend them.
            </span>
          </>
        ) : hasPendingSync ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Syncing pending changes...</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
