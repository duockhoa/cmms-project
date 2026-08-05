import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ChecklistManager } from '../components/common/ChecklistManager';
import { Plus, Search, LayoutGrid, List, ChevronDown, Package, RotateCcw, RefreshCw } from 'lucide-react';

export const WorkOrdersPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
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
      const [woRes, eqRes, techRes, userRes] = await Promise.all([
        api.getWorkOrders({ search }),
        api.getEquipment(),
        api.getUsers({ role: 'TECHNICIAN' }),
        api.getUsers().catch(() => []),
      ]);
      setWorkOrders(woRes);
      setEquipmentList(eqRes);
      setTechniciansList(techRes);
      setUsers(userRes);
      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }
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
      await api.createWorkOrder(formData);
      setIsAddOpen(false);
      loadData();
    } catch (err) {
      alert('Lỗi tạo Work Order!');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, expectedVersion: number) => {
    try {
      await api.updateWorkOrderStatus(id, { status: newStatus, expectedVersion });
      setStatusDropdownId(null);
      loadData();
    } catch (err: any) {
      if (err.message && err.message.includes('INSUFFICIENT_STOCK')) {
        alert('Lỗi: Kho không đủ vật tư dự phòng để hoàn thành công việc!');
      } else if (err.message && (err.message.includes('sửa đổi') || err.message.includes('Xung đột') || err.message.includes('Conflict'))) {
        alert('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.');
      } else {
        alert(`Lỗi đổi trạng thái: ${err.message || 'Yêu cầu không hợp lệ'}`);
      }
    }
  };

  const openMaterialModal = async (wo: any) => {
    setSelectedMaterialWO(wo);
    setMaterialLoading(true);
    try {
      const txs = await api.getWorkOrderInventoryTransactions(wo.id);
      setWoTransactions(txs || []);
    } catch (err) {
      console.error(err);
      setWoTransactions([]);
    } finally {
      setMaterialLoading(false);
    }
  };

  const calculateItemReturnable = (woItem: any) => {
    const issued = woTransactions
      .filter((t) => t.workOrderItemId === woItem.id && t.transactionType === 'ISSUE')
      .reduce((sum, t) => sum + t.quantity, 0);
    const returned = woTransactions
      .filter((t) => t.workOrderItemId === woItem.id && t.transactionType === 'RETURN')
      .reduce((sum, t) => sum + t.quantity, 0);
    return {
      issued: issued || woItem.quantity, // fallback to woItem.quantity if issue transactions created before Phase 3.6
      returned,
      returnable: Math.max(0, (issued || woItem.quantity) - returned),
    };
  };

  const openReturnForm = (woItem: any, returnableQty: number) => {
    setReturnItemTarget({
      woItem,
      returnableQty,
    });
    setReturnQuantity(Math.min(1, returnableQty));
    setReturnReason('');
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnItemTarget || !selectedMaterialWO) return;
    try {
      const invItem = await api.getInventory().then((items: any[]) => items.find((i: any) => i.id === returnItemTarget.woItem.inventoryItemId));
      const expectedInvVer = invItem ? invItem.version : 1;

      await api.returnWorkOrderMaterial(selectedMaterialWO.id, {
        inventoryItemId: returnItemTarget.woItem.inventoryItemId,
        workOrderItemId: returnItemTarget.woItem.id,
        quantity: Number(returnQuantity),
        reason: returnReason.trim(),
        expectedInventoryVersion: expectedInvVer,
        expectedWorkOrderVersion: selectedMaterialWO.version,
        actedById: getActiveUserId(),
      });

      alert('Trả vật tư về kho thành công!');
      setReturnItemTarget(null);
      // Reload WO transactions and main WO list
      openMaterialModal(selectedMaterialWO);
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        alert('Có xung đột đồng thời do người khác cập nhật! Vui lòng tải lại trang.');
        setReturnItemTarget(null);
        loadData();
      } else {
        alert(`Lỗi trả vật tư: ${err.message || 'Không thể thực hiện'}`);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Order</h1>
          <p className="page-subtitle">Quản lý yêu cầu bảo trì, sửa chữa và kiểm tra</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Tạo Work Order
        </button>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách Work Order...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã WO</th>
                <th>Tiêu đề / Mô tả</th>
                <th>Thiết bị</th>
                <th>Người phụ trách</th>
                <th>Độ ưu tiên</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Vật tư & Checklist</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{wo.orderCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{wo.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wo.description}</div>
                  </td>
                  <td>{wo.equipment?.name || '---'}</td>
                  <td>{wo.technicianName || '---'}</td>
                  <td><StatusBadge status={wo.priority} /></td>
                  <td><StatusBadge status={wo.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedChecklistWO(wo);
                          setIsChecklistOpen(true);
                        }}
                      >
                        Checklist
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openMaterialModal(wo)}
                        style={{ color: 'var(--primary)' }}
                      >
                        <Package size={13} /> Vật tư ({wo.items?.length || 0})
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', position: 'relative' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setStatusDropdownId(statusDropdownId === wo.id ? null : wo.id)}
                    >
                      Đổi trạng thái <ChevronDown size={14} />
                    </button>

                    {statusDropdownId === wo.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', zIndex: 10,
                        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                        padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', width: '140px'
                      }}>
                        <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS', wo.version)}>Đang thực hiện</button>
                        <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleStatusChange(wo.id, 'INSPECTION', wo.version)}>Nghiệm thu</button>
                        <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => handleStatusChange(wo.id, 'COMPLETED', wo.version)}>Hoàn thành</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create Work Order */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo Work Order">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Tiêu đề *</label>
            <input type="text" className="form-input" required placeholder="Mô tả ngắn gọn công việc" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Thiết bị *</label>
              <select className="form-select" required value={formData.equipmentId} onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>[{eq.code}] {eq.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loại Work Order</label>
              <select className="form-select" value={formData.workOrderType} onChange={(e) => setFormData({ ...formData, workOrderType: e.target.value })}>
                <option value="Sửa chữa">Sửa chữa</option>
                <option value="Bảo trì phòng ngừa">Bảo trì phòng ngừa</option>
                <option value="Kiểm tra">Kiểm tra</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Mức ưu tiên</label>
              <select className="form-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kỹ thuật viên</label>
              <select
                className="form-select"
                value={formData.technicianName}
                onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
              >
                <option value="">-- Chưa phân công --</option>
                {techniciansList.map(tech => (
                  <option key={tech.id} value={tech.name}>{tech.name} ({tech.specialty || 'Chưa cập nhật'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả sự cố/công việc *</label>
            <textarea className="form-textarea" rows={3} required placeholder="Mô tả chi tiết vấn đề hoặc công việc cần thực hiện..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Tạo Work Order</button>
          </div>
        </form>
      </Modal>

      {/* Modal Checklist Execution */}
      {selectedChecklistWO && (
        <Modal
          isOpen={isChecklistOpen}
          onClose={() => {
            setIsChecklistOpen(false);
            setSelectedChecklistWO(null);
          }}
          title={`Checklist bảo trì - ${selectedChecklistWO.orderCode}`}
        >
          <div style={{ padding: '4px' }}>
            <ChecklistManager
              workOrderId={selectedChecklistWO.id}
              workOrderStatus={selectedChecklistWO.status}
              onStatusChange={loadData}
            />
          </div>
        </Modal>
      )}

      {/* Modal Material & Material Return */}
      {selectedMaterialWO && (
        <Modal
          isOpen={!!selectedMaterialWO}
          onClose={() => setSelectedMaterialWO(null)}
          title={`Vật tư & Trả vật tư - ${selectedMaterialWO.orderCode}`}
        >
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Danh sách Vật tư đính kèm WO:</h4>

            {materialLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--primary)' }} /> Đang tải dữ liệu vật tư...
              </div>
            ) : !selectedMaterialWO.items || selectedMaterialWO.items.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Phiếu bảo trì này chưa gắn vật tư.
              </div>
            ) : (
              <div className="table-wrapper mb-4">
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Vật tư</th>
                      <th>Đã Xuất (ISSUE)</th>
                      <th>Đã Trả (RETURN)</th>
                      <th>Còn thể trả</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMaterialWO.items.map((woItem: any) => {
                      const { issued, returned, returnable } = calculateItemReturnable(woItem);
                      const isReturnDisabled =
                        returnable <= 0 ||
                        selectedMaterialWO.status === 'CANCELLED' ||
                        selectedMaterialWO.status === 'CLOSED';

                      return (
                        <tr key={woItem.id}>
                          <td style={{ fontWeight: 600 }}>{woItem.inventoryItem?.name || woItem.inventoryItemId}</td>
                          <td style={{ fontWeight: 700 }}>{issued}</td>
                          <td style={{ color: 'var(--warning)', fontWeight: 700 }}>{returned}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 800 }}>{returnable}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-warning btn-sm"
                              disabled={isReturnDisabled}
                              onClick={() => openReturnForm(woItem, returnable)}
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
