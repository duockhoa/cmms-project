import React from 'react';
import { 
  Camera, X, Search, ChevronLeft, ChevronRight, 
  MapPin, RefreshCw
} from 'lucide-react';
import { EquipmentOperationDetailView } from '../components/common/OperationLogDetailView';
import { PageHeader } from '../components/common';
import { useOperationLogsPage } from '../hooks/useOperationLogsPage';
import './operationLogs.css';

export const OperationLogsPage: React.FC = () => {
  const {
    locations,
    loading,
    filteredEquipment,
    selectedEqId,
    setSelectedEqId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    search,
    setSearch,
    selectedLocation,
    setSelectedLocation,
    showScanner,
    setShowScanner,
    fetchData,
  } = useOperationLogsPage();

  return (
    <div className="op-logs-container">
      {/* Top Page Header */}
      <PageHeader
        title="Sổ Vận Hành & Nhật Ký Giám Sát Thiết Bị"
        subtitle="Quản lý và tra cứu bảng nhật ký thông số vận hành theo từng phiên ghi nhận / ca làm việc."
        actions={(
          <>
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
          </>
        )}
      />

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
