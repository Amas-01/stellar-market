/**
 * Dispatched on `window` when an offline-queued action is refused with
 * 401/403 on replay, because the session expired while the user was offline.
 *
 * Kept apart from backgroundSync.ts so listeners can subscribe without
 * loading IndexedDB code, which useOfflineStatus imports lazily.
 */
export const SYNC_AUTH_REQUIRED_EVENT = 'stellarmarket:sync-auth-required';
