import React from 'react';
import { CheckCheck, RefreshCw, Search, XSquare } from 'lucide-react';

interface TechnicalSpecsMatrixProps {
  model: Record<string, any>;
}

export const TechnicalSpecsMatrix: React.FC<TechnicalSpecsMatrixProps> = ({ model }) => {
  const {
    activeSubTab, dataLoading, filteredTechRows, handleSelectAllTech,
    handleTechSpecValueChange, handleToggleTechSpec, selectedTechCount,
    setTechFilterStatus, setTechSearch, techFilterStatus, techSearch, techSpecRows,
  } = model;

  return (
    <>
{/* ===================== TAB 1: TECHNICAL SPECS DIRECT MATRIX ===================== */}
{activeSubTab === 'TECHNICAL_SPECS' && (
  <div>
    {/* Toolbar inside Tab 1 */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm thông số KT..."
            value={techSearch}
            onChange={(e) => setTechSearch(e.target.value)}
            style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Quick Filters */}
        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <button
            type="button"
            onClick={() => setTechFilterStatus('ALL')}
            style={{
              padding: '6px 12px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: techFilterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: techFilterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Tất cả ({techSpecRows.length})
          </button>
          <button
            type="button"
            onClick={() => setTechFilterStatus('SELECTED')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderLeft: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: techFilterStatus === 'SELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: techFilterStatus === 'SELECTED' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Đã chọn ({selectedTechCount})
          </button>
          <button
            type="button"
            onClick={() => setTechFilterStatus('UNSELECTED')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderLeft: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: techFilterStatus === 'UNSELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: techFilterStatus === 'UNSELECTED' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Chưa chọn ({techSpecRows.length - selectedTechCount})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => handleSelectAllTech(true)}
          style={{ fontSize: '12px' }}
        >
          <CheckCheck size={13} /> Chọn tất cả
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => handleSelectAllTech(false)}
          style={{ fontSize: '12px' }}
        >
          <XSquare size={13} /> Bỏ chọn tất cả
        </button>
      </div>
    </div>

    {/* Direct Table */}
    {dataLoading ? (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
        Đang tải danh mục thông số kỹ thuật...
      </div>
    ) : (
      <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table className="custom-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>Áp dụng</th>
              <th style={{ minWidth: '180px' }}>Tên thông số kỹ thuật (NSX)</th>
              <th style={{ minWidth: '180px' }}>Giá trị danh định (Catalogue NSX)</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Đơn vị</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Phân nhóm</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {filteredTechRows.map(({ row, fullIdx }) => (
              <tr
                key={row.standardId}
                style={{
                  backgroundColor: row.isSelected ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
                  opacity: row.isSelected ? 1 : 0.65,
                  transition: 'all 0.15s ease',
                }}
              >
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={row.isSelected}
                    onChange={() => handleToggleTechSpec(fullIdx)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div
                    onClick={() => handleToggleTechSpec(fullIdx)}
                    style={{
                      fontWeight: row.isSelected ? 700 : 500,
                      color: row.isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {row.name}
                  </div>
                  {row.description && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {row.description}
                    </div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={row.isSelected ? 'Nhập giá trị theo máy...' : 'Tích để nhập'}
                    disabled={!row.isSelected}
                    value={row.value}
                    onChange={(e) => handleTechSpecValueChange(fullIdx, 'value', e.target.value)}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      fontWeight: row.isSelected ? 600 : 400,
                      backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                    }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.unit ? (
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                      {row.unit}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.category ? (
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontSize: '11px', fontWeight: 600 }}>
                      {row.category}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ghi chú..."
                    disabled={!row.isSelected}
                    value={row.notes}
                    onChange={(e) => handleTechSpecValueChange(fullIdx, 'notes', e.target.value)}
                    style={{
                      height: '32px',
                      fontSize: '12px',
                      backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

    </>
  );
};
