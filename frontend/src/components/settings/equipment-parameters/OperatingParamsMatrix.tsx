import React from 'react';
import { CheckCheck, RefreshCw, Search, XSquare } from 'lucide-react';

interface OperatingParamsMatrixProps {
  model: Record<string, any>;
}

export const OperatingParamsMatrix: React.FC<OperatingParamsMatrixProps> = ({ model }) => {
  const {
    activeSubTab, dataLoading, filteredOpRows, handleOpParamValueChange,
    handleSelectAllOp, handleToggleOpParam, opFilterStatus, opParamRows, opSearch,
    selectedOpCount, setOpFilterStatus, setOpSearch,
  } = model;

  return (
    <>
{/* ===================== TAB 2: OPERATING PARAMS DIRECT MATRIX ===================== */}
{activeSubTab === 'OPERATING_PARAMS' && (
  <div>
    {/* Toolbar inside Tab 2 */}
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
            placeholder="Tìm tham số vận hành..."
            value={opSearch}
            onChange={(e) => setOpSearch(e.target.value)}
            style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Quick Filters */}
        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <button
            type="button"
            onClick={() => setOpFilterStatus('ALL')}
            style={{
              padding: '6px 12px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: opFilterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: opFilterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Tất cả ({opParamRows.length})
          </button>
          <button
            type="button"
            onClick={() => setOpFilterStatus('SELECTED')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderLeft: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: opFilterStatus === 'SELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: opFilterStatus === 'SELECTED' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Đã chọn ({selectedOpCount})
          </button>
          <button
            type="button"
            onClick={() => setOpFilterStatus('UNSELECTED')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderLeft: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: opFilterStatus === 'UNSELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
              color: opFilterStatus === 'UNSELECTED' ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            Chưa chọn ({opParamRows.length - selectedOpCount})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => handleSelectAllOp(true)}
          style={{ fontSize: '12px' }}
        >
          <CheckCheck size={13} /> Chọn tất cả
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => handleSelectAllOp(false)}
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
        Đang tải danh mục tham số vận hành...
      </div>
    ) : (
      <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table className="custom-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>Theo dõi</th>
              <th style={{ minWidth: '180px' }}>Tên tham số vận hành</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Đơn vị</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Tiêu chuẩn Min</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Tiêu chuẩn Max</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Giá trị chuẩn</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpRows.map(({ row, fullIdx }) => (
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
                    onChange={() => handleToggleOpParam(fullIdx)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div
                    onClick={() => handleToggleOpParam(fullIdx)}
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
                <td style={{ textAlign: 'center' }}>
                  {row.unit ? (
                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                      {row.unit}
                    </span>
                  ) : '—'}
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Min..."
                    disabled={!row.isSelected}
                    value={row.minSpec}
                    onChange={(e) => handleOpParamValueChange(fullIdx, 'minSpec', e.target.value)}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Max..."
                    disabled={!row.isSelected}
                    value={row.maxSpec}
                    onChange={(e) => handleOpParamValueChange(fullIdx, 'maxSpec', e.target.value)}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Chuẩn..."
                    disabled={!row.isSelected}
                    value={row.standardValue}
                    onChange={(e) => handleOpParamValueChange(fullIdx, 'standardValue', e.target.value)}
                    style={{
                      height: '32px',
                      fontSize: '13px',
                      textAlign: 'center',
                      backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                    }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: row.isSelected ? '#dcfce7' : '#f1f5f9',
                      color: row.isSelected ? '#16a34a' : '#94a3b8',
                    }}
                  >
                    {row.isSelected ? 'Đang theo dõi' : 'Không dùng'}
                  </span>
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
