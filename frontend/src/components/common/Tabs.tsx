import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  key: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: LucideIcon;
  count?: number;
  badgeColor?: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pills' | 'segmented';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  onChange,
  variant = 'underline',
  orientation = 'horizontal',
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`tabs-nav-container tabs-${variant} ${className}`}
      role="tablist"
      style={{
        display: 'flex',
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        alignItems: orientation === 'vertical' ? 'stretch' : 'center',
        gap: variant === 'segmented' ? '4px' : '8px',
        overflowX: orientation === 'horizontal' ? 'auto' : undefined,
        whiteSpace: orientation === 'horizontal' ? 'nowrap' : undefined,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        borderBottom: variant === 'underline' ? '1px solid var(--border-color)' : undefined,
        backgroundColor: variant === 'segmented' ? 'var(--bg-secondary)' : undefined,
        padding: variant === 'segmented' ? '4px' : '0 0 2px 0',
        borderRadius: variant === 'segmented' ? '8px' : undefined,
        ...style,
      }}
    >
      {items.map((tab) => {
        const isActive = tab.key === activeKey;
        const Icon = tab.icon;

        let buttonStyle: React.CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: variant === 'underline' ? '10px 16px' : '8px 14px',
          fontSize: '14px',
          fontWeight: isActive ? 600 : 500,
          borderRadius: variant === 'pills' ? '20px' : variant === 'segmented' ? '6px' : '0',
          border: 'none',
          cursor: tab.disabled ? 'not-allowed' : 'pointer',
          opacity: tab.disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          outline: 'none',
          position: 'relative',
          width: orientation === 'vertical' ? '100%' : undefined,
          textAlign: 'left',
        };

        if (variant === 'underline') {
          buttonStyle = {
            ...buttonStyle,
            background: 'transparent',
            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
            marginBottom: '-1px',
          };
        } else if (variant === 'pills') {
          buttonStyle = {
            ...buttonStyle,
            background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: isActive ? '#ffffff' : 'var(--text-secondary)',
          };
        } else if (variant === 'segmented') {
          buttonStyle = {
            ...buttonStyle,
            background: isActive ? 'var(--bg-primary)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          };
        }

        return (
          <button
            key={tab.key}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            style={buttonStyle}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            role="tab"
            aria-selected={isActive}
          >
            {Icon && <Icon size={16} />}
            <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span className={tab.shortLabel ? 'tab-label-full' : undefined}>{tab.label}</span>
              {tab.shortLabel && <span className="tab-label-short">{tab.shortLabel}</span>}
              {tab.description && (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.description}
                </span>
              )}
            </span>
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  backgroundColor: tab.badgeColor || (isActive && variant === 'pills' ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary, #e2e8f0)'),
                  color: isActive && variant === 'pills' ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
