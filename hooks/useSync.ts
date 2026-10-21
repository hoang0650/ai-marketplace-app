import { useEffect, useRef } from 'react';
import { syncFeed } from '@/lib/sync';
import type { SyncEvent } from '@/api/handoff';
import { useAuth } from './useAuth';

/** Subscribe to this user's cross-device events while the component is mounted. */
export function useSync(onEvent: (e: SyncEvent) => void) {
  const { isAuthenticated } = useAuth();
  const ref = useRef(onEvent);
  ref.current = onEvent;
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    return syncFeed.subscribe((e) => ref.current(e));
  }, [isAuthenticated]);
}
