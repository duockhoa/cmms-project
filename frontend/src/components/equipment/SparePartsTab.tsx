import React from 'react';

interface SparePartsTabProps {
  sparePartsList: any[];
  setShowPartModal: (show: boolean) => void;
}

export const SparePartsTab: React.FC<SparePartsTabProps> = ({ sparePartsList, setShowPartModal }) => {
  return (
    <div style={{ padding: '24px 0' }}>
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Danh sách phụ tùng liên kết</h3>
          <button 
            onClick={() => setShowPartModal(true)}
            className="btn btn-primary btn-sm"
          >
            + Liên kết phụ tùng
          </button>
        </div>
        <div className="table-wrapper">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Tên phụ tùng</th>
                <th>Mã phụ tùng</th>
                <th>Tồn kho</th>
                <th>Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              {sparePartsList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>
                    Không có phụ tùng liên kết với thiết bị này
                  </td>
                </tr>
              ) : sparePartsList.map((part: any, idx: number) => (
                <tr key={part.id || idx}>
                  <td style={{ fontWeight: 600 }}>{part.name}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{part.itemCode || '---'}</td>
                  <td>{part.quantity}</td>
                  <td style={{ fontWeight: 600 }}>{part.unitPrice ? part.unitPrice.toLocaleString('vi-VN') + ' ₫' : '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
