import React from 'react';
import { StatusBadge } from '../common/Badge';

interface MaintenanceSchedulesTabProps {
  schedulesList: any[];
}

export const MaintenanceSchedulesTab: React.FC<MaintenanceSchedulesTabProps> = ({ schedulesList }) => {
  return (
    <div style={{ padding: '24px 0' }}>
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Kế hoạch bảo trì phòng ngừa định kỳ</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {schedulesList.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
              Chưa có lịch bảo trì phòng ngừa nào được lập
            </div>
          ) : schedulesList.map((sch: any) => (
            <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sch.title}</span>
                  <StatusBadge status={sch.status} />
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>{sch.frequencyType}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Đến hạn: {sch.nextDueDate ? new Date(sch.nextDueDate).toLocaleDateString('vi-VN') : 'Chưa đến hạn'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
