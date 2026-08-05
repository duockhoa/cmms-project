import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { Plus, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2, History, RefreshCw } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Adjust In / Out Modals
  const [adjustInModalItem, setAdjustInModalItem] = useState<any>(null);
  const [adjustOutModalItem, setAdjustOutModalItem] = useState<any>(null);

  const [adjustInForm, setAdjustInForm] = useState({ quantity: 1, reason: '', referenceCode: '' });
  const [adjustOutForm, setAdjustOutForm] = useState({ quantity: 1, reason: '', referenceCode: '' });

  // History Modal
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    category: 'Cơ khí',
    quantity: 10,
    unit: 'Cái',
    minQuantity: 5,
    unitPrice: 150000,
    location: 'Kệ A-01',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, userRes] = await Promise.all([
        api.getInventory({ search }),
        api.getUsers().catch(() => []),
      ]);
      setInventory(invRes);
      setUsers(userRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInventory(formData);
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      alert('Lỗi thêm vật tư kho!');
    }
  };

  const handleAdjustInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustInModalItem) return;
    try {
      await api.adjustIn(adjustInModalItem.id, {
        quantity: Number(adjustInForm.quantity),
        reason: adjustInForm.reason.trim(),
        referenceCode: adjustInForm.referenceCode.trim() || undefined,
        expectedVersion: adjustInModalItem.version,
        actedById: getActiveUserId(),
      });
      setAdjustInModalItem(null);
      alert('Đã điều chỉnh tăng tồn kho thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        alert('Dữ liệu tồn kho đã được người khác cập nhật! Vui lòng tải lại dữ liệu.');
        setAdjustInModalItem(null);
        loadData();
      } else {
        alert(`Lỗi điều chỉnh tăng: ${err.message || 'Không thể thực hiện'}`);
      }
    }
  };

  const handleAdjustOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustOutModalItem) return;
    try {
      await api.adjustOut(adjustOutModalItem.id, {
        quantity: Number(adjustOutForm.quantity),
        reason: adjustOutForm.reason.trim(),
        referenceCode: adjustOutForm.referenceCode.trim() || undefined,
        expectedVersion: adjustOutModalItem.version,
        actedById: getActiveUserId(),
      });
      setAdjustOutModalItem(null);
      alert('Đã điều chỉnh giảm tồn kho thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        alert('Dữ liệu tồn kho đã được người khác cập nhật! Vui lòng tải lại dữ liệu.');
        setAdjustOutModalItem(null);
        loadData();
      } else {
        alert(`Lỗi điều chỉnh giảm: ${err.message || 'Không thể thực hiện'}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa vật tư này khỏi hệ thống?')) {
      try {
        await api.deleteInventory(id);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Không thể xóa vật tư');
      }
    }
  };

  const openHistory = async (item: any) => {
    setHistoryItem(item);
    setTxLoading(true);
    try {
      const res = await api.getInventoryTransactions(item.id);
      setTxHistory(res.data || []);
    } catch (err) {
      console.error(err);
      setTxHistory([]);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Kho Vật tư & Phụ tùng Thay thế</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Quản lý định mức tồn kho phụ tùng bảo trì, điều chỉnh tồn kho và theo dõi lịch sử giao dịch.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Nhập thêm Vật tư mới
        </button>
      </div>

      <div className="card mb-4 flex-between">
        <input
          type="text"
          className="form-input"
          style={{ maxWidth: '300px' }}
          placeholder="Tìm theo mã vật tư, tên linh kiện..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Tổng danh mục: <strong>{inventory.length}</strong> vật tư
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh mục kho vật tư...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Vật tư</th>
                <th>Tên Vật tư / Linh kiện</th>
                <th>Phân loại</th>
                <th>Tồn kho hiện tại</th>
                <th>Đơn giá</th>
                <th>Vị trí lưu kho</th>
                <th>Cảnh báo Tồn</th>
                <th style={{ textAlign: 'center' }}>Thao tác Kho</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{item.itemCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                    </td>
                    <td>{item.category}</td>
                    <td style={{ fontWeight: 800, fontSize: '15px' }}>
                      {item.quantity} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>{item.unit}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {item.unitPrice?.toLocaleString('vi-VN')} đ
                    </td>
                    <td>{item.location || '---'}</td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-danger">
                          <AlertCircle size={12} /> Cảnh báo: Sắp hết (Tối thiểu {item.minQuantity})
                        </span>
                      ) : (
                        <span className="badge badge-success">An toàn</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            setAdjustInModalItem(item);
                            setAdjustInForm({ quantity: 1, reason: '', referenceCode: '' });
                          }}
                          title="Điều chỉnh Tăng Tồn Kho"
                        >
                          <ArrowUpRight size={14} /> Điều chỉnh tăng
                        </button>

                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => {
                            setAdjustOutModalItem(item);
                            setAdjustOutForm({ quantity: 1, reason: '', referenceCode: '' });
                          }}
                          title="Điều chỉnh Giảm Tồn Kho"
                        >
                          <ArrowDownRight size={14} /> Điều chỉnh giảm
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openHistory(item)}
                          title="Lịch sử Giao dịch Kho"
                        >
                          <History size={14} /> Lịch sử
                        </button>

                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Inventory Item Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm Vật tư / Phụ tùng mới">
        <form onSubmit={handleCreate}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tên Vật tư / Linh kiện *</label>
              <input type="text" className="form-input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Vòng bi SKF 6205, Dầu thủy lực..." />
            </div>
            <div className="form-group">
              <label className="form-label">Phân loại</label>
              <input type="text" className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Cơ khí, Linh kiện điện, Dầu mỡ..." />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Số lượng ban đầu</label>
              <input type="number" className="form-input" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Đơn vị tính</label>
              <input type="text" className="form-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="Cái, Lít, Bộ, Mét..." />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Đơn giá (VNĐ)</label>
              <input type="number" className="form-input" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Vị trí lưu kho</label>
              <input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Kệ A-01, Kho Dầu..." />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Lưu Vật tư</button>
          </div>
        </form>
      </Modal>

      {/* Adjust In Modal */}
      {adjustInModalItem && (
        <Modal isOpen={!!adjustInModalItem} onClose={() => setAdjustInModalItem(null)} title={`Điều chỉnh TĂNG tồn kho: ${adjustInModalItem.name}`}>
          <form onSubmit={handleAdjustInSubmit}>
            <p className="mb-4">
              <strong>Tồn hiện tại:</strong> {adjustInModalItem.quantity} {adjustInModalItem.unit} | <strong>Version:</strong> {adjustInModalItem.version}
            </p>

            <div className="form-group">
              <label className="form-label">Số lượng tăng thêm (+)*</label>
              <input
                type="number"
                min="1"
                className="form-input"
                required
                value={adjustInForm.quantity}
                onChange={(e) => setAdjustInForm({ ...adjustInForm, quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lý do điều chỉnh tăng *</label>
              <input
                type="text"
                className="form-input"
                required
                value={adjustInForm.reason}
                onChange={(e) => setAdjustInForm({ ...adjustInForm, reason: e.target.value })}
                placeholder="Kiểm kê phát hiện thừa, Nhập bù vật tư..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mã tham chiếu / Số biên bản (tùy chọn)</label>
              <input
                type="text"
                className="form-input"
                value={adjustInForm.referenceCode}
                onChange={(e) => setAdjustInForm({ ...adjustInForm, referenceCode: e.target.value })}
                placeholder="KK-2026-001..."
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustInModalItem(null)}>Hủy</button>
              <button type="submit" className="btn btn-success">
                <ArrowUpRight size={14} /> Xác nhận TĂNG tồn kho
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Out Modal */}
      {adjustOutModalItem && (
        <Modal isOpen={!!adjustOutModalItem} onClose={() => setAdjustOutModalItem(null)} title={`Điều chỉnh GIẢM tồn kho: ${adjustOutModalItem.name}`}>
          <form onSubmit={handleAdjustOutSubmit}>
            <p className="mb-4">
              <strong>Tồn hiện tại:</strong> {adjustOutModalItem.quantity} {adjustOutModalItem.unit} | <strong>Version:</strong> {adjustOutModalItem.version}
            </p>

            <div className="form-group">
              <label className="form-label">Số lượng giảm (-)*</label>
              <input
                type="number"
                min="1"
                max={adjustOutModalItem.quantity}
                className="form-input"
                required
                value={adjustOutForm.quantity}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lý do điều chỉnh giảm *</label>
              <input
                type="text"
                className="form-input"
                required
                value={adjustOutForm.reason}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, reason: e.target.value })}
                placeholder="Kiểm kê phát hiện thiếu, Hư hỏng thanh lý..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mã tham chiếu / Số biên bản (tùy chọn)</label>
              <input
                type="text"
                className="form-input"
                value={adjustOutForm.referenceCode}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, referenceCode: e.target.value })}
                placeholder="KK-2026-002..."
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdjustOutModalItem(null)}>Hủy</button>
              <button type="submit" className="btn btn-warning">
                <ArrowDownRight size={14} /> Xác nhận GIẢM tồn kho
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {historyItem && (
        <Modal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} title={`Lịch sử giao dịch kho: ${historyItem.name} (${historyItem.itemCode})`}>
          <div>
            {txLoading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--primary)' }} /> Đang tải lịch sử giao dịch...
              </div>
            ) : txHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Chưa có giao dịch kho nào.</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại giao dịch</th>
                      <th>Biến động</th>
                      <th>Tồn trước → Sau</th>
                      <th>Lý do / Tham chiếu</th>
                      <th>Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.map((tx) => (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(tx.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              tx.transactionType.includes('IN') || tx.transactionType === 'RETURN'
                                ? 'badge-success'
                                : 'badge-danger'
                            }`}
                          >
                            {tx.transactionType}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {tx.transactionType.includes('IN') || tx.transactionType === 'RETURN' ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </td>
                        <td>
                          {tx.quantityBefore} → <strong>{tx.quantityAfter}</strong>
                        </td>
                        <td>
                          <div>{tx.reason || tx.reference || '---'}</div>
                          {tx.referenceCode && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {tx.referenceCode}</div>}
                        </td>
                        <td>{tx.actedBy?.name || tx.actedById || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
