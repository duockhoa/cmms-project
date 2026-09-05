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
  const [showMobileEqDrawer, setShowMobileEqDrawer] = useState(false);
  
  // Left Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  const navigate = useNavigate();

  const selectedEquipment = equipmentList.find((eq) => eq.id === selectedEqId);

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

  // QR Scanner Effect: resolves equipment by code, id or URL and opens form
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        async (decodedText) => {
          try {
            scanner.clear().catch(console.error);
            setShowScanner(false);

            let rawText = decodedText.trim();
            
            // Try parsing JSON if QR holds JSON
            if (rawText.startsWith('{') && rawText.endsWith('}')) {
              try {
                const parsed = JSON.parse(rawText);
                rawText = parsed.code || parsed.equipmentCode || parsed.equipmentId || parsed.id || rawText;
              } catch (_) {}
            }

            // Extract from URL if QR is a URL
            if (rawText.includes('/equipment/')) {
              const match = rawText.match(/\/equipment\/([^/?#]+)/);
              if (match) rawText = match[1];
            } else {
              rawText = rawText
                .replace(/^cmms-equipment:/i, '')
                .replace(/^equipment:/i, '')
                .replace(/^equipment\//i, '')
                .trim();
            }

            // Look up in equipmentList by code, accountingCode or id
            let matchedEq = equipmentList.find(
              (eq) =>
                eq.id?.toLowerCase() === rawText.toLowerCase() ||
                eq.code?.toLowerCase() === rawText.toLowerCase() ||
                eq.accountingCode?.toLowerCase() === rawText.toLowerCase()
            );

            // Fallback: search via API if not found in current list
            if (!matchedEq) {
              try {
                const searchRes = await api.getEquipment({ search: rawText });
                const searchItems = Array.isArray(searchRes) ? searchRes : searchRes?.items || [];
                matchedEq = searchItems.find(
                  (eq: any) =>
                    eq.id?.toLowerCase() === rawText.toLowerCase() ||
                    eq.code?.toLowerCase() === rawText.toLowerCase() ||
                    eq.accountingCode?.toLowerCase() === rawText.toLowerCase()
                ) || searchItems[0];
              } catch (_) {}
            }

            if (matchedEq) {
              // Automatically open the operation log recording form for the scanned equipment
              navigate(`/equipment/${matchedEq.id}/operation-log-form`);
            } else {
              alert(`Không tìm thấy thiết bị với mã QR: "${rawText}". Vui lòng kiểm tra lại tem QR trên máy.`);
            }
          } catch (err: any) {
            console.error('Lỗi xử lý QR:', err);
            alert('Lỗi khi xử lý mã QR.');
          }
        },
        () => {}
      );

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner, equipmentList, navigate]);

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
    <div className="op-logs-container">
      {/* Scoped Responsive Styles */}
      <style>{`
        .op-logs-container {
          padding: 0 0 20px 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        .op-logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .op-logs-workspace {
          display: flex;
          gap: 14px;
          align-items: stretch;
          flex: 1;
          min-height: 600px;
        }

        .op-logs-sidebar {
          width: 260px;
          flex-shrink: 0;
          background-color: var(--bg-secondary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: calc(100vh - 170px);
        }

        .op-logs-sidebar-toggle {
          width: 32px;
          flex-shrink: 0;
          background-color: var(--bg-secondary, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 12px 0;
          transition: background-color 0.15s ease;
        }

        .op-logs-detail-pane {
          flex: 1;
          min-width: 0;
          background-color: var(--bg-secondary, #ffffff);
          border-radius: 8px;
          border: 1px solid var(--border-color, #e2e8f0);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Mobile Equipment Bar - Hidden on desktop */
        .mobile-eq-bar {
          display: none;
        }

        /* Mobile Equipment Drawer - Hidden on desktop */
        .mobile-eq-drawer-overlay {
          display: none;
        }

        /* RESPONSIVE STYLES FOR TABLET & MOBILE (<= 768px) */
        @media (max-width: 768px) {
          .op-logs-container {
            padding: 0 0 16px 0;
          }

          .op-logs-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            margin-bottom: 10px;
          }

          .op-logs-header-title {
            font-size: 16px !important;
          }

          .op-logs-header-subtitle {
            display: none !important;
          }

          .op-logs-header-actions {
            display: flex;
            width: 100%;
            gap: 8px;
          }

          .op-logs-header-actions .btn {
            flex: 1;
            justify-content: center;
            padding: 9px 10px;
            font-size: 12.5px;
          }

          /* Hide desktop sidebar on mobile */
          .op-logs-sidebar,
          .op-logs-sidebar-toggle {
            display: none !important;
          }

          .op-logs-workspace {
            flex-direction: column;
            gap: 10px;
            min-height: auto;
          }

          .op-logs-detail-pane {
            border-radius: 8px;
          }

          /* Show Mobile Equipment Bar */
          .mobile-eq-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background-color: var(--bg-secondary, #ffffff);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 8px;
            gap: 10px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          }

          .mobile-eq-current {
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
          }

          .mobile-eq-code {
            font-weight: 700;
            font-size: 11px;
            color: #2563eb;
            background: rgba(37, 99, 235, 0.08);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            width: fit-content;
          }

          .mobile-eq-name {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 3px;
          }

          .mobile-eq-loc {
            font-size: 11px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 3px;
            margin-top: 2px;
          }

          .mobile-switch-eq-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 8px 12px;
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #1e293b;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            transition: all 0.15s ease;
          }

          .mobile-switch-eq-btn:active {
            background-color: #e2e8f0;
            transform: scale(0.98);
          }

          /* Mobile Drawer Overlay */
          .mobile-eq-drawer-overlay {
            display: flex;
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 1000;
            align-items: flex-end;
            justify-content: center;
          }

          .mobile-eq-drawer-content {
            width: 100%;
            max-height: 82vh;
            background-color: #ffffff;
            border-top-left-radius: 18px;
            border-top-right-radius: 18px;
            display: flex;
            flex-direction: column;
            padding: 16px;
            gap: 12px;
            box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.2);
            animation: drawerSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes drawerSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        }
      `}</style>

      {/* Top Page Header */}
      <div className="op-logs-header">
        <div>
          <h1 className="page-title op-logs-header-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Sổ Vận Hành & Nhật Ký Giám Sát Thiết Bị
          </h1>
          <p className="page-subtitle op-logs-header-subtitle" style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
            Quản lý và tra cứu bảng nhật ký thông số vận hành theo từng phiên ghi nhận / ca làm việc.
          </p>
        </div>

        <div className="op-logs-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

      {/* Mobile Equipment Selector Bar (Visible only on mobile <= 768px) */}
      <div className="mobile-eq-bar">
        <div className="mobile-eq-current">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="mobile-eq-code">{selectedEquipment?.code || 'Chưa chọn'}</span>
          </div>
          <div className="mobile-eq-name">{selectedEquipment?.name || 'Vui lòng chọn thiết bị'}</div>
          {selectedEquipment?.location && (
            <div className="mobile-eq-loc"><MapPin size={11} /> {selectedEquipment.location}</div>
          )}
        </div>
        <button
          type="button"
          className="mobile-switch-eq-btn"
          onClick={() => setShowMobileEqDrawer(true)}
        >
          <Sliders size={13} />
          <span>Đổi máy ({filteredEquipment.length})</span>
        </button>
      </div>

      {/* Main Workspace: Left Collapsible Sidebar (Desktop) + Right Full-Width Logbook */}
      <div className="op-logs-workspace">
        {/* Left: Collapsible Equipment List Panel (Desktop only) */}
        {!isSidebarCollapsed && (
          <div className="op-logs-sidebar">
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

        {/* Collapsed State Toggle Bar (Desktop only) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            className="op-logs-sidebar-toggle"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Mở rộng danh sách chọn thiết bị"
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
        <div className="op-logs-detail-pane">
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

      {/* Mobile Equipment Bottom Sheet Drawer (Only visible when toggled on mobile) */}
      {showMobileEqDrawer && (
        <div className="mobile-eq-drawer-overlay" onClick={() => setShowMobileEqDrawer(false)}>
          <div className="mobile-eq-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                Chọn thiết bị ({filteredEquipment.length})
              </div>
              <button
                onClick={() => setShowMobileEqDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search and Location Filter inside Mobile Drawer */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã hoặc tên máy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '36px', fontSize: '13px' }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <select
              className="form-input"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ height: '36px', fontSize: '12.5px', padding: '4px 8px' }}
            >
              <option value="ALL">Tất cả phân xưởng</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>

            {/* Scrollable list of equipment cards */}
            <div style={{ overflowY: 'auto', maxHeight: '52vh', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {filteredEquipment.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Không tìm thấy thiết bị phù hợp.
                </div>
              ) : (
                filteredEquipment.map((eq) => {
                  const isSelected = selectedEqId === eq.id;
                  return (
                    <div
                      key={eq.id}
                      onClick={() => {
                        setSelectedEqId(eq.id);
                        setShowMobileEqDrawer(false);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '12.5px', color: isSelected ? '#2563eb' : '#0f172a' }}>
                          {eq.code}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.category}</span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                        {eq.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {eq.location}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

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
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Quét mã QR thiết bị</h3>
              <button
                onClick={() => setShowScanner(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div id="reader" style={{ width: '100%' }}></div>
            <p style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--text-muted)', marginTop: 14 }}>
              Hướng camera vào tem QR dán trên máy để tự động mở form nhập ca.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationLogsPage;
