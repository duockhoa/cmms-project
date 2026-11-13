import { useCallback, useSyncExternalStore } from 'react';
import { api, invalidateMeCache, setupSilentRefresh } from '../services/api';
import {
  getAccessToken, getRawAccessToken, hasRefreshSession, getSessionVersion,
  markSessionVerified, markSessionUnverified, subscribeSession,
  markPrincipalVerified, getPrincipalVersion,
} from '../utils/authStorage';

interface PermissionsState {
  user: any | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
  checking?: boolean;
  error: string | null;
  sessionVersion: number;
}
let state: PermissionsState = { user: null, permissions: [], isAdmin: false, loading: true, error: null, sessionVersion: -1 };
let generation = 0;
let profilePromise: Promise<{ user: any; permissions: string[] }> | null = null;
const listeners = new Set<() => void>();
const publish = (next: PermissionsState) => { state = next; listeners.forEach(listener => listener()); };

export const invalidatePermissionsCache = (background = false) => {
  generation++;
  profilePromise = null;
  invalidateMeCache();
  if (!background) markSessionUnverified();
  publish({ ...state, loading: !background || !state.user, checking: true, error: null, sessionVersion: getSessionVersion() });
};

export const fetchPermissionsProfile = async (): Promise<{ user: any; permissions: string[] }> => {
  if (profilePromise) return profilePromise;
  const currentGeneration = generation;
  const version = getSessionVersion();
  const pending = (async () => {
    try {
      const res = await api.getMe();
      if (currentGeneration !== generation || version !== getSessionVersion()) throw new Error('SESSION_CHANGED');
      if (!res?.authenticated || !res.user?.id) throw new Error('AUTH_REQUIRED');
      const token = getRawAccessToken();
      if (!token) throw new Error('AUTH_REQUIRED');
      markSessionVerified(token, res.identity?.provider === 'hrm' ? res.identity.subject : undefined);
      markPrincipalVerified(`${res.identity?.provider || 'local'}:${res.identity?.subject || res.user.id}`);
      const permissions: string[] = Array.isArray(res.permissions) ? res.permissions : [];
      publish({ user: res.user, permissions, loading: false, checking: false, error: null, sessionVersion: version,
        isAdmin: ['ADMIN', 'SUPER_ADMIN'].includes(res.user.role) || permissions.includes('ALL') || permissions.includes('*'),
      });
      setupSilentRefresh();
      return { user: res.user, permissions };
    } catch (error: any) {
      if (currentGeneration === generation) {
        publish({ ...state, loading: false, checking: false, error: error.message, sessionVersion: getSessionVersion() });
      }
      throw error;
    }
  })();
  profilePromise = pending;
  try { return await pending; } finally { if (profilePromise === pending) profilePromise = null; }
};
function load() {
  if (!getAccessToken() && !hasRefreshSession()) {
    publish({ user: null, permissions: [], isAdmin: false, loading: false, error: null, sessionVersion: getSessionVersion() });
    return;
  }
  void fetchPermissionsProfile().catch(() => {});
}
subscribeSession(() => { invalidatePermissionsCache(); if (listeners.size) load(); });
if (typeof window !== 'undefined') {
  let lastCheck = 0;
  const check = () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 500) return;
    lastCheck = Date.now();
    invalidatePermissionsCache(true);
    if (listeners.size) load();
  };
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (state.sessionVersion !== getSessionVersion() || state.loading) queueMicrotask(load);
  return () => { listeners.delete(listener); };
};
export const usePermissions = () => {
  const state = useSyncExternalStore(subscribe, () => stateSnapshot(), () => stateSnapshot());
  const checkSinglePermission = useCallback(
    (code: string): boolean => {
      if (state.isAdmin) return true;
      if (state.permissions.includes('ALL') || state.permissions.includes('*')) return true;
      const [mod] = code.split(':');
      if (state.permissions.includes(`${mod}:*`) || state.permissions.includes(`${mod}:ALL`)) return true;
      return state.permissions.includes(code);
    },
    [state.permissions, state.isAdmin]
  );

  const can = useCallback(
    (permissionCode: string): boolean => {
      return checkSinglePermission(permissionCode);
    },
    [checkSinglePermission]
  );

  const canAny = useCallback(
    (codes: string[]): boolean => {
      return codes.some((code) => checkSinglePermission(code));
    },
    [checkSinglePermission]
  );

  const canAll = useCallback(
    (codes: string[]): boolean => {
      return codes.every((code) => checkSinglePermission(code));
    },
    [checkSinglePermission]
  );

  return {
    ...state, principalVersion: getPrincipalVersion(), can, canAny, canAll,
    refreshPermissions: async () => {
      invalidatePermissionsCache();
      return fetchPermissionsProfile();
    },
  };
};
let blockedSnapshot: PermissionsState | null = null;
function stateSnapshot() {
  const version = getSessionVersion();
  if (state.sessionVersion === version) return state;
  if (!blockedSnapshot || blockedSnapshot.sessionVersion !== version) {
    blockedSnapshot = { ...state, loading: true, checking: true, error: null, sessionVersion: version };
  }
  return blockedSnapshot;
}
