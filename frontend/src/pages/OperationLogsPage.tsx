import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const OperationLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAllOperationLogs();
      setLogs(data);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          // Xử lý khi quét thành công
          // Giả sử mã QR chính là equipmentId hoặc có format "equipment/ID"
          scanner.clear();
          setShowScanner(false);
          const eqId = decodedText.replace('equipment/', '').trim();
          if (eqId) {
            navigate(`/equipment/${eqId}/operation-log-form`);
          } else {
            alert('Mã QR không hợp lệ!');
          }
        },
        (errorMessage) => {
          // Lỗi này xảy ra liên tục khi chưa thấy mã QR, có thể bỏ qua
        }
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner, navigate]);

  return (
    <div style={{ padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Sổ vận hành (Toàn hệ thống)</h1>
          <p className="page-subtitle">Quản lý và tra cứu toàn bộ lịch sử thông số vận hành của tất cả thiết bị.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowScanner(true)}>
            <Camera size={16} style={{ marginRight: 6 }} /> Quét mã QR (Nhập liệu)
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
        ) : (
          <div className="table-wrapper" style={{ padding: 0, border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Thiết bị</th>
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
                    <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {log.equipment?.name} <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({log.equipment?.code})</span>
                    </td>
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
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có dữ liệu vận hành trên hệ thống</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScanner && (
        <div style={{
          position: 'fixed', inset: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(8px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div className="card" style={{ width: '400px', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Quét mã QR</h3>
              <button 
                onClick={() => setShowScanner(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div id="reader" style={{ width: '100%' }}></div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: 16 }}>
              Hướng camera vào mã QR được dán trên thiết bị.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
