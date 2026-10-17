import { useEffect, useRef } from 'react';
import { useSocket, DataChangePayload } from '../context/SocketContext';

interface UseRealtimeSyncOptions {
  debounceMs?: number;
  enabled?: boolean;
  onEvent?: (payload: DataChangePayload) => void;
}

/**
 * Hook to automatically reload data when backend emits real-time data changes.
 *
 * @param entities Entity name or array of entity names to listen to (e.g. 'WORK_ORDER', 'REQUEST')
 * @param onReload Callback function to refresh/reload data
 * @param options Additional options (debounce, enabled flag, custom event handler)
 */
export function useRealtimeSync(
  entities: string | string[],
  onReload: () => void,
  options?: UseRealtimeSyncOptions
) {
  const { subscribeDataChange } = useSocket();
  const reloadRef = useRef(onReload);
  reloadRef.current = onReload;

  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  const timerRef = useRef<any>(null);
  const pendingReloadRef = useRef(false);
  const debounceMs = options?.debounceMs ?? 350;
  const enabled = options?.enabled ?? true;

  // Listen to tab visibility to perform pending reloads when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pendingReloadRef.current) {
        pendingReloadRef.current = false;
        reloadRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeDataChange(entities, (payload) => {
      if (onEventRef.current) {
        try {
          onEventRef.current(payload);
        } catch (e) {
          console.error('[REALTIME] Error in custom onEvent handler:', e);
        }
      }

      // If document is currently hidden in background tab, postpone reload until user tabs back in
      if (document.visibilityState === 'hidden') {
        pendingReloadRef.current = true;
        return;
      }

      // Debounce reload calls to avoid rapid UI refetches
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        reloadRef.current();
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [entities, subscribeDataChange, enabled, debounceMs]);
}
