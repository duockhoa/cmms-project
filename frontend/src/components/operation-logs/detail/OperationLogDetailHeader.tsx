import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../common/Badge';

export const OperationLogDetailHeader: React.FC<any> = ({
  equipment, isSidebarCollapsed, onToggleSidebar,
}) => (
      <div className="op-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="btn btn-secondary btn-sm op-desktop-toggle"
              title={isSidebarCollapsed ? "Hiện danh sách thiết bị" : "Thu gọn danh sách để mở rộng bảng"}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', fontSize: '11.5px' }}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {isSidebarCollapsed ? 'Hiện danh sách máy' : 'Toàn màn hình'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '11.5px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {equipment.code}
            </span>
            <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {equipment.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>Xưởng: <strong style={{ color: 'var(--text-primary)' }}>{equipment.location}</strong></span>
            <span>Loại: <strong style={{ color: 'var(--text-primary)' }}>{equipment.category}</strong></span>
            <StatusBadge status={equipment.status} />
          </div>
        </div>
      </div>
);
