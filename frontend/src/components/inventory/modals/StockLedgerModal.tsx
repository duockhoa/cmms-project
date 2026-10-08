import React from 'react';
import { Modal } from '../../common/Modal';

interface StockLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  transactions: any[];
  loading: boolean;
}

export const StockLedgerModal: React.FC<StockLedgerModalProps> = ({
  isOpen,
  onClose,
  item,
  transactions,
  loading,
}) => {
  if (!isOpen || !item) return null;

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'IMPORT_PURCHASE':
        return { label: 'Nhập mua hàng', bg: '#dcfce7', color: '#166534', isAdd: true };
      case 'ISSUE_WORK_ORDER':
      case 'ISSUE':
        return { label: 'Xuất bảo trì (WO)', bg: '#fee2e2', color: '#991b1b', isAdd: false };
      case 'ISSUE_FABRICATION':
        return { label: 'Xuất gia công (GC)', bg: '#ffedd5', color: '#9a3412', isAdd: false };
      case 'ISSUE_INTERNAL':
        return { label: 'Xuất trực tiếp/nội bộ', bg: '#fef3c7', color: '#92400e', isAdd: false };
      case 'ADJUST_IN':
        return { label: 'Điều chỉnh tăng', bg: '#e0f2fe', color: '#075985', isAdd: true };
      case 'ADJUST_OUT':
        return { label: 'Điều chỉnh giảm', bg: '#f1f5f9', color: '#475569', isAdd: false };
      case 'RETURN':
      case 'RETURN_WORK_ORDER':
        return { label: 'Hoàn trả kho', bg: '#f3e8ff', color: '#6b21a8', isAdd: true };
      default:
        return { label: type, bg: '#f1f5f9', color: '#475569', isAdd: false };
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thẻ kho chi tiết: [${item.itemCode}] ${item.name}`}
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Info Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '12.5px',
          }}
        >
          <div>
            <span style={{ color: '#64748b' }}>Đơn vị tính: </span>
            <strong>{item.unit}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Vị trí lưu kho: </span>
            <strong>{item.location || 'Kho chung'}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Đơn giá kho: </span>
            <strong>{(item.unitPrice || 0).toLocaleString('vi-VN')} đ</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Tồn hiện tại: </span>
            <strong style={{ color: '#2563eb' }}>{item.closingQuantity ?? item.quantity} {item.unit}</strong>
          </div>
        </div>

        {/* Ledger Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="custom-table" style={{ margin: 0, fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ width: '120px' }}>Thời gian</th>
                <th style={{ width: '130px' }}>Nghiệp vụ</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Biến động</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Tồn sau</th>
                <th style={{ minWidth: '180px' }}>Chứng từ / Diễn giải</th>
                <th style={{ width: '120px' }}>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                    Đang tải dữ liệu thẻ kho...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
                    Chưa có lịch sử giao dịch nào được ghi nhận cho mặt hàng này.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const badge = getTxTypeBadge(tx.transactionType);
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: '#64748b' }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '---'}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          fontWeight: 700,
                          color: badge.isAdd ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {badge.isAdd ? `+${tx.quantity}` : `-${tx.quantity}`}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {tx.quantityAfter} {item.unit}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {tx.reference || tx.referenceCode || '---'}
                        </div>
                        {tx.reason && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Lý do: {tx.reason}
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {tx.actedBy?.name || 'Hệ thống'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
