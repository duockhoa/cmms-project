import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ── Single Toast ───────────────────────────────────────────────
const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

const colorMap: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: { bg: 'rgba(16,185,129,0.10)', border: '#10b981', icon: '#10b981', bar: '#10b981' },
  error: { bg: 'rgba(239,68,68,0.10)', border: '#ef4444', icon: '#ef4444', bar: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.10)', border: '#f59e0b', icon: '#f59e0b', bar: '#f59e0b' },
  info: { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', icon: '#3b82f6', bar: '#3b82f6' },
};

const SingleToast: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({ item, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = item.duration || 4000;
  const c = colorMap[item.type];

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(interval);
        setExiting(true);
        setTimeout(() => onDismiss(item.id), 320);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [duration, item.id, onDismiss]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 320);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: c.bg,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${c.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        minWidth: '340px',
        maxWidth: '440px',
        position: 'relative',
        overflow: 'hidden',
        animation: exiting
          ? 'toast-slide-out 0.32s ease-in forwards'
          : 'toast-slide-in 0.32s ease-out',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ color: c.icon, flexShrink: 0, marginTop: '2px' }}>{iconMap[item.type]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9', lineHeight: 1.4 }}>{item.title}</div>
        {item.message && (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
            {item.message}
          </div>
        )}
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
          padding: '2px', flexShrink: 0, borderRadius: '4px',
        }}
        onMouseOver={e => (e.currentTarget.style.color = '#f1f5f9')}
        onMouseOut={e => (e.currentTarget.style.color = '#64748b')}
      >
        <X size={16} />
      </button>
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, height: '3px',
          width: `${progress}%`, background: c.bar,
          borderRadius: '0 3px 0 12px', transition: 'width 0.03s linear',
        }}
      />
    </div>
  );
};

// ── Confirm Dialog ─────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  resolve?: (v: boolean) => void;
}

interface ConfirmDialogContextType {
  confirm: (title: string, message: string, opts?: { confirmText?: string; cancelText?: string; type?: 'danger' | 'warning' | 'info' }) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export const useConfirmDialog = (): ConfirmDialogContextType => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirmDialog must be used within ToastProvider');
  return ctx;
};

const ConfirmDialog: React.FC<{ state: ConfirmState; onClose: (v: boolean) => void }> = ({ state, onClose }) => {
  if (!state.open) return null;
  const danger = state.type === 'danger';
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        animation: 'toast-fade-in 0.2s ease-out',
      }}
      onClick={() => onClose(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'toast-slide-in 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            color: danger ? '#ef4444' : '#f59e0b',
          }}>
            <AlertTriangle size={22} />
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>
            {state.title}
          </h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onClose(false)}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: '1px solid #475569',
              background: 'transparent', color: '#cbd5e1', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#334155'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {state.cancelText || 'Hủy'}
          </button>
          <button
            onClick={() => onClose(true)}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: danger ? '#ef4444' : '#f59e0b',
              color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {state.confirmText || 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Provider ───────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: '', message: '' });

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const toastCtx: ToastContextType = {
    showToast,
    success: (t, m) => showToast('success', t, m),
    error: (t, m) => showToast('error', t, m),
    warning: (t, m) => showToast('warning', t, m),
    info: (t, m) => showToast('info', t, m),
  };

  const confirmFn = useCallback((
    title: string, message: string,
    opts?: { confirmText?: string; cancelText?: string; type?: 'danger' | 'warning' | 'info' }
  ): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({
        open: true, title, message,
        confirmText: opts?.confirmText, cancelText: opts?.cancelText,
        type: opts?.type || 'danger', resolve,
      });
    });
  }, []);

  const handleConfirmClose = (v: boolean) => {
    confirmState.resolve?.(v);
    setConfirmState({ open: false, title: '', message: '' });
  };

  return (
    <ToastContext.Provider value={toastCtx}>
      <ConfirmDialogContext.Provider value={{ confirm: confirmFn }}>
        {children}

        {/* Toast container */}
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 99999,
          display: 'flex', flexDirection: 'column', gap: '10px',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => (
            <SingleToast key={t.id} item={t} onDismiss={dismissToast} />
          ))}
        </div>

        {/* Confirm dialog */}
        <ConfirmDialog state={confirmState} onClose={handleConfirmClose} />
      </ConfirmDialogContext.Provider>
    </ToastContext.Provider>
  );
};
