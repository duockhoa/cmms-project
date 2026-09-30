import React from 'react';
import type { EquipmentParameterAssignmentModel } from '../../../hooks/useEquipmentParameterAssignment';
import { MapPin, Search } from 'lucide-react';

interface EquipmentSelectorPanelProps {
  model: EquipmentParameterAssignmentModel;
  confirm: (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'warning' | 'info' | 'danger';
    },
  ) => Promise<boolean>;
}

export const EquipmentSelectorPanel: React.FC<EquipmentSelectorPanelProps> = ({ model, confirm }) => {
  const {
    eqSearch, filteredEquipment, hasChanges, locations, selectedEqId, selectedLocation,
    setEqSearch, setSelectedEqId, setSelectedLocation,
  } = model;

  return (
    <>
{/* Left: Equipment Selector */}
<div
  style={{
    width: '320px',
    flexShrink: 0,
    backgroundColor: 'var(--bg-primary, #f8fafc)',
    border: '1px solid var(--border-color, #e2e8f0)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '740px',
  }}
>
  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
    Chọn thiết bị ({filteredEquipment.length})
  </div>

  <div style={{ position: 'relative' }}>
    <input
      type="text"
      className="form-input"
      placeholder="Tìm mã hoặc tên máy..."
      value={eqSearch}
      onChange={(e) => setEqSearch(e.target.value)}
      style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
    />
    <Search
      size={14}
      style={{
        position: 'absolute',
        left: '10px',
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
    style={{ height: '34px', fontSize: '12px' }}
  >
    <option value="ALL">Tất cả phân xưởng</option>
    {locations.map((loc) => (
      <option key={loc.id} value={loc.name}>
        {loc.name}
      </option>
    ))}
  </select>

  <div
    style={{
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      paddingRight: '2px',
      maxHeight: '560px',
    }}
  >
    {filteredEquipment.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
        Không tìm thấy thiết bị.
      </div>
    ) : (
      filteredEquipment.map((eq) => {
        const isSelected = eq.id === selectedEqId;
        return (
          <div
            key={eq.id}
            onClick={async () => {
              if (hasChanges) {
                const ok = await confirm(
                  'Chưa lưu thay đổi',
                  'Bạn có thay đổi chưa lưu trên máy hiện tại. Bạn có chắc chắn muốn chuyển sang máy khác không?',
                  { confirmText: 'Chuyển máy', cancelText: 'Ở lại', type: 'warning' }
                );
                if (!ok) {
                  return;
                }
              }
              setSelectedEqId(eq.id);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              border: isSelected
                ? '1.5px solid var(--accent-blue, #2563eb)'
                : '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: isSelected ? '#ffffff' : 'var(--bg-secondary, #ffffff)',
              boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: isSelected ? '#2563eb' : 'var(--text-primary)' }}>
                {eq.code}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.category}</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {eq.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} /> {eq.location}
            </div>
          </div>
        );
      })
    )}
  </div>
</div>

    </>
  );
};
