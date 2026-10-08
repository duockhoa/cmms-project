import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, fetchWithAuth, API_HOST } from '../services/api';
import { useToast } from '../components/common/Toast';
import { usePermissions } from './usePermissions';

const API_BASE = API_HOST;

export const useWorkOrdersPage = () => {
  const { can, isAdmin } = usePermissions();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [handlerTeamFilter, setHandlerTeamFilter] = useState('');
  const [onlyMyWork, setOnlyMyWork] = useState(false);
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

  // THUẬT TOÁN TỐI ƯU HÓA: Precomputed Hash Map O(T)
  // Thay vì quét toàn bộ mảng woTransactions lặp đi lặp lại với O(M x T),
  // tính toán trước bảng tổng hợp xuất/trả với O(T) cho phép tra cứu tức thì O(1)
  const txSummaryByItemId = useMemo(() => {
    const map = new Map<string, { issued: number; returned: number }>();
    for (const t of woTransactions) {
      if (!t.workOrderItemId) continue;
      const cur = map.get(t.workOrderItemId) || { issued: 0, returned: 0 };
      if (t.transactionType === 'ISSUE') cur.issued += Number(t.quantity) || 0;
      if (t.transactionType === 'RETURN') cur.returned += Number(t.quantity) || 0;
      map.set(t.workOrderItemId, cur);
    }
    return map;
  }, [woTransactions]);

  // Return Item Form Modal
  const [returnItemTarget, setReturnItemTarget] = useState<any | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');

  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // QR and Detail states (initialize from ?id= if present)
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [manualDeviceCode, setManualDeviceCode] = useState('');
  const [multipleWosList, setMultipleWosList] = useState<any[]>([]);
  const [isSelectWoOpen, setIsSelectWoOpen] = useState(false);
  const [selectedDetailWoId, setSelectedDetailWoId] = useState<string | null>(searchParams.get('id') || null);

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

  // Load static catalogs (equipment, users, departments) ONCE on mount
  const loadCatalogs = async () => {
    try {
      const [eqRes, userRes, deptRes, meRes] = await Promise.all([
        api.getEquipment(),
        api.getUsers().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setEquipmentList(eqRes);
      setUsers(userRes);
      const activeUsers = Array.isArray(userRes) ? userRes.filter((u: any) => u.isActive !== false) : [];
      setTechniciansList(activeUsers);
      setDepartments(deptRes);
      if (meRes && meRes.user) {
        setCurrentUser(meRes.user);
      } else if (meRes) {
        setCurrentUser(meRes);
      }

      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load catalogs in WorkOrdersPage:', err);
    }
  };

  // Load Work Orders list with pagination & filters
  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/v1/work-orders`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) url.searchParams.append('search', search);
      if (handlerTeamFilter) url.searchParams.append('handlerTeam', handlerTeamFilter);
      if (statusFilter) url.searchParams.append('status', statusFilter);
      if (onlyMyWork && currentUser?.id) url.searchParams.append('technicianId', currentUser.id);

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

  const loadData = () => loadWorkOrders();

  const exportWorkOrders = async () => {
    const url = new URL(`${API_BASE}/api/v1/work-orders`);
    url.searchParams.append('page', '1');
    url.searchParams.append('limit', '10000');
    if (search) url.searchParams.append('search', search);
    if (handlerTeamFilter) url.searchParams.append('handlerTeam', handlerTeamFilter);
    if (statusFilter) url.searchParams.append('status', statusFilter);
    if (onlyMyWork && currentUser?.id) url.searchParams.append('technicianId', currentUser.id);

    const response = await fetchWithAuth(url.toString());
    if (!response.ok) throw new Error('Không thể tải dữ liệu phiếu sửa chữa để xuất');
    const result = await response.json();
    const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

    return {
      filename: `Phieu_sua_chua_${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        { key: 'orderCode', label: 'Mã phiếu' },
        { key: 'title', label: 'Tiêu đề' },
        { key: 'equipmentCode', label: 'Mã thiết bị' },
        { key: 'equipmentName', label: 'Tên thiết bị' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'priority', label: 'Ưu tiên' },
        { key: 'technicianName', label: 'Kỹ thuật viên' },
        { key: 'createdAt', label: 'Ngày tạo' },
      ],
      data: rows.map((item: any) => ({
        orderCode: item.orderCode,
        title: item.title,
        equipmentCode: item.equipment?.code || '',
        equipmentName: item.equipment?.name || '',
        status: item.status,
        priority: item.priority,
        technicianName: item.technicianName || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
      })),
    };
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [search, page, handlerTeamFilter, statusFilter, onlyMyWork, currentUser?.id]);

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setSelectedDetailWoId(idFromUrl);
    }
  }, [searchParams]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

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
    const summary = txSummaryByItemId.get(woItem.id) || { issued: 0, returned: 0 };
    const totalIssued = summary.issued;
    const totalReturned = summary.returned;
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

  const workOrdersViewModel = {
    can, isAdmin, workOrders, equipmentList, loading, toast, search, setSearch,
    statusFilter, setStatusFilter, handlerTeamFilter, setHandlerTeamFilter,
    onlyMyWork, setOnlyMyWork,
    departments, page, setPage, limit, total, totalPages, isAddOpen, setIsAddOpen,
    statusDropdownId, setStatusDropdownId, isChecklistOpen, setIsChecklistOpen,
    selectedChecklistWO, setSelectedChecklistWO, selectedMaterialWO,
    setSelectedMaterialWO, woTransactions, materialLoading, returnItemTarget,
    setReturnItemTarget, returnQuantity, setReturnQuantity, returnReason,
    setReturnReason, currentUser, isQrScannerOpen, setIsQrScannerOpen,
    manualDeviceCode, setManualDeviceCode, multipleWosList, isSelectWoOpen,
    setIsSelectWoOpen, selectedDetailWoId, setSelectedDetailWoId, woToPause,
    setWoToPause, pauseReason, setPauseReason, isPausing, woToDelete,
    setWoToDelete, isDeleting, canDeleteWo, formData, setFormData,
    techniciansList, loadData, exportWorkOrders, handleFilterChange, handleCreate,
    openMaterialModal, handleReturnClick, handleReturnSubmit, handleDeviceIdentified,
    handleQuickStart, handleQuickPause, confirmQuickPause, handleQuickResume,
    handleDeleteWo, confirmDeleteWo, startItem, endItem,
  };


  return workOrdersViewModel;
};
