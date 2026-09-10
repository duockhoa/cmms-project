import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface PermissionsState {
  user: any | null;
  permissions: string[];
  isAdmin: boolean;
  loading: boolean;
}

// Global cached auth profile to avoid redundant API calls across pages
let cachedProfile: { user: any; permissions: string[] } | null = null;
let profilePromise: Promise<{ user: any; permissions: string[] }> | null = null;

export const invalidatePermissionsCache = () => {
  cachedProfile = null;
  profilePromise = null;
};

export const fetchPermissionsProfile = async (): Promise<{ user: any; permissions: string[] }> => {
  if (cachedProfile) return cachedProfile;
  if (!profilePromise) {
    profilePromise = api.getMe()
      .then((res: any) => {
        const u = res?.user || res;
        const perms: string[] = Array.isArray(res?.permissions) ? res.permissions : [];
        cachedProfile = { user: u, permissions: perms };
        return cachedProfile;
      })
      .catch((err) => {
        profilePromise = null;
        throw err;
      });
  }
  return profilePromise;
};

export const usePermissions = () => {
  const [state, setState] = useState<PermissionsState>({
    user: cachedProfile?.user || null,
    permissions: cachedProfile?.permissions || [],
    isAdmin: Boolean(
      cachedProfile?.user?.role === 'ADMIN' ||
      cachedProfile?.user?.role === 'SUPER_ADMIN' ||
      cachedProfile?.permissions?.includes('ALL')
    ),
    loading: !cachedProfile,
  });

  useEffect(() => {
    let isMounted = true;
    fetchPermissionsProfile()
      .then((data) => {
        if (!isMounted) return;
        const role = data.user?.role?.toUpperCase();
        const isAdminUser = role === 'ADMIN' || role === 'SUPER_ADMIN' || data.permissions.includes('ALL');
        setState({
          user: data.user,
          permissions: data.permissions,
          isAdmin: isAdminUser,
          loading: false,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const checkSinglePermission = useCallback(
    (code: string): boolean => {
      if (state.permissions.includes('ALL') || state.permissions.includes('*')) return true;
      const [mod] = code.split(':');
      if (state.permissions.includes(`${mod}:*`) || state.permissions.includes(`${mod}:ALL`)) return true;
      return state.permissions.includes(code);
    },
    [state.permissions]
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
    ...state,
    can,
    canAny,
    canAll,
    refreshPermissions: async () => {
      invalidatePermissionsCache();
      const data = await fetchPermissionsProfile();
      const hasFullAccess = data.permissions.includes('ALL') || data.permissions.includes('*');
      setState({
        user: data.user,
        permissions: data.permissions,
        isAdmin: hasFullAccess,
        loading: false,
      });
    },
  };
};
