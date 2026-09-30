import React from 'react';
import { X, Plus } from 'lucide-react';

interface EquipmentSpecModalProps {
  show: boolean;
  onClose: () => void;
  tempSpecs: { key: string; val: string }[];
  setTempSpecs: React.Dispatch<React.SetStateAction<{ key: string; val: string }[]>>;
  onSubmit: (e: React.FormEvent) => void;
}

export const EquipmentSpecModal: React.FC<EquipmentSpecModalProps> = ({
  show,
  onClose,
  tempSpecs,
  setTempSpecs,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.4)', 
      backdropFilter: 'blur(8px)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      zIndex: 1000 
    }}>
      <div className="card" style={{ 
        width: '540px', 
        padding: '28px', 
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column', gap: '20px',
        backgroundColor: '#ffffff',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Thiết lập thông số kỹ thuật</h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '6px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tempSpecs.map((spec, index) => (
              <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Tên thông số (ví dụ: Điện áp)" 
                  value={spec.key} 
                  onChange={e => {
                    const updated = [...tempSpecs];
                    updated[index].key = e.target.value;
                    setTempSpecs(updated);
                  }} 
                  required 
                  style={{ flex: 1, borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Giá trị (ví dụ: 380V)" 
                  value={spec.val} 
                  onChange={e => {
                    const updated = [...tempSpecs];
                    updated[index].val = e.target.value;
                    setTempSpecs(updated);
                  }} 
                  required 
                  style={{ flex: 1, borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', 
                    padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' 
                  }}
                  onClick={() => {
                    setTempSpecs(tempSpecs.filter((_, i) => i !== index));
                  }}
                  title="Xóa dòng"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            style={{ alignSelf: 'flex-start', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setTempSpecs([...tempSpecs, { key: '', val: '' }])}
          >
            <Plus size={14} /> Thêm dòng mới
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onClose}
              style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              className="btn btn-primary btn-sm"
              style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
            >
              Lưu tất cả
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
