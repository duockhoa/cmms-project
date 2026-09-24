import React, { useEffect, useState } from 'react';
import { api, fetchWithAuth, API_HOST } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ChecklistManager } from '../components/common/ChecklistManager';
import { Plus, Search, LayoutGrid, List, ChevronDown, Package, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, Camera, Eye, Trash2, Play, Pause, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { QRScanner } from '../components/common/QRScanner';
import { WorkOrderDetailView } from '../components/common/WorkOrderDetailView';
import { usePermissions } from '../hooks/usePermissions';

const API_BASE = API_HOST;

export const WorkOrdersPage: React.FC = () => {
  const { can, isAdmin } = usePermissions();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [handlerTeamFilter, setHandlerTeamFilter] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);

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
  const [currentUser, setCurrentUser] = useState<any>(null);

  // QR and Detail states
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [manualDeviceCode, setManualDeviceCode] = useState('');
  const [multipleWosList, setMultipleWosList] = useState<any[]>([]);
  const [isSelectWoOpen, setIsSelectWoOpen] = useState(false);
  const [selectedDetailWoId, setSelectedDetailWoId] = useState<string | null>(null);

  // Quick Pause & Delete modals
  const [woToPause, setWoToPause] = useState<any | null>(null);
  const [pauseReason, setPauseReason] = useState('Chờ phụ tùng');
  const [isPausing, setIsPausing] = useState(false);

  const [woToDelete, setWoToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDeleteWo = can('work_orders:delete');

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

      // Fetch dynamic users and tech lists, plus departments, plus current user profile
      const [eqRes, techRes, userRes, deptRes, meRes] = await Promise.all([
        api.getEquipment(),
        api.getUsers({ role: 'TECHNICIAN' }),
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setEquipmentList(eqRes);
      setTechniciansList(techRes);
      setUsers(userRes);
      setDepartments(deptRes);
      if (meRes && meRes.user) {
        setCurrentUser(meRes.user);
      } else if (meRes) {
        setCurrentUser(meRes);
      }

      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }

      // Fetch Work Orders with pagination
      const url = new URL(`${API_BASE}/api/v1/work-orders`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) url.searchParams.append('search', search);
      if (handlerTeamFilter) url.searchParams.append('handlerTeam', handlerTeamFilter);
      if (statusFilter) url.searchParams.append('status', statusFilter);

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
  }, [search, page, handlerTeamFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, handlerTeamFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Không thể tạo phiếu sửa chữa');
      setIsAddOpen(false);
      toast.success('Thành công', 'Đã tạo phiếu sửa chữa mới.');
      loadData();
    } catch (err) {
      toast.error('Lỗi', 'Không thể tạo phiếu sửa chữa!');
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
      toast.warning('Không thể trả', 'Vật tư này chưa từng được xuất cho phiếu sửa chữa này.');
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

  const handleDeviceIdentified = async (deviceCode: string, method: 'QR_SCAN' | 'MANUAL_ENTRY') => {
    try {
      setLoading(true);
      let cleanCode = (deviceCode || '')
        .replace(/^cmms-equipment:/i, '')
        .replace(/^equipment:/i, '')
        .trim();
      if (cleanCode.includes('$')) {
        cleanCode = cleanCode.split('$')[0].trim();
      }
      const res = await api.getWorkOrdersByEquipmentQr(cleanCode, method);
      
      toast.success('Nhận diện thiết bị', `Thiết bị: ${res.equipment.name} (${res.equipment.code})`);
      
      if (res.workOrders.length === 0) {
        toast.warning('Không có công việc', 'Thiết bị này không có công việc đang được phân công cho bạn.');
        return;
      }
      
      if (res.workOrders.length === 1) {
        setSelectedDetailWoId(res.workOrders[0].id);
      } else {
        setMultipleWosList(res.workOrders);
        setIsSelectWoOpen(true);
      }
    } catch (err: any) {
      toast.error('Lỗi nhận diện', err.message || 'Không tìm thấy thiết bị hoặc không có quyền.');
    } finally {
      setLoading(false);
    }
  };



  const handleQuickStart = async (wo: any) => {
    try {
      await api.updateWorkOrderStatus(wo.id, {
        status: 'IN_PROGRESS',
        expectedVersion: wo.version,
      });
      toast.success('Thành công', `Đã bắt đầu thực hiện phiếu ${wo.orderCode}`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể bắt đầu');
    }
  };

  const handleQuickPause = (wo: any) => {
    setWoToPause(wo);
    setPauseReason('Chờ phụ tùng');
  };

  const confirmQuickPause = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!woToPause) return;
    const finalReason = pauseReason.trim() || 'Tạm dừng bảo trì';
    try {
      setIsPausing(true);
      await api.updateWorkOrderStatus(woToPause.id, {
        status: 'ON_HOLD',
        reason: finalReason,
        expectedVersion: woToPause.version,
      } as any);
      toast.success('Thành công', `Đã chuyển ${woToPause.orderCode} sang trạng thái Tạm dừng`);
      setWoToPause(null);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể tạm dừng');
    } finally {
      setIsPausing(false);
    }
  };

  const handleQuickResume = async (wo: any) => {
    try {
      await api.updateWorkOrderStatus(wo.id, {
        status: 'IN_PROGRESS',
        expectedVersion: wo.version,
      });
      toast.success('Thành công', `Đã tiếp tục thực hiện phiếu ${wo.orderCode}`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể tiếp tục');
    }
  };

  const handleDeleteWo = (wo: any) => {
    setWoToDelete(wo);
  };

  const confirmDeleteWo = async () => {
    if (!woToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteWorkOrder(woToDelete.id);
      toast.success('Thành công', `Đã xóa phiếu sửa chữa ${woToDelete.orderCode}`);
      if (selectedDetailWoId === woToDelete.id) {
        setSelectedDetailWoId(null);
      }
      setWoToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi xóa phiếu', err.message || 'Không thể xóa phiếu sửa chữa');
    } finally {
      setIsDeleting(false);
    }
  };

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div>
      {!selectedDetailWoId ? (
        <>
          <div className="page-header">
        <div>
          <h1 className="page-title">Phiếu sửa chữa</h1>
          <p className="page-subtitle">Quản lý lệnh sửa chữa và vật tư liên quan</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-warning" onClick={() => setIsQrScannerOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Camera size={16} /> Quét mã thiết bị
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Tạo phiếu mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
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

        {/* Trạng thái Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Trạng thái:</label>
          <select 
            className="form-select" 
            style={{ flex: 1, height: '38px', fontSize: '13px', padding: '0 12px' }} 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="PENDING">Chờ phân công</option>
            <option value="ASSIGNED">Đã phân công</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="ON_HOLD">Tạm dừng</option>
            <option value="COMPLETED">Chờ xưởng nghiệm thu</option>
            <option value="INSPECTION">Chờ QA nghiệm thu</option>
            <option value="VERIFIED">Đã nghiệm thu (QA)</option>
            <option value="CLOSED">Đã đóng</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Bộ phận phụ trách Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Bộ phận phụ trách:</label>
          <select 
            className="form-select" 
            style={{ flex: 1, height: '38px', fontSize: '13px', padding: '0 12px' }} 
            value={handlerTeamFilter} 
            onChange={(e) => setHandlerTeamFilter(e.target.value)}
          >
            <option value="">-- Tất cả bộ phận --</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách phiếu sửa chữa...</div>
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
                  <th style={{ textAlign: 'center', minWidth: '130px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Không có phiếu sửa chữa nào được tìm thấy
                    </td>
                  </tr>
                ) : workOrders.map((wo) => (
                  <tr key={wo.id}>
                    <td 
                      style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}
                      onClick={() => setSelectedDetailWoId(wo.id)}
                    >
                      {wo.orderCode}
                    </td>
                    <td 
                      style={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setSelectedDetailWoId(wo.id)}
                    >
                      {wo.title}
                    </td>
                    <td>{wo.equipment?.name || '---'}</td>
                    <td>
                      <StatusBadge status={wo.status} />
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
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        {['PENDING', 'ASSIGNED'].includes(wo.status) && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '12px', fontWeight: 600 }}
                            title="Bắt đầu thực hiện công việc"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickStart(wo);
                            }}
                          >
                            <Play size={12} /> Bắt đầu
                          </button>
                        )}

                        {wo.status === 'IN_PROGRESS' && (
                          <>
                            <button
                              className="btn btn-warning btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '12px', fontWeight: 600 }}
                              title="Tạm dừng công việc"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickPause(wo);
                              }}
                            >
                              <Pause size={12} /> Tạm dừng
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '12px', fontWeight: 600 }}
                              title="Xem chi tiết để hoàn thành / bàn giao"
                              onClick={() => setSelectedDetailWoId(wo.id)}
                            >
                              <CheckCircle2 size={12} /> Hoàn thành
                            </button>
                          </>
                        )}

                        {wo.status === 'ON_HOLD' && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '12px', fontWeight: 600 }}
                            title="Tiếp tục thực hiện"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickResume(wo);
                            }}
                          >
                            <Play size={12} /> Tiếp tục
                          </button>
                        )}

                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 9px', fontSize: '12px', fontWeight: 600 }}
                          title="Xem chi tiết & xử lý"
                          onClick={() => setSelectedDetailWoId(wo.id)}
                        >
                          <Eye size={13} /> Chi tiết
                        </button>
                        {canDeleteWo && (
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 8px', color: '#dc2626', borderColor: '#fca5a5' }}
                            title="Xóa phiếu sửa chữa (Quản trị viên)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWo(wo);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
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
                Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{total}</strong> phiếu sửa chữa
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
      </>
      ) : (
        <div className="master-detail-container">
        
        {/* Master List Pane */}
        <div className={`master-pane ${selectedDetailWoId ? 'has-selection' : ''}`}>    
            {/* Header Left */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="page-title" style={{ fontSize: '20px', margin: 0 }}>Danh sách phiếu</h1>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedDetailWoId(null)} title="Đóng chi tiết" style={{ padding: '6px 10px' }}>
                  <ChevronLeft size={16} /> Trở về
                </button>
              </div>
            </div>

            {/* List Cards */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>Đang tải danh sách...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '16px' }}>
                {workOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: '13px' }}>
                    Không có phiếu bảo trì nào
                  </div>
                ) : workOrders.map((wo) => (
                  <div 
                    key={wo.id}
                    onClick={() => setSelectedDetailWoId(wo.id)}
                    style={{ 
                      padding: '16px', 
                      borderRadius: '8px', 
                      border: selectedDetailWoId === wo.id ? '2px solid #2563eb' : '1px solid var(--border-color)',
                      backgroundColor: selectedDetailWoId === wo.id ? '#eff6ff' : 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedDetailWoId === wo.id ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>{wo.orderCode}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={wo.status} />
                        {canDeleteWo && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="Xóa phiếu (Quản trị viên)"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWo(wo);
                            }}
                            style={{ padding: '3px 5px', borderRadius: '4px', color: '#dc2626', border: '1px solid #fca5a5', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{wo.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <LayoutGrid size={12} /> {wo.equipment?.name || '---'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <List size={12} /> {wo.technicianName || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {total > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingTop: '12px', 
                borderTop: '1px solid var(--border-color)' 
              }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Trang {page} / {totalPages}
                </span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lề phải: Detail View */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <WorkOrderDetailView
              workOrderId={selectedDetailWoId}
              onStatusChangeSuccess={() => loadData()}
              currentUser={currentUser}
              onClose={() => setSelectedDetailWoId(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Create Work Order */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo phiếu sửa chữa (Work Order)">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Tiêu đề công việc *</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              placeholder="Mô tả ngắn gọn công việc (VD: Thay vòng bi trục chính, Sửa rò rỉ khí nén...)" 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Thiết bị *</label>
              <select 
                className="form-select" 
                required 
                value={formData.equipmentId} 
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
              >
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>[{eq.code}] {eq.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Loại công việc</label>
              <select 
                className="form-select" 
                value={formData.workOrderType} 
                onChange={(e) => setFormData({ ...formData, workOrderType: e.target.value })}
              >
                <option value="Sửa chữa">Sửa chữa</option>
                <option value="Bảo trì phòng ngừa">Bảo trì phòng ngừa</option>
                <option value="Kiểm tra">Kiểm tra</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Mức ưu tiên</label>
              <select 
                className="form-select" 
                value={formData.priority} 
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kỹ thuật viên phụ trách</label>
              <select
                className="form-select"
                value={formData.technicianName}
                onChange={(e) => setFormData({ ...formData, technicianName: e.target.value })}
              >
                <option value="">-- Chưa phân công --</option>
                {techniciansList.map((tech) => (
                  <option key={tech.id} value={tech.name}>
                    {tech.name} ({tech.specialty || tech.role || 'KTV'}) - {tech.department || 'Chưa rõ'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả sự cố / nội dung công việc *</label>
            <textarea 
              className="form-textarea" 
              rows={3} 
              required 
              placeholder="Mô tả chi tiết vấn đề hoặc các hạng mục cần thao tác xử lý..." 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> Tạo phiếu sửa chữa
            </button>
          </div>
        </form>
      </Modal>

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

      {/* 4. QR Scanner Modal */}
      {isQrScannerOpen && (
        <Modal
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          title="Quét mã thiết bị"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <QRScanner
              onScanSuccess={(decodedText) => {
                setIsQrScannerOpen(false);
                handleDeviceIdentified(decodedText, 'QR_SCAN');
              }}
              onClose={() => setIsQrScannerOpen(false)}
            />
            
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Nhập mã thiết bị thủ công</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: EQ-001..."
                  value={manualDeviceCode}
                  onChange={(e) => setManualDeviceCode(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (manualDeviceCode.trim()) {
                      setIsQrScannerOpen(false);
                      handleDeviceIdentified(manualDeviceCode.trim(), 'MANUAL_ENTRY');
                    } else {
                      toast.error('Nhập mã', 'Vui lòng nhập mã thiết bị.');
                    }
                  }}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Multiple WOs Selector Modal */}
      {isSelectWoOpen && (
        <Modal
          isOpen={isSelectWoOpen}
          onClose={() => setIsSelectWoOpen(false)}
          title="Chọn Work Order đang được phân công"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Thiết bị có nhiều hơn 1 công việc được phân công cho bạn. Vui lòng chọn công việc để tiếp tục:</p>
            <div className="table-wrapper">
              <table className="custom-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Mã WO</th>
                    <th>Mô tả sự cố</th>
                    <th>Mức độ ưu tiên</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {multipleWosList.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{item.orderCode}</td>
                      <td>{item.title}</td>
                      <td><span className={`badge badge-${item.priority === 'HIGH' || item.priority === 'URGENT' ? 'danger' : 'warning'}`}>{item.priority}</span></td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setIsSelectWoOpen(false);
                            setSelectedDetailWoId(item.id);
                          }}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Quick Pause Modal */}
      {woToPause && (
        <Modal
          isOpen={Boolean(woToPause)}
          onClose={() => !isPausing && setWoToPause(null)}
          title={`Tạm dừng phiếu: ${woToPause.orderCode}`}
          maxWidth="480px"
        >
          <form onSubmit={confirmQuickPause} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Vui lòng cung cấp lý do tạm dừng thực hiện công việc bảo trì cho thiết bị <strong>{woToPause.equipment?.name || '---'}</strong>:
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {[
                  'Chờ phụ tùng',
                  'Chờ dừng máy sản xuất',
                  'Chờ bàn giao ca',
                  'Cần chuyên gia kỹ thuật hỗ trợ'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      borderColor: pauseReason === preset ? '#f59e0b' : undefined,
                      backgroundColor: pauseReason === preset ? 'rgba(245, 158, 11, 0.15)' : undefined,
                      color: pauseReason === preset ? '#d97706' : undefined,
                      fontWeight: pauseReason === preset ? 600 : 400
                    }}
                    onClick={() => setPauseReason(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                className="form-input"
                rows={3}
                placeholder="Nhập chi tiết lý do tạm dừng..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
                autoFocus
              />
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isPausing}
                onClick={() => setWoToPause(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-warning"
                disabled={isPausing || !pauseReason.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Pause size={14} /> {isPausing ? 'Đang cập nhật...' : 'Xác nhận tạm dừng'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Delete Confirmation Modal */}
      {woToDelete && (
        <Modal
          isOpen={Boolean(woToDelete)}
          onClose={() => !isDeleting && setWoToDelete(null)}
          title="Xác nhận xóa phiếu sửa chữa"
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px' 
            }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa phiếu sửa chữa <strong style={{ color: '#ef4444' }}>{woToDelete.orderCode}</strong>?
                <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  Tiêu đề: <strong>{woToDelete.title}</strong>
                </div>
                {woToDelete.equipment?.name && (
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Thiết bị: <strong>{woToDelete.equipment.name}</strong>
                  </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
                  ⚠️ Lưu ý: Mọi nhật ký thao tác, checklist và dữ liệu vật tư đính kèm sẽ bị xóa. Hành động này không thể hoàn tác!
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeleting}
                onClick={() => setWoToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeleting}
                onClick={confirmDeleteWo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
