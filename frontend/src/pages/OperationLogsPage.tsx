import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { 
  Camera, X, Search, ChevronLeft, ChevronRight, 
  MapPin, Sliders, RefreshCw, LayoutGrid
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { EquipmentOperationDetailView } from '../components/common/OperationLogDetailView';

export const OperationLogsPage: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  
  // Left Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqs, locs] = await Promise.all([
        api.getEquipment(),
        api.getLocations().catch(() => []),
      ]);
      const eqArray = Array.isArray(eqs) ? eqs : eqs.items || [];
      setEquipmentList(eqArray);
      setLocations(Array.isArray(locs) ? locs : []);

      // Auto-select first equipment if not selected
      if (eqArray.length > 0 && !selectedEqId) {
        setSelectedEqId(eqArray[0].id);
      }
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // QR Scanner Effect
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(console.error);
          setShowScanner(false);
          
          let eqId = decodedText.trim();
          if (eqId.includes('/equipment/')) {
            const match = eqId.match(/\/equipment\/([^/?#]+)/);
            if (match) eqId = match[1];
          } else {
            eqId = eqId.replace('equipment/', '').replace('cmms-equipment:', '').trim();
          }

          if (eqId) {
            navigate(`/equipment/${eqId}/operation-log-form`);
          } else {
            alert('Mã QR không hợp lệ!');
          }
        },
        () => {}
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner, navigate]);

  // Filtered Equipment
  const filteredEquipment = equipmentList.filter((eq) => {
    const matchLoc = selectedLocation === 'ALL' || eq.location === selectedLocation;
    const matchSearch =
      !search.trim() ||
      eq.code?.toLowerCase().includes(search.toLowerCase()) ||
      eq.name?.toLowerCase().includes(search.toLowerCase()) ||
      eq.category?.toLowerCase().includes(search.toLowerCase());
    return matchLoc && matchSearch;
  });

  return (
    <div style={{ padding: '0 0 20px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="page-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Sổ Vận Hành & Nhật Ký Giám Sát Thiết Bị
          </h1>
          <p className="page-subtitle" style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
            Quản lý và tra cứu bảng nhật ký thông số vận hành theo từng phiên ghi nhận / ca làm việc.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowScanner(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Camera size={15} /> Quét mã QR (Nhập ca)
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Collapsible Sidebar + Right Full-Width Logbook */}
      <div
        style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'stretch',
          flex: 1,
          minHeight: '620px',
        }}
      >
        {/* Left: Collapsible Equipment List Panel */}
        {!isSidebarCollapsed && (
          <div
            style={{
              width: '260px',
              flexShrink: 0,
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: 'calc(100vh - 170px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                Thiết bị ({filteredEquipment.length})
              </span>
              <button
                className="btn-icon"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Thu gọn danh sách để mở rộng bảng"
                style={{ padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', background: 'transparent' }}
              >
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã hoặc tên máy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '32px', fontSize: '12px' }}
              />
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            {/* Location Select */}
            <select
              className="form-input"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ height: '32px', fontSize: '11.5px', padding: '4px 8px' }}
            >
              <option value="ALL">Tất cả phân xưởng</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>

            {/* Equipment Scrollable List */}
            <div
              style={{
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                paddingRight: '2px',
                flex: 1,
              }}
            >
              {filteredEquipment.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Không tìm thấy thiết bị.
                </div>
              ) : (
                filteredEquipment.map((eq) => {
                  const isSelected = selectedEqId === eq.id;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEqId(eq.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isSelected
                          ? '1.5px solid var(--accent-blue, #2563eb)'
                          : '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '11.5px',
                            color: isSelected ? '#2563eb' : 'var(--text-primary)',
                          }}
                        >
                          {eq.code}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {eq.category}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {eq.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={10} /> {eq.location}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Collapsed State Toggle Bar */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Mở rộng danh sách chọn thiết bị"
            style={{
              width: '32px',
              flexShrink: 0,
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'background-color 0.15s ease',
              padding: '12px 0',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <ChevronRight size={16} />
            <span
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: '11.5px',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              CHỌN MÁY ({filteredEquipment.length})
            </span>
          </button>
        )}

        {/* Right: Full-Width Logbook Workspace */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #e2e8f0)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {selectedEqId ? (
            <EquipmentOperationDetailView
              equipmentId={selectedEqId}
              onClose={() => setSelectedEqId(null)}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
              Vui lòng chọn một thiết bị ở danh sách bên trái để xem Sổ vận hành.
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: '400px', padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Quét mã QR thiết bị</h3>
              <button
                onClick={() => setShowScanner(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div id="reader" style={{ width: '100%' }}></div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: 16 }}>
              Hướng camera vào tem QR dán trên máy để tự động mở form nhập ca.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationLogsPage;
