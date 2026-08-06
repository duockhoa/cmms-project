import React, { useEffect, useState } from 'react';
import { api, fetchWithAuth } from '../services/api';
import { Modal } from '../components/common/Modal';
import { Plus, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2, History, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

      const userRes = await api.getUsers().catch(() => []);
      setUsers(userRes);

      // Fetch Inventory with pagination params
      const url = new URL(`${API_BASE}/api/v1/inventory`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) url.searchParams.append('search', search);

      const response = await fetchWithAuth(url.toString());
      if (!response.ok) throw new Error('Không thể tải danh sách vật tư');
      const result = await response.json();

      if (result && result.data && Array.isArray(result.data)) {
        setInventory(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } else if (Array.isArray(result)) {
        setInventory(result);
        setTotal(result.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Không thể thêm vật tư');
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
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory/${adjustInModalItem.id}/adjust-in`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(adjustInForm.quantity),
          reason: adjustInForm.reason.trim(),
          referenceCode: adjustInForm.referenceCode.trim() || undefined,
          expectedVersion: adjustInModalItem.version,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi điều chỉnh tăng');
      }

      setAdjustInModalItem(null);
      alert('Đã điều chỉnh tăng tồn kho thành công!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustOutModalItem) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory/${adjustOutModalItem.id}/adjust-out`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(adjustOutForm.quantity),
          reason: adjustOutForm.reason.trim(),
          referenceCode: adjustOutForm.referenceCode.trim() || undefined,
          expectedVersion: adjustOutModalItem.version,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi điều chỉnh giảm');
      }

      setAdjustOutModalItem(null);
      alert('Đã điều chỉnh giảm tồn kho thành công!');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openHistoryModal = async (item: any) => {
    setHistoryItem(item);
    setTxLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory/${item.id}/transactions`);
      if (!res.ok) throw new Error('Không thể tải lịch sử giao dịch');
      const data = await res.json();
      setTxHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý kho vật tư (Inventory)</h1>
          <p className="page-subtitle">Quản lý tồn kho phụ tùng, thiết bị thay thế và giao dịch kho</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Thêm vật tư mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo tên vật tư, mã SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách vật tư...</div>
      ) : (
        <div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã vật tư</th>
                  <th>Tên phụ tùng / Vật tư</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Mức tối thiểu</th>
                  <th>Vị trí kệ</th>
                  <th>Đơn giá</th>
                  <th style={{ textAlign: 'center' }}>Thao tác điều chỉnh</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Không tìm thấy phụ tùng hoặc vật tư nào
                    </td>
                  </tr>
                ) : inventory.map((item) => {
                  const isLowStock = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.itemCode}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.category}</td>
                      <td style={{ fontWeight: 700, color: isLowStock ? '#dc2626' : 'inherit' }}>
                        {item.quantity} {item.unit}
                        {isLowStock && (
                          <span className="badge badge-danger" style={{ fontSize: '9px', marginLeft: '6px', padding: '2px 6px' }}>
                            Sắp hết
                          </span>
                        )}
                      </td>
                      <td>{item.minQuantity} {item.unit}</td>
                      <td>{item.location || '---'}</td>
                      <td style={{ fontWeight: 600 }}>{item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') + ' ₫' : '---'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', color: '#16a34a' }}
                            title="Điều chỉnh Tăng"
                            onClick={() => {
                              setAdjustInModalItem(item);
                              setAdjustInForm({ quantity: 1, reason: 'Kiểm kê định kỳ phát hiện thừa', referenceCode: '' });
                            }}
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', color: '#dc2626' }}
                            title="Điều chỉnh Giảm"
                            onClick={() => {
                              setAdjustOutModalItem(item);
                              setAdjustOutForm({ quantity: 1, reason: 'Kiểm kê định kỳ phát hiện thiếu', referenceCode: '' });
                            }}
                          >
                            <ArrowDownRight size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px' }}
                            title="Lịch sử giao dịch"
                            onClick={() => openHistoryModal(item)}
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {total > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '16px', 
              padding: '12px 16px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              backgroundColor: 'var(--bg-secondary)' 
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{total}</strong> vật tư phụ tùng
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', gap: '4px' }}
                >
                  <ChevronLeft size={14} /> Trang trước
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                  <button 
                    key={pNum} 
                    className={`btn btn-sm ${page === pNum ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(pNum)}
                    style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      padding: 0, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: page === pNum ? '#2563eb' : 'transparent',
                      color: page === pNum ? '#ffffff' : 'var(--text-primary)',
                      border: page === pNum ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    {pNum}
                  </button>
                ))}
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', gap: '4px' }}
                >
                  Trang sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Add Item */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm vật tư phụ tùng mới">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Tên phụ tùng *</label>
            <input type="text" className="form-input" required placeholder="Ví dụ: Vòng bi SKF" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Mã SKU *</label>
              <input type="text" className="form-input" required placeholder="Mã định danh vật tư" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Loại</label>
              <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Cơ khí">Cơ khí</option>
                <option value="Điện">Điện</option>
                <option value="Vật tư chung">Vật tư chung</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tồn ban đầu</label>
              <input type="number" className="form-input" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mức tối thiểu</label>
              <input type="number" className="form-input" value={formData.minQuantity} onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value, 10) })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Vị trí kệ</label>
              <input type="text" className="form-input" placeholder="Ví dụ: Kệ A-02" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Đơn giá (₫)</label>
              <input type="number" className="form-input" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value, 10) })} />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Xác nhận</button>
          </div>
        </form>
      </Modal>

      {/* Adjust In Modal */}
      {adjustInModalItem && (
        <Modal isOpen={!!adjustInModalItem} onClose={() => setAdjustInModalItem(null)} title={`Tăng tồn kho: ${adjustInModalItem.name}`}>
          <form onSubmit={handleAdjustInSubmit}>
            <div className="form-group">
              <label className="form-label">Số lượng tăng thêm *</label>
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
              <label className="form-label">Lý do điều chỉnh *</label>
              <input
                type="text"
                className="form-input"
                required
                value={adjustInForm.reason}
                onChange={(e) => setAdjustInForm({ ...adjustInForm, reason: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mã chứng từ tham chiếu (Không bắt buộc)</label>
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
        <Modal isOpen={!!adjustOutModalItem} onClose={() => setAdjustOutModalItem(null)} title={`Giảm tồn kho: ${adjustOutModalItem.name}`}>
          <form onSubmit={handleAdjustOutSubmit}>
            <div className="form-group">
              <label className="form-label">Số lượng giảm đi *</label>
              <input
                type="number"
                min="1"
                max={adjustOutModalItem.quantity}
                className="form-input"
                required
                value={adjustOutForm.quantity}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, quantity: Math.min(adjustOutModalItem.quantity, Math.max(1, Number(e.target.value))) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lý do điều chỉnh *</label>
              <input
                type="text"
                className="form-input"
                required
                value={adjustOutForm.reason}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, reason: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mã chứng từ tham chiếu (Không bắt buộc)</label>
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
