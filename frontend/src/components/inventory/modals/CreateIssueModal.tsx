import React, { useState, useMemo } from 'react';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { SearchableSelect } from '../../common/SearchableSelect';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    inventoryItemId: string;
    quantity: number;
    reason: string;
    referenceCode?: string;
  }) => Promise<boolean>;
  submitting: boolean;
  inventoryList: any[];
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  inventoryList,
}) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [referenceCode, setReferenceCode] = useState('');

  const inventoryOptions = useMemo(() => {
    return inventoryList.map((it) => ({
      value: it.id,
      label: `[${it.itemCode}] ${it.name}`,
      subLabel: `Tồn kho: ${it.quantity} ${it.unit} • Vị trí: ${it.location || 'Kho chung'}`,
      tag: `Tồn: ${it.quantity} ${it.unit}`,
      tagColor: it.quantity === 0 ? '#fee2e2' : it.quantity <= (it.minQuantity || 1) ? '#fef3c7' : '#dcfce7',
      disabled: it.quantity <= 0,
    }));
  }, [inventoryList]);

  const selectedItem = inventoryList.find((i) => i.id === selectedItemId);
  const currentStock = selectedItem ? selectedItem.quantity : 0;
  const isOutOfStock = selectedItem && quantity > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert('Vui lòng chọn vật tư cần xuất kho');
      return;
    }
    if (quantity <= 0) {
      alert('Số lượng xuất phải lớn hơn 0');
      return;
    }
    if (quantity > currentStock) {
      alert(`Số lượng xuất (${quantity}) vượt quá tồn kho hiện tại (${currentStock})!`);
      return;
    }
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do xuất kho');
      return;
    }

    const success = await onSubmit({
      inventoryItemId: selectedItemId,
      quantity,
      reason: reason.trim(),
      referenceCode: referenceCode.trim() || undefined,
    });

    if (success) {
      setSelectedItemId('');
      setQuantity(1);
      setReason('');
      setReferenceCode('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phiếu xuất kho trực tiếp / Xuất dùng nội bộ"
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Vật tư / Phụ tùng cần xuất *</label>
          <SearchableSelect
            options={inventoryOptions}
            value={selectedItemId}
            onChange={(val) => setSelectedItemId(val)}
            placeholder="🔍 Nhập mã vật tư hoặc tên để tìm kiếm..."
            searchPlaceholder="Gõ mã VT, tên phụ tùng..."
            required
          />
          {selectedItem && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: isOutOfStock ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${isOutOfStock ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '6px',
                fontSize: '12.5px',
                color: isOutOfStock ? '#dc2626' : '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                {isOutOfStock && <AlertTriangle size={15} />}
                <span>
                  Tồn khả dụng: <strong>{currentStock} {selectedItem.unit}</strong> | Vị trí: <strong>{selectedItem.location || 'Kho chung'}</strong>
                </span>
              </div>
              <div style={{ color: '#0f766e', fontWeight: 700 }}>
                Đơn giá: {(selectedItem.unitPrice || 0).toLocaleString('vi-VN')} đ
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Số lượng xuất *</label>
            <input
              type="number"
              min="1"
              max={selectedItem ? currentStock : 9999}
              className="form-input"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Mã phiếu / Lệnh yêu cầu</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: XK-20261008-01 hoặc Mã lệnh xưởng"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Lý do / Mục đích xuất dùng *</label>
          <textarea
            className="form-input"
            rows={3}
            required
            placeholder="VD: Thay thế khẩn cấp dây curoa máy đóng gói ca 1, phục vụ vệ sinh đường ống phân xưởng A..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {selectedItem && (
          <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
            <span style={{ color: '#64748b' }}>Ước tính giá trị xuất: </span>
            <strong style={{ color: '#dc2626', fontSize: '14px' }}>
              {((selectedItem.unitPrice || 0) * quantity).toLocaleString('vi-VN')} đ
            </strong>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || isOutOfStock || !selectedItemId}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            {submitting ? 'Đang xuất kho...' : 'Xác nhận xuất kho'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
