import React from 'react';
import { RotateCcw } from 'lucide-react';
import { EmptyState } from '../common';
import { Modal } from '../common/Modal';

interface MaterialRequestModalProps {
  workOrder: any | null;
  transactions: any[];
  loading: boolean;
  onClose: () => void;
  onReturn: (item: any) => void;
}

export const MaterialRequestModal: React.FC<MaterialRequestModalProps> = ({
  workOrder,
  transactions,
  loading,
  onClose,
  onReturn,
}) => (
  <Modal isOpen={Boolean(workOrder)} onClose={onClose} title={`Quản lý vật tư: ${workOrder?.orderCode || ''}`}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Danh mục phụ tùng liên kết bảo trì:</h4>
      {loading ? (
        <div>Đang tải thông tin...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead><tr><th>Tên vật tư</th><th>Số lượng định mức</th><th>Đơn giá</th><th style={{ textAlign: 'center' }}>Thao tác</th></tr></thead>
            <tbody>
              {(workOrder?.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.inventoryItem?.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice ? `${item.unitPrice.toLocaleString('vi-VN')} ₫` : '---'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-warning btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px' }} onClick={() => onReturn(item)}>
                      <RotateCcw size={13} /> Trả vật tư
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Lịch sử Xuất / Trả vật tư:</h4>
      {transactions.length === 0 ? (
        <EmptyState compact minHeight={110} title="Chưa có giao dịch xuất/trả vật tư" />
      ) : (
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '12px' }}>
            <thead><tr><th>Thời gian</th><th>Loại</th><th>Vật tư</th><th>Số lượng</th><th>Lý do</th></tr></thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.createdAt).toLocaleString('vi-VN')}</td>
                  <td><span className={`badge ${transaction.transactionType === 'RETURN' ? 'badge-success' : 'badge-warning'}`}>{transaction.transactionType}</span></td>
                  <td>{transaction.inventoryItem?.name || transaction.inventoryItemId}</td>
                  <td style={{ fontWeight: 700 }}>{transaction.transactionType === 'RETURN' ? `+${transaction.quantity}` : `-${transaction.quantity}`}</td>
                  <td>{transaction.reason || transaction.reference || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Modal>
);

interface ReturnMaterialModalProps {
  target: any | null;
  quantity: number;
  reason: string;
  onQuantityChange: (quantity: number) => void;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const ReturnMaterialModal: React.FC<ReturnMaterialModalProps> = ({
  target,
  quantity,
  reason,
  onQuantityChange,
  onReasonChange,
  onClose,
  onSubmit,
}) => (
  <Modal isOpen={Boolean(target)} onClose={onClose} title={`Trả vật tư: ${target?.woItem?.inventoryItem?.name || ''}`}>
    <form onSubmit={onSubmit}>
      <p className="mb-4"><strong>Số lượng có thể trả tối đa:</strong> {target?.returnableQty}</p>
      <div className="form-group">
        <label className="form-label">Số lượng trả về kho *</label>
        <input
          type="number"
          min="1"
          max={target?.returnableQty}
          className="form-input"
          required
          value={quantity}
          onChange={(event) => onQuantityChange(Math.min(target?.returnableQty || 1, Math.max(1, Number(event.target.value))))}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Lý do trả vật tư *</label>
        <input type="text" className="form-input" required placeholder="Vật tư dư thừa sau khi sửa chữa..." value={reason} onChange={(event) => onReasonChange(event.target.value)} />
      </div>
      <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
        <button type="submit" className="btn btn-warning"><RotateCcw size={14} /> Xác nhận TRẢ VẬT TƯ</button>
      </div>
    </form>
  </Modal>
);
