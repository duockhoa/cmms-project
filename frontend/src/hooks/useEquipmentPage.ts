import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { useModal } from './useModal';
import { printBatchQRTags, printSingleQRTag } from '../utils/qrPrintHelper';

export function useEquipmentPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllTotal, setIsSelectAllTotal] = useState(false);
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const equipmentModal = useModal<any>();
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const loadEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/v1/equipment`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (search) url.searchParams.append('search', search);
      if (categoryFilter) url.searchParams.append('category', categoryFilter);
      if (departmentFilter) url.searchParams.append('department', departmentFilter);
      if (statusFilter) url.searchParams.append('status', statusFilter);

      const response = await fetchWithAuth(url.toString());
      if (!response.ok) throw new Error('Không thể tải danh sách thiết bị');
      const result = await response.json();

      if (result && result.data && Array.isArray(result.data)) {
        setEquipment(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } else if (Array.isArray(result)) {
        setEquipment(result);
        setTotal(result.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, departmentFilter, statusFilter, page, limit]);

  useEffect(() => {
    loadEquipment();
  }, [search, categoryFilter, departmentFilter, statusFilter, page]);

  useEffect(() => {
    // Fetch categories and departments for filter dropdown on mount
    fetchWithAuth(`${API_BASE}/api/v1/equipment-categories`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setCategoriesList(data))
      .catch(err => console.error(err));

    api.getDepartments()
      .then((depts: string[]) => {
        setDepartmentsList(depts || []);
      })
      .catch(err => console.error(err));
  }, []);

  const handleFilterChange = useCallback((setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  }, []);

  const exportEquipment = useCallback(async () => {
    const url = new URL(`${API_BASE}/api/v1/equipment`);
    url.searchParams.append('page', '1');
    url.searchParams.append('limit', '10000');
    if (search) url.searchParams.append('search', search);
    if (categoryFilter) url.searchParams.append('category', categoryFilter);
    if (departmentFilter) url.searchParams.append('department', departmentFilter);
    if (statusFilter) url.searchParams.append('status', statusFilter);

    const response = await fetchWithAuth(url.toString());
    if (!response.ok) throw new Error('Không thể tải dữ liệu thiết bị để xuất');
    const result = await response.json();
    const rows = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];

    return {
      filename: `Danh_sach_thiet_bi_${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        { key: 'code', label: 'Mã thiết bị' },
        { key: 'name', label: 'Tên thiết bị' },
        { key: 'category', label: 'Loại' },
        { key: 'department', label: 'Bộ phận' },
        { key: 'location', label: 'Vị trí' },
        { key: 'serialNumber', label: 'Số serial' },
        { key: 'status', label: 'Trạng thái' },
      ],
      data: rows,
    };
  }, [search, categoryFilter, departmentFilter, statusFilter]);

  const handleFormSubmit = useCallback(async (finalFormData: any) => {
    try {
      if (equipmentModal.data) {
        // Edit mode: PATCH
        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment/${equipmentModal.data.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            code: finalFormData.code ? finalFormData.code.trim() : undefined,
            name: finalFormData.name,
            category: finalFormData.category,
            department: finalFormData.department || undefined,
            status: finalFormData.status,
            location: finalFormData.location,
            serialNumber: finalFormData.serialNumber,
            specs: finalFormData.specs,
            accountingCode: finalFormData.accountingCode || undefined,
            functionalUnit: finalFormData.functionalUnit || undefined,
            expectedVersion: equipmentModal.data.version,
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể chỉnh sửa thiết bị');
        }
        toast.success('Cập nhật thành công', 'Thông tin thiết bị đã được cập nhật.');
      } else {
        // Create mode: POST
        const createPayload: any = {
          ...finalFormData,
        };
        if (!createPayload.code) delete createPayload.code;
        if (!createPayload.accountingCode) delete createPayload.accountingCode;

        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment`, {
          method: 'POST',
          body: JSON.stringify(createPayload)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tạo thiết bị');
        }
        toast.success('Thêm thành công', 'Thiết bị mới đã được tạo.');
      }
      equipmentModal.close();
      loadEquipment();
    } catch (err: any) {
      toast.error('Thao tác thất bại', err.message || 'Có lỗi xảy ra!');
    }
  }, [equipmentModal.data, toast, loadEquipment]);

  const handleDelete = useCallback(async (eqId: string) => {
    const ok = await confirm('Xóa thiết bị', 'Thiết bị sẽ bị vô hiệu hóa và không còn hiển thị trong danh sách. Bạn có chắc chắn?', { confirmText: 'Xóa', type: 'danger' });
    if (!ok) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment/${eqId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Lỗi xóa thiết bị (HTTP ${res.status})`);
      }
      toast.success('Đã xóa', 'Thiết bị đã được xóa khỏi hệ thống.');
      loadEquipment();
    } catch (err: any) {
      toast.error('Xóa thất bại', err.message || 'Có lỗi xảy ra khi xóa thiết bị');
    }
  }, [confirm, toast, loadEquipment]);

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const toggleSelectOne = useCallback((itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelectAllTotal(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const isAllPageSelected = equipment.length > 0 && equipment.every(item => selectedIds.has(item.id));
  const toggleSelectAll = useCallback(() => {
    if (isAllPageSelected || isSelectAllTotal) {
      setSelectedIds(new Set());
      setIsSelectAllTotal(false);
    } else {
      setSelectedIds(new Set(equipment.map(item => item.id)));
    }
  }, [isAllPageSelected, isSelectAllTotal, equipment]);

  // In toàn bộ thiết bị (có thể theo bộ lọc hiện tại hoặc toàn bộ 300+ thiết bị trong hệ thống)
  const handlePrintAll = useCallback(async (onlyCurrentFilter: boolean = false) => {
    try {
      setIsPrintingAll(true);
      toast.info(
        'Đang khởi tạo tem QR...',
        `Đang tải toàn bộ dữ liệu thiết bị và tạo tem in A4 offline...`
      );

      const url = new URL(`${API_BASE}/api/v1/equipment`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '5000'); // Tải toàn bộ lên tới 5000 thiết bị

      if (onlyCurrentFilter) {
        if (search) url.searchParams.append('search', search);
        if (categoryFilter) url.searchParams.append('category', categoryFilter);
        if (departmentFilter) url.searchParams.append('department', departmentFilter);
        if (statusFilter) url.searchParams.append('status', statusFilter);
      }

      const response = await fetchWithAuth(url.toString());
      if (!response.ok) throw new Error('Không thể tải danh sách thiết bị');
      const result = await response.json();
      const allItems: any[] = (result && result.data && Array.isArray(result.data))
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      if (allItems.length === 0) {
        toast.error('Không tìm thấy thiết bị nào để in!');
        return;
      }

      const printItems = allItems.map(item => {
        const code = (item.code || item.id || '').trim();
        const nameFormatted = (item.name || '').trim().replace(/\s+/g, '_');
        return {
          name: item.name,
          code,
          location: item.location || '',
          qrPayload: nameFormatted ? `${code}$${nameFormatted}` : code,
        };
      });

      await printBatchQRTags({
        title: onlyCurrentFilter 
          ? `Danh sách Mã QR Thiết Bị Theo Bộ Lọc (${printItems.length} thiết bị)`
          : `Danh sách Mã QR Toàn Bộ Thiết Bị (${printItems.length} thiết bị)`,
        items: printItems,
        columns: 3, // Khổ A4 tiêu chuẩn 3 cột x 4 hàng = 12 tem/trang
      });
      toast.success('Đã mở cửa sổ in', `Sẵn sàng in ${printItems.length} tem QR trên khổ A4.`);
    } catch (err: any) {
      console.error('Lỗi khi in toàn bộ thiết bị:', err);
      toast.error('Lỗi in ấn', err?.message || 'Có lỗi xảy ra khi tạo danh sách tem in.');
    } finally {
      setIsPrintingAll(false);
    }
  }, [search, categoryFilter, departmentFilter, statusFilter, toast]);

  // In các thiết bị đang được tick chọn
  const handlePrintSelected = useCallback(async () => {
    if (isSelectAllTotal) {
      return handlePrintAll(true);
    }

    const targetItems = equipment.filter(item => selectedIds.has(item.id));
    if (targetItems.length === 0) {
      toast.error('Chưa có thiết bị nào được chọn!');
      return;
    }

    const printItems = targetItems.map(item => {
      const code = (item.code || item.id || '').trim();
      const nameFormatted = (item.name || '').trim().replace(/\s+/g, '_');
      return {
        name: item.name,
        code,
        location: item.location || '',
        qrPayload: nameFormatted ? `${code}$${nameFormatted}` : code,
      };
    });

    await printBatchQRTags({
      title: `Danh sách Mã QR Thiết Bị Đã Chọn (${printItems.length} thiết bị)`,
      items: printItems,
      columns: 3,
    });
  }, [isSelectAllTotal, equipment, selectedIds, toast, handlePrintAll]);

  const handlePrintSingle = useCallback((item: any) => {
    const code = (item.code || item.id || '').trim();
    const nameFormatted = (item.name || '').trim().replace(/\s+/g, '_');
    printSingleQRTag({
      name: item.name,
      code,
      location: item.location,
      qrPayload: nameFormatted ? `${code}$${nameFormatted}` : code,
    });
    setActiveActionMenu(null);
  }, []);

  const hasActiveFilter = Boolean(search || categoryFilter || departmentFilter || statusFilter);

  return {
    // Navigation
    navigate,

    // Data
    equipment,
    loading,
    total,
    totalPages,

    // Filters
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    categoriesList,
    departmentsList,
    hasActiveFilter,
    handleFilterChange,

    // Pagination
    page,
    setPage,
    limit,
    startItem,
    endItem,

    // Selection
    selectedIds,
    setSelectedIds,
    isSelectAllTotal,
    setIsSelectAllTotal,
    isAllPageSelected,
    toggleSelectOne,
    toggleSelectAll,

    // Print
    isPrintingAll,
    handlePrintAll,
    handlePrintSelected,
    handlePrintSingle,

    // Modal
    equipmentModal,
    activeActionMenu,
    setActiveActionMenu,

    // CRUD
    exportEquipment,
    handleFormSubmit,
    handleDelete,
    loadEquipment,
  };
}
