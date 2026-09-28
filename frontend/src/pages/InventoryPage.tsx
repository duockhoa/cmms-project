import React, { useEffect, useState } from 'react';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { Modal } from '../components/common/Modal';
import { Plus, AlertCircle, ArrowUpRight, ArrowDownRight, Trash2, History, RefreshCw } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { TableSkeleton } from '../components/common/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, FilterBar, PageHeader, SearchInput } from '../components/common';
import { useModal } from '../hooks/useModal';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const addModal = useModal();

  // Adjust In / Out Modals
  const adjustInModal = useModal<any>();
  const adjustOutModal = useModal<any>();

  const [adjustInForm, setAdjustInForm] = useState({ quantity: 1, reason: '', referenceCode: '' });
  const [adjustOutForm, setAdjustOutForm] = useState({ quantity: 1, reason: '', referenceCode: '' });

  // History Modal
  const historyModal = useModal<any>();
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    category: '',
    quantity: 0,
    unit: 'Cái',
    minQuantity: 0,
    unitPrice: 0,
    location: '',
  });

  // Load static catalogs (users, categories) ONCE on mount
  const loadCatalogs = async () => {
    try {
      const [userRes, catsRes] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getEquipmentCategories().catch(() => []),
      ]);
      setUsers(userRes);
      setCategoriesList(catsRes || []);
    } catch (err) {
      console.error('Failed to load catalogs in InventoryPage:', err);
    }
  };

  // Fetch Inventory with pagination params
  const loadInventory = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/v1/inventory`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (debouncedSearch) url.searchParams.append('search', debouncedSearch);

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

  const loadData = () => loadInventory();

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [debouncedSearch, page]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Không thể thêm vật tư');
      addModal.close();
      setFormData({
        itemCode: '',
        name: '',
        category: '',
        quantity: 0,
        unit: 'Cái',
        minQuantity: 0,
        unitPrice: 0,
        location: '',
      });
      toast.success('Thành công', 'Đã thêm vật tư mới vào kho.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi thêm vật tư kho!');
    }
  };

  const handleAdjustInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustInModal.data) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory/${adjustInModal.data.id}/adjust-in`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(adjustInForm.quantity),
          reason: adjustInForm.reason.trim(),
          referenceCode: adjustInForm.referenceCode.trim() || undefined,
          expectedVersion: adjustInModal.data.version,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi điều chỉnh tăng');
      }

      adjustInModal.close();
      toast.success('Thành công', 'Đã điều chỉnh tăng tồn kho.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi điều chỉnh tăng', err.message);
    }
  };

  const handleAdjustOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustOutModal.data) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/inventory/${adjustOutModal.data.id}/adjust-out`, {
        method: 'POST',
        body: JSON.stringify({
          quantity: Number(adjustOutForm.quantity),
          reason: adjustOutForm.reason.trim(),
          referenceCode: adjustOutForm.referenceCode.trim() || undefined,
          expectedVersion: adjustOutModal.data.version,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi điều chỉnh giảm');
      }

      adjustOutModal.close();
      toast.success('Thành công', 'Đã điều chỉnh giảm tồn kho.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi điều chỉnh giảm', err.message);
    }
  };

  const openHistoryModal = async (item: any) => {
    historyModal.open(item);
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
      <PageHeader
        title="Quản lý kho vật tư (Inventory)"
        subtitle="Quản lý tồn kho phụ tùng, thiết bị thay thế và giao dịch kho"
        actions={(
          <button className="btn btn-primary" onClick={() => addModal.open()}>
            <Plus size={16} /> Thêm vật tư mới
          </button>
        )}
      />

      {/* Filter Bar */}
      <FilterBar hasActiveFilters={Boolean(search)} onReset={() => handleSearchChange('')}>
        <div className="filter-search">
          <SearchInput
            placeholder="Tìm theo tên vật tư, mã SKU..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </FilterBar>

      {/* Table */}
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
              {loading ? (
                <TableSkeleton columns={8} rows={6} />
              ) : inventory.length === 0 ? (
                <EmptyState
                  colSpan={8}
                  compact
                  minHeight={150}
                  title="Không tìm thấy vật tư"
                  description="Thử thay đổi từ khóa tìm kiếm hoặc thêm vật tư mới vào kho."
                  action={{ label: 'Thêm vật tư', onClick: () => addModal.open(), icon: Plus }}
                />
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
                              adjustInModal.open(item);
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
                              adjustOutModal.open(item);
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

          {/* Responsive Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            itemName="vật tư phụ tùng"
            onPageChange={setPage}
          />
        </div>

      {/* Modal Add Item */}
      <Modal isOpen={addModal.isOpen} onClose={addModal.close} title="Thêm vật tư phụ tùng mới">
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
                <option value="">-- Chọn loại vật tư --</option>
                {categoriesList.map((cat: any) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
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
            <button type="button" className="btn btn-secondary" onClick={addModal.close}>Hủy</button>
            <button type="submit" className="btn btn-primary">Xác nhận</button>
          </div>
        </form>
      </Modal>

      {/* Adjust In Modal */}
      {adjustInModal.data && (
        <Modal isOpen={adjustInModal.isOpen} onClose={adjustInModal.close} title={`Tăng tồn kho: ${adjustInModal.data.name}`}>
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
              <button type="button" className="btn btn-secondary" onClick={adjustInModal.close}>Hủy</button>
              <button type="submit" className="btn btn-success">
                <ArrowUpRight size={14} /> Xác nhận TĂNG tồn kho
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Out Modal */}
      {adjustOutModal.data && (
        <Modal isOpen={adjustOutModal.isOpen} onClose={adjustOutModal.close} title={`Giảm tồn kho: ${adjustOutModal.data.name}`}>
          <form onSubmit={handleAdjustOutSubmit}>
            <div className="form-group">
              <label className="form-label">Số lượng giảm đi *</label>
              <input
                type="number"
                min="1"
                max={adjustOutModal.data.quantity}
                className="form-input"
                required
                value={adjustOutForm.quantity}
                onChange={(e) => setAdjustOutForm({ ...adjustOutForm, quantity: Math.min(adjustOutModal.data.quantity, Math.max(1, Number(e.target.value))) })}
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
              <button type="button" className="btn btn-secondary" onClick={adjustOutModal.close}>Hủy</button>
              <button type="submit" className="btn btn-warning">
                <ArrowDownRight size={14} /> Xác nhận GIẢM tồn kho
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Modal */}
      {historyModal.data && (
        <Modal isOpen={historyModal.isOpen} onClose={historyModal.close} title={`Lịch sử giao dịch kho: ${historyModal.data.name} (${historyModal.data.itemCode})`}>
          <div>
            {txLoading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--primary)' }} /> Đang tải lịch sử giao dịch...
              </div>
            ) : txHistory.length === 0 ? (
              <EmptyState compact minHeight={120} title="Chưa có giao dịch kho" />
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
