import React from 'react';
import { XOctagon, FileText, AlertTriangle } from 'lucide-react';

interface OperationLogDetailViewProps {
  log: any;
  onClose: () => void;
}

export const OperationLogDetailView: React.FC<OperationLogDetailViewProps> = ({
  log,
  onClose,
}) => {
  if (!log) return null;

  return (
    <div className="request-detail-view" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          Chi tiết Bản ghi Vận hành
        </h2>
        <button onClick={onClose} className="btn-icon">
          <XOctagon size={18} />
        </button>
      </div>

      <div className="request-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Top Header Card - Alert if outlier */}
        {log.isOutlier && (
          <div className="card" style={{ padding: '20px', backgroundColor: '#fee2e2', borderRadius: '12px', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <AlertTriangle size={24} />
             </div>
             <div>
               <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#991b1b', margin: '0 0 4px 0' }}>Cảnh báo Vượt ngưỡng</h3>
               <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>
                 Chỉ số đo được ({log.value} {log.parameter?.unit}) nằm ngoài khoảng tiêu chuẩn định mức. Cần theo dõi thiết bị này.
               </p>
             </div>
          </div>
        )}

        {/* Metadata Table */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} /> Thông tin Đo lường
          </h3>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', width: '35%', color: 'var(--text-secondary)' }}>Thiết bị</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{log.equipment?.name} ({log.equipment?.code})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thông số đo</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{log.parameter?.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Giá trị ghi nhận</td>
                <td style={{ padding: '12px 0', fontWeight: 800, color: log.isOutlier ? '#dc2626' : '#16a34a', fontSize: '16px' }}>
                  {log.value} {log.parameter?.unit}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tiêu chuẩn (Min - Max)</td>
                <td style={{ padding: '12px 0' }}>
                  {log.parameter?.minSpec ?? 'Không có'} {log.parameter?.unit} - {log.parameter?.maxSpec ?? 'Không có'} {log.parameter?.unit}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
                <td style={{ padding: '12px 0' }}>
                  {log.isOutlier ? (
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Vượt ngưỡng</span>
                  ) : (
                    <span style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Bình thường</span>
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người ghi nhận</td>
                <td style={{ padding: '12px 0' }}>{log.recordedBy?.name || '---'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thời gian ghi nhận</td>
                <td style={{ padding: '12px 0' }}>{new Date(log.recordedAt).toLocaleString('vi-VN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Ghi chú</td>
                <td style={{ padding: '12px 0' }}>{log.notes || 'Không có ghi chú'}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
