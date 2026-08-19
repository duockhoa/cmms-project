import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { EquipmentOperationDetailView } from '../components/common/OperationLogDetailView';

export const OperationLogsPage: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const data = await api.getEquipment();
      setEquipmentList(data);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
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
          const eqId = decodedText.replace('equipment/', '').replace('cmms-equipment:', '').trim();
          if (eqId) {
            setSelectedEqId(eqId);
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

      <div className="master-detail-container">
        
        {/* Master List Pane */}
        <div className={`master-pane ${selectedEqId ? 'has-selection' : ''}`}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
          ) : selectedEqId ? (
            // Card List View
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)' }}>
              {equipmentList.map(eq => (
                <div 
                  key={eq.id}
                  onClick={() => setSelectedEqId(eq.id)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    backgroundColor: selectedEqId === eq.id ? 'var(--bg-primary)' : 'var(--bg-card)',
                    border: selectedEqId === eq.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    boxShadow: selectedEqId === eq.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                      {eq.code || '---'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {eq.category}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                    {eq.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Khu vực: {eq.location}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Table View
            <div className="table-wrapper" style={{ padding: 0, border: 'none' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Thiết bị</th>
                    <th>Tên Thiết bị</th>
                    <th>Phân loại</th>
                    <th>Khu vực</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentList.map(eq => (
                    <tr 
                      key={eq.id}
                      onClick={() => setSelectedEqId(eq.id)}
                      style={{ transition: 'background-color 0.2s ease', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ fontWeight: 600 }}>{eq.code}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{eq.name}</td>
                      <td>{eq.category}</td>
                      <td>{eq.location}</td>
                      <td>
                        <span style={{ 
                          backgroundColor: eq.status === 'ACTIVE' ? '#dcfce7' : eq.status === 'INACTIVE' ? '#fee2e2' : '#fef3c7', 
                          color: eq.status === 'ACTIVE' ? '#16a34a' : eq.status === 'INACTIVE' ? '#dc2626' : '#d97706', 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {eq.status === 'ACTIVE' ? 'Hoạt động' : eq.status === 'INACTIVE' ? 'Ngưng hoạt động' : 'Bảo trì'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {equipmentList.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có thiết bị nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedEqId && (
          <div className="detail-pane">
            <EquipmentOperationDetailView 
              equipmentId={selectedEqId}
              onClose={() => setSelectedEqId(null)} 
            />
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
