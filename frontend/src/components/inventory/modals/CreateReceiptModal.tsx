import React, { useState } from 'react';
import { Plus, Trash2, Calendar, FileText, Building2, Hash } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { ReceiptItemInput } from '../../../hooks/useInventoryReceipts';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    receiptCode?: string;
    supplierName: string;
    invoiceNumber?: string;
    receivedDate?: string;
    notes?: string;
    items: ReceiptItemInput[];
  }) => Promise<boolean>;
  submitting: boolean;
  catalogItems: any[];
}

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  catalogItems,
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ReceiptItemInput[]>([
    {
      inventoryItemId: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      notes: '',
    },
  ]);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        inventoryItemId: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemInput, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const cur = { ...next[index], [field]: value };

      if (field === 'inventoryItemId') {
        const found = catalogItems.find((c) => c.id === value);
        if (found) {
          cur.itemCode = found.itemCode;
          cur.name = found.name;
          cur.unit = found.unit;
          cur.currentStock = found.quantity;
          if (!cur.unitPrice || cur.unitPrice === 0) {
            cur.unitPrice = found.unitPrice || 0;
          }
        }
      }

      if (field === 'quantity' || field === 'unitPrice' || field === 'inventoryItemId') {
        const qty = field === 'quantity' ? Number(value) || 0 : cur.quantity;
        const price = field === 'unitPrice' ? Number(value) || 0 : cur.unitPrice;
        cur.totalPrice = qty * price;
      }

      next[index] = cur;
      return next;
    });
  };

  const totalReceiptAmount = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.inventoryItemId && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 vật tư và nhập số lượng lớn hơn 0');
      return;
    }

    const success = await onSubmit({
      supplierName,
      invoiceNumber,
      receivedDate,
      notes,
      items: validItems,
    });

    if (success) {
      setSupplierName('');
      setInvoiceNumber('');
      setNotes('');
      setItems([{ inventoryItemId: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo phiếu nhập kho phụ tùng / vật tư mới"
      maxWidth="900px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header Form Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Building2 size={14} /> Nhà cung cấp / Nguồn nhập *
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Cty TNHH Thiết Bị Công Nghiệp Á Châu"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Hash size={14} /> Số hóa đơn / Phiếu giao hàng
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: HD-003948"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} /> Ngày nhập kho *
            </label>
            <input
              type="date"
              className="form-input"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Dynamic Item Rows */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: '13.5px' }}>
              Danh sách mặt hàng nhập kho ({items.length} mặt hàng)
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddItemRow}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Thêm mặt hàng
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="custom-table" style={{ margin: 0, fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '220px' }}>Vật tư / Phụ tùng *</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>ĐVT</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Số lượng *</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá (đ) *</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền (đ)</th>
                  <th style={{ width: '130px' }}>Ghi chú</th>
                  <th style={{ width: '45px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                    <td>
                      <select
                        className="form-select"
                        required
                        value={row.inventoryItemId}
                        onChange={(e) => handleItemChange(idx, 'inventoryItemId', e.target.value)}
                        style={{ height: '34px', fontSize: '12.5px' }}
                      >
                        <option value="">-- Chọn phụ tùng --</option>
                        {catalogItems.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.itemCode}] {c.name} (Tồn: {c.quantity} {c.unit})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center', color: '#64748b' }}>{row.unit || '---'}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        required
                        style={{ height: '34px', textAlign: 'center', fontSize: '12.5px' }}
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        className="form-input"
                        required
                        style={{ height: '34px', textAlign: 'right', fontSize: '12.5px' }}
                        value={row.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                      {(row.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Số lô / Hạn dùng..."
                        style={{ height: '34px', fontSize: '12px' }}
                        value={row.notes || ''}
                        onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        style={{ color: items.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: items.length <= 1 ? 'not-allowed' : 'pointer' }}
                        title="Xóa dòng này"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: 'right' }}>Tổng cộng tiền hàng:</td>
                  <td style={{ textAlign: 'right', color: '#0f766e', fontSize: '13.5px' }}>
                    {totalReceiptAmount.toLocaleString('vi-VN')} đ
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={14} /> Ghi chú bổ sung
          </label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Ghi chú thêm về điều kiện giao hàng, quy cách đóng gói hoặc kiểm tra chất lượng..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy bỏ
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang lưu phiếu...' : 'Lưu & Nhập kho'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
