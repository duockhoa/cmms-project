import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { usePermissions } from '../hooks/usePermissions';
import { getAccessToken } from '../utils/authStorage';

export interface DataChangePayload {
  entity: string; // 'WORK_ORDER' | 'REQUEST' | 'MAINTENANCE_SCHEDULE' | 'EQUIPMENT' | 'INVENTORY' | 'FABRICATION' | 'OPERATION_LOG' | 'CHECKLIST' | 'UTILITY' | 'FEEDBACK'
  action: string; // 'CREATED' | 'UPDATED' | 'DELETED' | 'STATUS_CHANGED' | 'CANCELLED'
  id?: string;
  department?: string | null;
  role?: string | null;
  userId?: string | null;
  metadata?: any;
}

type DataChangeListener = (payload: DataChangePayload) => void;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeDataChange: (entities: string | string[], listener: DataChangeListener) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  subscribeDataChange: () => () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = usePermissions();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersMapRef = useRef<Map<string, Set<DataChangeListener>>>(new Map());

  // Connect singleton socket
  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const socketUrl = isLocalhost
      ? `${window.location.protocol}//${window.location.hostname}:3001/notifications`
      : `${window.location.origin}/notifications`;

    const s = io(socketUrl, {
      query: {
        userId: user.id,
        role: user.role || '',
        department: user.department || '',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 8000,
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('data:changed', (payload: DataChangePayload) => {
      if (!payload || !payload.entity) return;
      const entity = payload.entity.toUpperCase();

      // Trigger all listeners matching this entity or matching '*'
      const listeners = listenersMapRef.current.get(entity);
      if (listeners) {
        listeners.forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {
            console.error('[SOCKET] Error in data change listener:', e);
          }
        });
      }

      const globalListeners = listenersMapRef.current.get('*');
      if (globalListeners) {
        globalListeners.forEach((fn) => {
          try {
            fn(payload);
          } catch (e) {}
        });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, user?.role, user?.department]);

  // Subscribe helper
  const subscribeDataChange = useCallback(
    (entities: string | string[], listener: DataChangeListener) => {
      const entityList = Array.isArray(entities) ? entities : [entities];
      entityList.forEach((e) => {
        const key = e.toUpperCase();
        if (!listenersMapRef.current.has(key)) {
          listenersMapRef.current.set(key, new Set());
        }
        listenersMapRef.current.get(key)!.add(listener);
      });

      return () => {
        entityList.forEach((e) => {
          const key = e.toUpperCase();
          const set = listenersMapRef.current.get(key);
          if (set) {
            set.delete(listener);
            if (set.size === 0) {
              listenersMapRef.current.delete(key);
            }
          }
        });
      };
    },
    []
  );

  return (
    <SocketContext.Provider value={{ socket, isConnected, subscribeDataChange }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
