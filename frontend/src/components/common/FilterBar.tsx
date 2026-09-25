import React from 'react';
import { RotateCcw } from 'lucide-react';

export interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  hasActiveFilters?: boolean;
  extraActions?: React.ReactNode;
  className?: string;
  card?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  onReset,
  resetLabel = 'Đặt lại',
  hasActiveFilters = false,
  extraActions,
  className = '',
  card = true,
}) => {
  const containerClasses = [
    card ? 'card mb-4' : '',
    'filter-bar-responsive',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
        {children}

        {onReset && hasActiveFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReset}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
            }}
            title="Xóa tất cả bộ lọc hiện tại về mặc định"
          >
            <RotateCcw size={13} />
            <span>{resetLabel}</span>
          </button>
        )}
      </div>

      {extraActions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {extraActions}
        </div>
      )}
    </div>
  );
};
