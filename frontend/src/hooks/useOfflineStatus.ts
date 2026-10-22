'use client';

import { useState, useEffect } from 'react';
import { SYNC_AUTH_REQUIRED_EVENT } from '@/utils/syncEvents';

export interface OfflineStatus {
  isOnline: boolean;
  hasPendingSync: boolean;
  /** Queued actions were refused with 401/403 and wait for the user to sign in again. */
  needsReauth: boolean;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  useEffect(() => {
    // Initialize with navigator.onLine
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending sync operations in IndexedDB
    const checkPendingSync = async () => {
      if ('indexedDB' in window) {
        try {
          const { getPendingCount, getAuthRequiredCount } = await import('@/utils/backgroundSync');
          const count = await getPendingCount();
          setHasPendingSync(count > 0);
          setNeedsReauth((await getAuthRequiredCount()) > 0);
        } catch (error) {
          console.error('Error checking pending sync:', error);
        }
      }
    };

    checkPendingSync();

    // Recheck pending sync when coming back online, and when a replay was
    // refused because the session expired
    window.addEventListener('online', checkPendingSync);
    window.addEventListener(SYNC_AUTH_REQUIRED_EVENT, checkPendingSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', checkPendingSync);
      window.removeEventListener(SYNC_AUTH_REQUIRED_EVENT, checkPendingSync);
    };
  }, []);

  return { isOnline, hasPendingSync, needsReauth };
}
