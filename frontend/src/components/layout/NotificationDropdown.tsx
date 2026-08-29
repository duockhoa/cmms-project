import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../../services/api';
import { io, Socket } from 'socket.io-client';

interface NotificationDropdownProps {
  currentUser?: any;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ currentUser }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // WebSocket real-time listener
  useEffect(() => {
    if (!currentUser?.id) return;

    const socketUrl =
      window.location.protocol === 'https:'
        ? `https://${window.location.hostname}:3001/notifications`
        : `http://${window.location.hostname}:3001/notifications`;

    const socket: Socket = io(socketUrl, {
      query: {
        userId: currentUser.id,
        role: currentUser.role,
        department: currentUser.department || '',
      },
      transports: ['websocket'],
    });

    socket.on('notification', (newNotification: any) => {
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter((n) => !n.isRead).map((n) => api.markNotificationRead(n.id))
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: isOpen ? 'var(--bg-hover, #f1f5f9)' : 'var(--bg-secondary, #ffffff)',
          color: 'var(--text-secondary, #475569)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Thông báo"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: 'var(--danger, #dc2626)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '10px',
              minWidth: '17px',
              height: '17px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '2px solid var(--bg-secondary, #ffffff)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: '44px',
            width: '360px',
            maxHeight: '440px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            padding: 0,
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-primary, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    color: 'var(--danger, #dc2626)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue, #2563eb)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <CheckCheck size={14} /> Đã đọc tất cả
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Bell size={28} style={{ opacity: 0.3, margin: '0 auto 8px auto' }} />
                Chưa có thông báo nào.
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color, #e2e8f0)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    backgroundColor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = n.isRead
                      ? 'transparent'
                      : 'rgba(37, 99, 235, 0.04)')
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontWeight: n.isRead ? 600 : 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          backgroundColor: 'var(--accent-blue, #2563eb)',
                          borderRadius: '50%',
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                    {n.message}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: '2px' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
