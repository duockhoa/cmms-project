import React from 'react';
import { EmptyState } from '../common';
import { Modal } from '../common/Modal';

interface ScheduleLogModalProps {
  schedule: any | null;
  timeline: any[];
  loading: boolean;
  onClose: () => void;
}

export const ScheduleLogModal: React.FC<ScheduleLogModalProps> = ({ schedule, timeline, loading, onClose }) => (
  <Modal isOpen={Boolean(schedule)} onClose={onClose} title={`Lịch sử kế hoạch: ${schedule?.scheduleCode || ''}`}>
    <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>Đang tải dòng thời gian...</div>
      ) : timeline.length === 0 ? (
        <EmptyState compact minHeight={130} title="Chưa có nhật ký hoạt động" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {timeline.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '6px',
                borderLeft: '3px solid var(--primary, #2563eb)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px' }}>{entry.action}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(entry.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              {entry.reason && <div style={{ fontSize: '13px', marginBottom: '4px' }}>{entry.reason}</div>}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Người thực hiện: {entry.actedBy?.name || 'Hệ thống'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Modal>
);
