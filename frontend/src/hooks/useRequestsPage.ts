import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { usePermissions } from './usePermissions';

export function useRequestsPage() {
  const { can } = usePermissions();
  const canEdit = can('requests:edit');
  const canDelete = can('requests:delete');
  const [searchParams] = useSearchParams();

  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [functionalUnits, setFunctionalUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Detail state for Split Pane layout (initialize from ?id= if present)
  const [selectedDetailReqId, setSelectedDetailReqId] = useState<string | null>(searchParams.get('id') || null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    equipmentId: '',
    functionalUnitId: '',
    title: '',
    description: '',
    priority: 'HIGH',
  });
  const [editFunctionalUnits, setEditFunctionalUnits] = useState<any[]>([]);
  const [loadingEditUnits, setLoadingEditUnits] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modal State
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    equipmentId: '',
    functionalUnitId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    reporterName: '',
    department: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, eqRes, userRes, meRes] = await Promise.all([
        api.getRequests({ status: statusFilter }),
        api.getEquipment(),
        api.getUsers().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setRequests(reqRes);
      setEquipmentList(eqRes);
      setUsers(userRes);

      if (meRes && meRes.authenticated) {
        setCurrentUser(meRes.user);
        setFormData((prev) => ({
          ...prev,
          reporterName: meRes.user.name,
          department: meRes.user.department || '',
        }));
      }

      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({
          ...prev,
          equipmentId: eqRes[0].id,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const handleQRScan = useCallback((decodedText: string) => {
    let rawCode = (decodedText || '')
      .replace(/^cmms-equipment:/i, '')
      .replace(/^equipment:/i, '')
      .trim();

    // Tách mã máy nếu quét chuỗi dạng Mã$Tên_Máy (VD: TBSX412$Máy_Rửa_Lọ)
    if (rawCode.includes('$')) {
      rawCode = rawCode.split('$')[0].trim();
    }

    const matched = equipmentList.find(
      (e) =>
        e.code?.toLowerCase() === rawCode.toLowerCase() ||
        e.id === rawCode ||
        e.accountingCode?.toLowerCase() === rawCode.toLowerCase()
    );

    if (matched) {
      setFormData((prev) => ({ ...prev, equipmentId: matched.id, functionalUnitId: '' }));
      toast.success('Nhận diện thiết bị thành công', `Thiết bị: ${matched.name} (${matched.code})`);
      setShowScanner(false);
    } else {
      toast.error('Thiết bị không tồn tại', `Mã quét [${rawCode}] không tồn tại trong danh mục thiết bị.`);
    }
  }, [equipmentList, toast]);

  // Tải danh sách cụm chức năng theo thiết bị được chọn
  useEffect(() => {
    if (!formData.equipmentId) {
      setFunctionalUnits([]);
      return;
    }
    let isMounted = true;
    const fetchUnits = async () => {
      try {
        setLoadingUnits(true);
        const res = await api.getEquipmentFunctionalUnits(formData.equipmentId);
        if (isMounted) {
          setFunctionalUnits(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (isMounted) setFunctionalUnits([]);
      } finally {
        if (isMounted) setLoadingUnits(false);
      }
    };
    fetchUnits();
    return () => {
      isMounted = false;
    };
  }, [formData.equipmentId]);

  // Tải danh sách cụm chức năng theo thiết bị được chọn trong Edit modal
  useEffect(() => {
    if (!editFormData.equipmentId) {
      setEditFunctionalUnits([]);
      return;
    }
    let isMounted = true;
    const fetchUnits = async () => {
      try {
        setLoadingEditUnits(true);
        const res = await api.getEquipmentFunctionalUnits(editFormData.equipmentId);
        if (isMounted) {
          setEditFunctionalUnits(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (isMounted) setEditFunctionalUnits([]);
      } finally {
        if (isMounted) setLoadingEditUnits(false);
      }
    };
    fetchUnits();
    return () => {
      isMounted = false;
    };
  }, [editFormData.equipmentId]);

  const getActiveUserId = useCallback(() => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  }, [users]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setSelectedDetailReqId(idFromUrl);
    }
  }, [searchParams]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId) {
      toast.warning('Cảnh báo', 'Vui lòng chọn thiết bị gặp sự cố!');
      return;
    }
    const cleanTitle = (formData.title || '').trim();
    const cleanDesc = (formData.description || '').trim();
    if (!cleanTitle) {
      toast.warning('Cảnh báo', 'Tiêu đề sự cố không được để trống!');
      return;
    }
    if (!cleanDesc) {
      toast.warning('Cảnh báo', 'Mô tả hiện trạng hư hỏng không được để trống!');
      return;
    }

    try {
      await api.createRequest({
        equipmentId: formData.equipmentId,
        title: cleanTitle,
        description: cleanDesc,
        priority: formData.priority || 'HIGH',
        reporterId: currentUser?.id || undefined,
        reporterName: currentUser?.name || undefined,
        department: currentUser?.department || undefined,
        functionalUnitId: formData.functionalUnitId?.trim() || undefined,
      });
      setIsAddOpen(false);
      setFormData({
        equipmentId: equipmentList[0]?.id || '',
        functionalUnitId: '',
        title: '',
        description: '',
        priority: 'HIGH',
        reporterName: currentUser?.name || '',
        department: currentUser?.department || '',
      });
      toast.success('Thành công', 'Đã gửi báo cáo sự cố!');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể tạo yêu cầu bảo trì!');
    }
  }, [formData, currentUser, equipmentList, toast, loadData]);

  const openEditModal = useCallback((req: any) => {
    setEditingReq(req);
    setEditFormData({
      equipmentId: req.equipmentId || '',
      functionalUnitId: req.functionalUnitId || '',
      title: req.title || '',
      description: req.description || '',
      priority: req.priority || 'HIGH',
    });
    setIsEditOpen(true);
  }, []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    try {
      setIsSubmittingEdit(true);
      await api.updateRequest(editingReq.id, {
        equipmentId: editFormData.equipmentId,
        functionalUnitId: editFormData.functionalUnitId || null,
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        priority: editFormData.priority,
      });
      setIsEditOpen(false);
      setEditingReq(null);
      toast.success('Thành công', `Đã cập nhật yêu cầu sự cố ${editingReq.requestCode}`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err?.message || 'Không thể cập nhật yêu cầu sự cố!');
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [editingReq, editFormData, toast, loadData]);

  const openDeleteConfirm = useCallback((req: any) => {
    setDeleteConfirmReq(req);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmReq) return;
    try {
      setIsDeleting(true);
      await api.deleteRequest(deleteConfirmReq.id);
      toast.success('Thành công', `Đã xóa yêu cầu sự cố ${deleteConfirmReq.requestCode}`);
      if (selectedDetailReqId === deleteConfirmReq.id) {
        setSelectedDetailReqId(null);
      }
      setDeleteConfirmReq(null);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa', err?.message || 'Không thể xóa yêu cầu sự cố!');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmReq, selectedDetailReqId, toast, loadData]);

  const isReqLocked = useCallback((req: any) => {
    if (!req) return false;
    return req.status === 'CLOSED' || (req.workOrders && req.workOrders.length > 0);
  }, []);

  return {
    // Permissions
    canEdit,
    canDelete,

    // Data
    requests,
    equipmentList,
    users,
    currentUser,
    loading,

    // Filters
    statusFilter,
    setStatusFilter,

    // Detail pane
    selectedDetailReqId,
    setSelectedDetailReqId,

    // Create modal
    isAddOpen,
    setIsAddOpen,
    showScanner,
    setShowScanner,
    formData,
    setFormData,
    functionalUnits,
    loadingUnits,
    handleQRScan,
    handleCreate,

    // Edit modal
    isEditOpen,
    setIsEditOpen,
    editingReq,
    setEditingReq,
    editFormData,
    setEditFormData,
    editFunctionalUnits,
    loadingEditUnits,
    isSubmittingEdit,
    openEditModal,
    handleUpdate,

    // Delete modal
    deleteConfirmReq,
    setDeleteConfirmReq,
    isDeleting,
    openDeleteConfirm,
    handleDelete,

    // Helpers
    isReqLocked,
    loadData,
  };
}
