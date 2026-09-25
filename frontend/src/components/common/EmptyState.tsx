import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: EmptyStateAction;
  colSpan?: number;
  minHeight?: string | number;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  description,
  action,
  colSpan,
  minHeight = 220,
  compact = false,
  className = '',
}) => {
  const content = (
    <div
      className={`empty-state-container ${compact ? 'empty-state-compact' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '20px 16px' : '40px 24px',
        minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
        textAlign: 'center',
        color: 'var(--text-muted, #64748b)',
      }}
    >
      <div
        className="empty-state-icon-wrapper"
        style={{
          width: compact ? '40px' : '56px',
          height: compact ? '40px' : '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-hover, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: compact ? '10px' : '16px',
          color: 'var(--text-muted, #94a3b8)',
        }}
      >
        <Icon size={compact ? 20 : 28} strokeWidth={1.75} />
      </div>

      <h4
        className="empty-state-title"
        style={{
          margin: '0 0 6px 0',
          fontSize: compact ? '0.95rem' : '1.05rem',
          fontWeight: 600,
          color: 'var(--text-primary, #1e293b)',
        }}
      >
        {title}
      </h4>

      {description && (
        <p
          className="empty-state-description"
          style={{
            margin: '0 0 16px 0',
            fontSize: compact ? '0.825rem' : '0.875rem',
            maxWidth: '380px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`btn ${
            action.variant === 'secondary'
              ? 'btn-secondary'
              : action.variant === 'outline'
              ? 'btn-outline'
              : 'btn-primary'
          } ${compact ? 'btn-sm' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: description ? '0' : '8px',
          }}
        >
          {action.icon && React.createElement(action.icon, { size: compact ? 14 : 16 })}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ padding: 0, border: 'none' }}>
          {content}
        </td>
      </tr>
    );
  }

  return content;
};
