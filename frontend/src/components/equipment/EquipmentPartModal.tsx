import React from 'react';
import { X } from 'lucide-react';

interface EquipmentPartModalProps {
  show: boolean;
  onClose: () => void;
  selectedPartId: string;
  setSelectedPartId: (id: string) => void;
  partMinQty: number;
  setPartMinQty: (qty: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EquipmentPartModal: React.FC<EquipmentPartModalProps> = ({
  show,
  onClose,
  selectedPartId,
  setSelectedPartId,
  partMinQty,
  setPartMinQty,
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
        width: '420px', 
        padding: '28px', 
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column', gap: '20px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Liên kết phụ tùng</h3>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Chọn phụ tùng</label>
            <select 
              className="form-select" 
              value={selectedPartId} 
              onChange={e => setSelectedPartId(e.target.value)} 
              required
              style={{ borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '13px', width: '100%' }}
            >
              <option value="">-- Chọn phụ tùng từ kho --</option>
              <option value="part-1">Vòng bi SKF 6204</option>
              <option value="part-2">Dây curoa đai răng</option>
              <option value="part-3">Dầu bôi trơn Roto-Inject</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Định mức tối thiểu</label>
            <input 
              type="number" 
              className="form-control" 
              value={partMinQty} 
              onChange={e => setPartMinQty(parseInt(e.target.value, 10))} 
              min={1} 
              required 
              style={{ borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
