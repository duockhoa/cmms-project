import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';

export interface FabricationJobItem {
  id: string;
  orderCode: string;
  title: string;
  category: 'FABRICATION' | 'NEW_MAKING' | 'MODIFICATION' | 'INSTALLATION' | 'INFRASTRUCTURE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
  description: string;
  specifications?: string | null;
  location?: string | null;
  targetDepartment?: string | null;
  equipmentId?: string | null;
  equipment?: { id: string; code: string; name: string; location?: string } | null;
  assignedTechnicianId?: string | null;
  assignedTechnician?: { id: string; name: string; email?: string; specialty?: string; avatar?: string } | null;
  supporterIds?: string | null;
  creatorId?: string | null;
  creator?: { id: string; name: string; email?: string } | null;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  estimatedHours: number;
  actualHours: number;
  drawings?: string | null;
  resultImages?: string | null;
  resultNotes?: string | null;
  acceptanceRating?: string | null;
  acceptedByName?: string | null;
  acceptedAt?: string | null;
  totalCost: number;
  materials?: Array<{
    id?: string;
    materialName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export function useFabricationPage() {
  const [jobs, setJobs] = useState<FabricationJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Catalogs
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FabricationJobItem | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    closed: 0,
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFabricationOrders({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: searchTerm.trim() || undefined,
      });
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách gia công:', err);
      toast.error('Lỗi', 'Không thể tải danh sách gia công và chế tạo');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getFabricationStats();
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.warn('Lỗi khi lấy thống kê gia công:', err);
    }
  }, []);

  const [departments, setDepartments] = useState<string[]>([]);

  const fetchCatalogs = useCallback(async () => {
    try {
      const [techData, eqData, deptsData] = await Promise.all([
        api.getUsers({ department: 'xưởng cơ điện' }),
        api.catalog.getEquipment(),
        api.getDepartments(),
      ]);
      setTechnicians(Array.isArray(techData) ? techData : []);
      setEquipments(Array.isArray(eqData) ? eqData : (eqData?.items || []));
      setDepartments(Array.isArray(deptsData) ? deptsData : []);
    } catch (err) {
      console.warn('Lỗi khi tải danh mục hỗ trợ:', err);
    }
  }, []);

  const handleDepartmentChange = async (department: string) => {
    try {
      const data = await api.getUsers({ department: department || undefined });
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Lỗi khi đổi bộ phận:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, [fetchJobs, fetchStats]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const resetFilters = useCallback(() => {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchTerm('');
  }, []);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    fetchJobs();
    fetchStats();
    toast.success('Thành công', 'Đã tạo và phân công việc gia công/chế tạo mới');
  };

  const handleUpdateSuccess = (updated?: any) => {
    if (updated) {
      setSelectedJob(updated);
    }
    fetchJobs();
    fetchStats();
    toast.success('Thành công', 'Đã cập nhật phiếu gia công/chế tạo');
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm(
      'Xác nhận xóa phiếu',
      'Bạn có chắc chắn muốn xóa phiếu gia công/chế tạo này không? Hành động này không thể hoàn tác.',
      {
        confirmText: 'Xóa phiếu',
        cancelText: 'Hủy',
        type: 'danger',
      }
    );
    if (!ok) return;

    try {
      await api.deleteFabricationOrder(id);
      toast.success('Đã xóa', 'Phiếu công việc đã được xóa thành công');
      if (selectedJob?.id === id) {
        setSelectedJob(null);
      }
      fetchJobs();
      fetchStats();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể xóa phiếu công việc');
    }
  };

  return {
    jobs,
    loading,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    resetFilters,
    fetchJobs,
    stats,
    technicians,
    equipments,
    departments,
    handleDepartmentChange,

    // Modal states
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedJob,
    setSelectedJob,
    handleCreateSuccess,
    handleUpdateSuccess,
    handleDelete,
  };
}
