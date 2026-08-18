import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { RefreshCw } from 'lucide-react';

interface EquipmentOperationLogsTabProps {
  equipmentId: string;
}

export const EquipmentOperationLogsTab: React.FC<EquipmentOperationLogsTabProps> = ({ equipmentId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getEquipmentLogs(equipmentId);
      setLogs(data);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [equipmentId]);

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Lịch sử thông số vận hành</h3>
          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>Xem lại toàn bộ giá trị vận hành đã ghi nhận của thiết bị này.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchLogs} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper" style={{ padding: 0, border: 'none' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Thông số</th>
                <th>Giá trị</th>
                <th>Trạng thái</th>
                <th>Người ghi nhận</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr 
                  key={log.id}
                  style={{ transition: 'background-color 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ fontWeight: 600 }}>{new Date(log.recordedAt).toLocaleString('vi-VN')}</td>
                  <td style={{ fontWeight: 600 }}>{log.parameter?.name}</td>
                  <td>
                    <span style={{ color: log.isOutlier ? '#dc2626' : 'inherit', fontWeight: log.isOutlier ? 'bold' : 600 }}>
                      {log.value} {log.parameter?.unit}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      backgroundColor: log.isOutlier ? '#fee2e2' : '#dcfce7', 
                      color: log.isOutlier ? '#dc2626' : '#16a34a', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {log.isOutlier ? 'Vượt ngưỡng' : 'Bình thường'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.recordedBy?.name || '---'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có dữ liệu vận hành nào được ghi nhận cho thiết bị này.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
