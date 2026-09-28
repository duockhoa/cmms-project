import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KpiVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
  footer?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_COLORS: Record<KpiVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: '#3b82f6' },
  success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: '#10b981' },
  warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b' },
  danger: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef4444' },
  info: { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4', border: '#06b6d4' },
  purple: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6', border: '#8b5cf6' },
  default: { bg: 'rgba(100, 116, 139, 0.1)', text: 'var(--accent-primary)', border: 'var(--border-color)' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  trend,
  footer,
  onClick,
  loading = false,
  className = '',
  style = {},
}) => {
  const colors = VARIANT_COLORS[variant] || VARIANT_COLORS.default;
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`kpi-card kpi-card-unified ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick?.();
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        borderLeft: variant !== 'default' ? `4px solid ${colors.border}` : undefined,
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>
            {title}
          </span>
          <div className="kpi-card-value" style={{ marginTop: '4px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {loading ? (
              <span className="skeleton-line" style={{ display: 'inline-block', width: '80px', height: '26px', borderRadius: '4px' }} />
            ) : (
              value
            )}
          </div>
          {subtext && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              {subtext}
            </p>
          )}
        </div>

        {Icon && (
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: colors.bg,
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={24} />
          </div>
        )}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12px' }}>
          {trend.direction === 'up' && <TrendingUp size={14} style={{ color: '#10b981' }} />}
          {trend.direction === 'down' && <TrendingDown size={14} style={{ color: '#ef4444' }} />}
          {trend.direction === 'flat' && <Minus size={14} style={{ color: 'var(--text-muted)' }} />}
          <span
            style={{
              fontWeight: 700,
              color: trend.direction === 'up' ? '#10b981' : trend.direction === 'down' ? '#ef4444' : 'var(--text-muted)',
            }}
          >
            {trend.value}
          </span>
          {trend.label && <span style={{ color: 'var(--text-muted)' }}>{trend.label}</span>}
        </div>
      )}

      {footer && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
