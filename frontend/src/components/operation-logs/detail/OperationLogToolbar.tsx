import React from 'react';
import { Clock, LayoutGrid, List, RefreshCw, Search } from 'lucide-react';

export const OperationLogToolbar: React.FC<any> = ({
  fetchData, filterSearch, filterStatus, groupedSessions, loading, parameters,
  selectedParamFilter, setFilterSearch, setFilterStatus, setSelectedParamFilter,
  setViewMode, viewMode,
}) => (
  <>
        {/* Logbook Matrix Table Toolbar */}
        <div className="op-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nhật ký Sổ vận hành ({groupedSessions.length} phiên ghi)
            </span>
          </div>

          <div className="op-toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="op-toolbar-search" style={{ position: 'relative', width: '160px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm ngày, KTV..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '30px', fontSize: '11.5px' }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Isolate single parameter filter (for multi-parameter devices) */}
            {parameters.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <select
                  className="form-input"
                  value={selectedParamFilter}
                  onChange={(e) => setSelectedParamFilter(e.target.value)}
                  style={{
                    height: '30px',
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    maxWidth: '175px',
                    backgroundColor: selectedParamFilter !== 'ALL' ? '#eff6ff' : '#ffffff',
                    borderColor: selectedParamFilter !== 'ALL' ? '#93c5fd' : 'var(--border-color, #e2e8f0)',
                    color: selectedParamFilter !== 'ALL' ? '#1e40af' : 'inherit',
                    fontWeight: selectedParamFilter !== 'ALL' ? 700 : 'normal',
                  }}
                  title="Lọc xem riêng một thông số hoặc xem tất cả"
                >
                  <option value="ALL">📊 Tất cả ({parameters.length} thông số)</option>
                  {parameters.map((p) => (
                    <option key={p.id} value={p.id}>
                      🔍 {p.name} {p.unit ? `(${p.unit})` : ''}
                    </option>
                  ))}
                </select>
                {selectedParamFilter !== 'ALL' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedParamFilter('ALL')}
                    title="Bỏ lọc, hiện tất cả thông số"
                    style={{ padding: '4px 6px', fontSize: '11px', height: '30px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Quick Status Filter Tabs */}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                  color: filterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                Tất cả ({groupedSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('NORMAL')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'NORMAL' ? '#16a34a' : '#ffffff',
                  color: filterStatus === 'NORMAL' ? '#ffffff' : '#16a34a',
                }}
              >
                ✅ Đạt ({groupedSessions.filter(s => !s.isVoided && s.outlierCount === 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('OUTLIER')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'OUTLIER' ? '#dc2626' : '#ffffff',
                  color: filterStatus === 'OUTLIER' ? '#ffffff' : '#dc2626',
                }}
              >
                ⚠️ Vượt ({groupedSessions.filter(s => !s.isVoided && s.outlierCount > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('VOIDED')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'VOIDED' ? '#e11d48' : '#ffffff',
                  color: filterStatus === 'VOIDED' ? '#ffffff' : '#e11d48',
                }}
              >
                🚫 Đã hủy ({groupedSessions.filter(s => s.isVoided).length})
              </button>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="op-view-toggle">
              <button
                type="button"
                className={viewMode === 'cards' ? 'active' : ''}
                onClick={() => setViewMode('cards')}
                title="Dạng thẻ (dễ đọc trên di động)"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
                title="Dạng bảng ma trận"
              >
                <List size={13} />
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
              style={{ padding: '4px 8px', fontSize: '11.5px' }}
              title="Làm mới"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
  </>
);
