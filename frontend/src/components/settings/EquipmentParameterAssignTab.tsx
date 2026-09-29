import React from 'react';
import { useEquipmentParameterAssignment } from '../../hooks/useEquipmentParameterAssignment';
import { BookOpen, Gauge, RefreshCw, Save, Sliders } from 'lucide-react';
import { useConfirmDialog } from '../common/Toast';
import { EquipmentSelectorPanel } from './equipment-parameters/EquipmentSelectorPanel';
import { OperatingParamsMatrix } from './equipment-parameters/OperatingParamsMatrix';
import { TechnicalSpecsMatrix } from './equipment-parameters/TechnicalSpecsMatrix';

export const EquipmentParameterAssignTab: React.FC = () => {
  const assignment = useEquipmentParameterAssignment();
  const { confirm } = useConfirmDialog();
  const {
    activeSubTab, handleSaveAll, hasChanges, loadInitial, loading, opParamRows, saving,
    selectedEquipment, selectedOpCount, selectedTechCount, setActiveSubTab, techSpecRows,
  } = assignment;

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Thiết lập Thông số Kỹ thuật & Tham số Vận hành theo máy
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Tích chọn trực tiếp để gắn thông số vào máy, bỏ tích để hủy liên kết. Nhập giá trị trực tiếp ngay trên bảng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadInitial}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          {selectedEquipment && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                fontSize: '13.5px',
                boxShadow: hasChanges ? '0 0 0 3px rgba(37, 99, 235, 0.25)' : 'none',
              }}
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Lưu thiết lập máy
            </button>
          )}
        </div>
      </div>

      {/* Main Split View: Left Equipment List + Right Interactive Matrix */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <EquipmentSelectorPanel model={assignment} confirm={confirm} />

        {/* Right: Interactive Matrix for Selected Equipment */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedEquipment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Banner Info */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  backgroundColor: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {selectedEquipment.code}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedEquipment.name}
                    </h4>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Xưởng: <strong>{selectedEquipment.location}</strong> &bull; Phân loại: <strong>{selectedEquipment.category}</strong>
                  </div>
                </div>
              </div>

              {/* 2 Main Sub-Tabs */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color, #e2e8f0)', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('TECHNICAL_SPECS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: activeSubTab === 'TECHNICAL_SPECS' ? 'var(--accent-blue, #2563eb)' : 'var(--text-secondary, #64748b)',
                    borderBottom: activeSubTab === 'TECHNICAL_SPECS' ? '2px solid var(--accent-blue, #2563eb)' : '2px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BookOpen size={16} />
                  1. Thông số Kỹ thuật (Hồ sơ NSX)
                  <span
                    style={{
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'TECHNICAL_SPECS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'TECHNICAL_SPECS' ? '#2563eb' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Đã tích {selectedTechCount} / {techSpecRows.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('OPERATING_PARAMS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: activeSubTab === 'OPERATING_PARAMS' ? 'var(--accent-blue, #2563eb)' : 'var(--text-secondary, #64748b)',
                    borderBottom: activeSubTab === 'OPERATING_PARAMS' ? '2px solid var(--accent-blue, #2563eb)' : '2px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Gauge size={16} />
                  2. Tham số Vận hành (Sổ vận hành / Quét QR)
                  <span
                    style={{
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'OPERATING_PARAMS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'OPERATING_PARAMS' ? '#2563eb' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Đã tích {selectedOpCount} / {opParamRows.length}
                  </span>
                </button>
              </div>

              {/* Unsaved Changes Alert */}
              {hasChanges && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '12.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>⚠️ Có thay đổi chưa lưu! Bấm <strong>"Lưu thiết lập máy"</strong> để lưu lại các thông số đã tích/bỏ tích.</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAll}
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={13} /> Lưu ngay
                  </button>
                </div>
              )}

              <TechnicalSpecsMatrix model={assignment} />

              <OperatingParamsMatrix model={assignment} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Vui lòng chọn một thiết bị ở danh sách bên trái.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
