import React from 'react';
import { Printer, X, Building2, Calendar, FileText, User } from 'lucide-react';
import { Modal } from '../../common/Modal';

interface ReceiptDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: any | null;
  loading: boolean;
}

export const ReceiptDetailModal: React.FC<ReceiptDetailModalProps> = ({
  isOpen,
  onClose,
  receipt,
  loading,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={receipt ? `Chi tiết phiếu nhập: ${receipt.receiptCode}` : 'Chi tiết phiếu nhập kho'}
      maxWidth="800px"
    >
      {loading || !receipt ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Đang tải thông tin phiếu nhập...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: '12px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', marginBottom: '2px' }}>
                <Building2 size={13} /> Nhà cung cấp:
              </span>
              <strong style={{ color: '#1e293b', fontSize: '14px' }}>
                {receipt.supplierName || 'Mua lẻ / Nhập nội bộ'}
              </strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', marginBottom: '2px' }}>
                <FileText size={13} /> Hóa đơn chứng từ:
              </span>
              <strong>{receipt.invoiceNumber || '---'}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', marginBottom: '2px' }}>
                <Calendar size={13} /> Ngày nhập kho:
              </span>
              <strong>
                {receipt.receivedDate ? new Date(receipt.receivedDate).toLocaleDateString('vi-VN') : '---'}
              </strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', marginBottom: '2px' }}>
                <User size={13} /> Người lập phiếu:
              </span>
              <strong>{receipt.createdBy?.name || 'Thủ kho'}</strong>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b', fontSize: '11.5px', marginBottom: '2px', display: 'block' }}>
                Ghi chú:
              </span>
              <span>{receipt.notes || 'Không có ghi chú thêm.'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="custom-table" style={{ margin: 0, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '110px' }}>Mã VT</th>
                  <th style={{ minWidth: '200px' }}>Tên phụ tùng</th>
                  <th style={{ width: '65px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Số lượng</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá (đ)</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền (đ)</th>
                  <th style={{ width: '120px' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.items || []).map((it: any, idx: number) => (
                  <tr key={it.id || idx}>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {it.inventoryItem?.itemCode || '---'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.inventoryItem?.name || '---'}</div>
                      {it.inventoryItem?.location && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Vị trí: {it.inventoryItem.location}</div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.inventoryItem?.unit || '---'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                      +{it.quantity}
                    </td>
                    <td style={{ textAlign: 'right' }}>{(it.unitPrice || 0).toLocaleString('vi-VN')} đ</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                      {(it.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{it.notes || '---'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800 }}>
                  <td colSpan={6} style={{ textAlign: 'right' }}>Tổng cộng tiền hàng:</td>
                  <td style={{ textAlign: 'right', color: '#0f766e', fontSize: '14px' }}>
                    {(receipt.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} /> In phiếu nhập (A4)
            </button>

            <button type="button" className="btn btn-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
