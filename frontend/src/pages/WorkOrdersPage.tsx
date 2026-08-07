import React, { useEffect, useState } from 'react';
import { api, fetchWithAuth } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ChecklistManager } from '../components/common/ChecklistManager';
import { Plus, Search, LayoutGrid, List, ChevronDown, Package, RotateCcw, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../components/common/Toast';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedChecklistWO, setSelectedChecklistWO] = useState<any | null>(null);

  // Material & Return Modal
  const [selectedMaterialWO, setSelectedMaterialWO] = useState<any | null>(null);
  const [woTransactions, setWoTransactions] = useState<any[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);

  // Return Item Form Modal
  const [returnItemTarget, setReturnItemTarget] = useState<any | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');

  const [users, setUsers] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    equipmentId: '',
    workOrderType: 'Sửa chữa',
    priority: 'MEDIUM',
    technicianName: '',
    plannedStartDate: '',
    plannedEndDate: '',
    description: '',
  });

  const [techniciansList, setTechniciansList] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch dynamic users and tech lists
      const [eqRes, techRes, userRes] = await Promise.all([
        api.getEquipment(),
        api.getUsers({ role: 'TECHNICIAN' }),
        api.getUsers().catch(() => []),
      ]);
      setEquipmentList(eqRes);
      setTechniciansList(techRes);
      setUsers(userRes);

      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }

      // Fetch Work Orders with pagination
      const url = new URL(`${API_BASE}/api/v1/work-orders`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) url.searchParams.append('search', search);

      const response = await fetchWithAuth(url.toString());
      if (!response.ok) throw new Error('Không thể tải danh sách Work Orders');
      const result = await response.json();

      if (result && result.data && Array.isArray(result.data)) {
        setWorkOrders(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } else if (Array.isArray(result)) {
        setWorkOrders(result);
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
      const res = await fetchWithAuth(`${API_BASE}/api/v1/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Không thể tạo phiếu bảo trì');
      setIsAddOpen(false);
      toast.success('Thành công', 'Đã tạo phiếu bảo trì mới.');
      loadData();
    } catch (err) {
      toast.error('Lỗi', 'Không thể tạo phiếu bảo trì!');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, expectedVersion: number) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/work-orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, expectedVersion })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi đổi trạng thái');
      }
      setStatusDropdownId(null);
      toast.success('Thành công', 'Đã cập nhật trạng thái phiếu bảo trì.');
      loadData();
    } catch (err: any) {
      toast.error('Đổi trạng thái thất bại', err.message);
    }
  };

  const openMaterialModal = async (wo: any) => {
    setSelectedMaterialWO(wo);
    setMaterialLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/work-orders/${wo.id}/inventory-transactions`);
      if (!res.ok) throw new Error('Không thể tải lịch sử xuất nhập vật tư');
      const txs = await res.json();
      setWoTransactions(txs);
    } catch (err) {
      console.error(err);
    } finally {
      setMaterialLoading(false);
    }
  };

  const handleReturnClick = (woItem: any) => {
    const txs = woTransactions;
    const totalIssued = txs
      .filter((t) => t.transactionType === 'ISSUE' && t.workOrderItemId === woItem.id)
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalReturned = txs
      .filter((t) => t.transactionType === 'RETURN' && t.workOrderItemId === woItem.id)
      .reduce((sum, t) => sum + t.quantity, 0);

    const returnableQty = totalIssued - totalReturned;

    if (totalIssued === 0) {
      toast.warning('Không thể trả', 'Vật tư này chưa từng được xuất cho phiếu bảo trì này.');
      return;
    }
    if (returnableQty <= 0) {
      toast.info('Đã trả hết', 'Vật tư này đã được trả hết.');
      return;
    }

    setReturnItemTarget({ woItem, returnableQty });
    setReturnQuantity(1);
    setReturnReason('Vật tư dư thừa sau khi sửa chữa');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItemTarget || !selectedMaterialWO) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/work-orders/${selectedMaterialWO.id}/material-returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryItemId: returnItemTarget.woItem.inventoryItemId,
          quantity: returnQuantity,
          reason: returnReason,
          workOrderItemId: returnItemTarget.woItem.id,
          expectedInventoryVersion: returnItemTarget.woItem.inventoryItem.version,
          expectedWorkOrderVersion: selectedMaterialWO.version
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi trả vật tư');
      }

      toast.success('Trả vật tư thành công', 'Đã trả vật tư về kho.');
      setReturnItemTarget(null);
      openMaterialModal(selectedMaterialWO);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi trả vật tư', err.message);
    }
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Phiếu bảo trì (Work Orders)</h1>
          <p className="page-subtitle">Quản lý lệnh sửa chữa và vật tư liên quan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Tạo phiếu mới
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
            placeholder="Tìm kiếm phiếu, mã thiết bị, kỹ thuật viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách phiếu bảo trì...</div>
      ) : (
        <div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Tiêu đề bảo trì</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái</th>
                  <th>Độ ưu tiên</th>
                  <th>Kỹ thuật viên</th>
                  <th style={{ textAlign: 'center' }}>Vật tư</th>
                  <th style={{ textAlign: 'center' }}>Checklist</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Không có phiếu bảo trì nào được tìm thấy
                    </td>
                  </tr>
                ) : workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td style={{ fontWeight: 700 }}>{wo.orderCode}</td>
                    <td style={{ fontWeight: 600 }}>{wo.title}</td>
                    <td>{wo.equipment?.name || '---'}</td>
                    <td>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
                          onClick={() => setStatusDropdownId(statusDropdownId === wo.id ? null : wo.id)}
                        >
                          <StatusBadge status={wo.status} />
                          <ChevronDown size={12} />
                        </button>
                        {statusDropdownId === wo.id && (
                          <div className="action-dropdown" style={{
                            position: 'absolute', left: 0, top: '28px', zIndex: 1000,
                            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: '4px', width: '150px', padding: '4px 0', boxShadow: 'var(--shadow-md)'
                          }}>
                            {['ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'].map((st) => (
                              <button
                                key={st}
                                onClick={() => handleStatusChange(wo.id, st, wo.version)}
                                style={{ display: 'block', width: '100%', padding: '6px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '12px' }}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge badge-${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'danger' : 'warning'}`}>{wo.priority}</span></td>
                    <td>{wo.technicianName || 'Chưa phân công'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Quản lý Vật tư"
                        onClick={() => openMaterialModal(wo)}
                      >
                        <Package size={14} /> ({wo.items?.length || 0})
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Thực thi Checklist"
                        onClick={() => {
                          setSelectedChecklistWO(wo);
                          setIsChecklistOpen(true);
                        }}
                      >
                        Checklist
                      </button>
                    </td>
                    <td>---</td>
                  </tr>
                ))}
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
                Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{total}</strong> phiếu bảo trì
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

      {/* Checklist execution Modal */}
      {isChecklistOpen && selectedChecklistWO && (
        <Modal 
          isOpen={isChecklistOpen} 
          onClose={() => setIsChecklistOpen(false)} 
          title={`Thực thi checklist: ${selectedChecklistWO.orderCode}`}
        >
          <ChecklistManager workOrderId={selectedChecklistWO.id} workOrderStatus={selectedChecklistWO.status} />
        </Modal>
      )}

      {/* Material & Returns Modal */}
      {selectedMaterialWO && (
        <Modal
          isOpen={!!selectedMaterialWO}
          onClose={() => setSelectedMaterialWO(null)}
          title={`Quản lý vật tư: ${selectedMaterialWO.orderCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>Danh mục phụ tùng liên kết bảo trì:</h4>
            {materialLoading ? (
              <div>Đang tải thông tin...</div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Tên vật tư</th>
                      <th>Số lượng định mức</th>
                      <th>Đơn giá</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedMaterialWO.items || []).map((item: any) => {
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.inventoryItem?.name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') + ' ₫' : '---'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn btn-warning btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px' }}
                              onClick={() => handleReturnClick(item)}
                            >
                              <RotateCcw size={13} /> Trả vật tư
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* History of ISSUE & RETURN for WO */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Lịch sử Xuất / Trả vật tư:</h4>
            {woTransactions.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa có giao dịch xuất/trả vật tư nào.</div>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại</th>
                      <th>Vật tư</th>
                      <th>Số lượng</th>
                      <th>Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {woTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                        <td>
                          <span className={`badge ${tx.transactionType === 'RETURN' ? 'badge-success' : 'badge-warning'}`}>
                            {tx.transactionType}
                          </span>
                        </td>
                        <td>{tx.inventoryItem?.name || tx.inventoryItemId}</td>
                        <td style={{ fontWeight: 700 }}>{tx.transactionType === 'RETURN' ? `+${tx.quantity}` : `-${tx.quantity}`}</td>
                        <td>{tx.reason || tx.reference || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Return Item Form Modal */}
      {returnItemTarget && (
        <Modal
          isOpen={!!returnItemTarget}
          onClose={() => setReturnItemTarget(null)}
          title={`Trả vật tư: ${returnItemTarget.woItem?.inventoryItem?.name}`}
        >
          <form onSubmit={handleReturnSubmit}>
            <p className="mb-4">
              <strong>Số lượng có thể trả tối đa:</strong> {returnItemTarget.returnableQty}
            </p>

            <div className="form-group">
              <label className="form-label">Số lượng trả về kho *</label>
              <input
                type="number"
                min="1"
                max={returnItemTarget.returnableQty}
                className="form-input"
                required
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Math.min(returnItemTarget.returnableQty, Math.max(1, Number(e.target.value))))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lý do trả vật tư *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="Vật tư dư thừa sau khi sửa chữa..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setReturnItemTarget(null)}>Hủy</button>
              <button type="submit" className="btn btn-warning">
                <RotateCcw size={14} /> Xác nhận TRẢ VẬT TƯ
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
