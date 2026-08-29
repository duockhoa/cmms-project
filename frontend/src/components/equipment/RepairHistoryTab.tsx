import React from 'react';
import { StatusBadge } from '../common/Badge';

interface RepairHistoryTabProps {
  workOrdersList: any[];
}

export const RepairHistoryTab: React.FC<RepairHistoryTabProps> = ({ workOrdersList }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Timeline bảo trì</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingLeft: '20px' }}>
          <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
          {workOrdersList.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
              Không có lịch sử sửa chữa nào
            </div>
          ) : workOrdersList.map((wo: any, idx: number) => (
            <div key={wo.id || idx} style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '-20px', top: '4px',
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: wo.priority === 'HIGH' || wo.priority === 'URGENT' ? '#d97706' : '#16a34a',
                border: '2px solid #ffffff'
              }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className={`badge ${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                  {wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'Sửa chữa' : 'Phòng ngừa'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{wo.title}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Người phụ trách: {wo.technicianName || 'Chưa phân công'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Trạng thái: <StatusBadge status={wo.status} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
