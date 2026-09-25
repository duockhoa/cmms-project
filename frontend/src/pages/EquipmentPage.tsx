import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, MoreHorizontal, Eye, Trash2, Edit, ChevronLeft, ChevronRight, Printer, CheckSquare } from 'lucide-react';
import { EquipmentDetailPage } from './EquipmentDetailPage';
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { TableSkeleton } from '../components/common/Skeleton';
import { printBatchQRTags, printSingleQRTag } from '../utils/qrPrintHelper';
import { Pagination } from '../components/common/Pagination';

export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/v1/equipment`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
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
  };

  useEffect(() => {
    loadEquipment();
  }, [debouncedSearch, categoryFilter, departmentFilter, statusFilter, page]);

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

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const handleFormSubmit = async (finalFormData: any) => {
    try {
      if (editItem) {
        // Edit mode: PATCH
        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment/${editItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: finalFormData.name,
            category: finalFormData.category,
            department: finalFormData.department || undefined,
            status: finalFormData.status,
            location: finalFormData.location,
            serialNumber: finalFormData.serialNumber,
            specs: finalFormData.specs,
            accountingCode: finalFormData.accountingCode || undefined,
            functionalUnit: finalFormData.functionalUnit || undefined,
            expectedVersion: editItem.version,
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
      handleCloseModal();
      loadEquipment();
    } catch (err: any) {
      toast.error('Thao tác thất bại', err.message || 'Có lỗi xảy ra!');
    }
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setEditItem(null);
  };

  const handleDelete = async (eqId: string) => {
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
  };

  if (id) {
    return <EquipmentDetailPage item={{ id }} onBack={() => navigate('/equipment')} />;
  }

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const toggleSelectOne = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelectAllTotal(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const isAllPageSelected = equipment.length > 0 && equipment.every(item => selectedIds.has(item.id));
  const toggleSelectAll = () => {
    if (isAllPageSelected || isSelectAllTotal) {
      setSelectedIds(new Set());
      setIsSelectAllTotal(false);
    } else {
      setSelectedIds(new Set(equipment.map(item => item.id)));
    }
  };

  // In toàn bộ thiết bị (có thể theo bộ lọc hiện tại hoặc toàn bộ 300+ thiết bị trong hệ thống)
  const handlePrintAll = async (onlyCurrentFilter: boolean = false) => {
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
        if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
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
  };

  // In các thiết bị đang được tick chọn
  const handlePrintSelected = async () => {
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
  };

  const hasActiveFilter = Boolean(debouncedSearch || categoryFilter || departmentFilter || statusFilter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thiết bị</h1>
          <p className="page-subtitle">Quản lý thông tin và tình trạng thiết bị</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Nút in các thiết bị được chọn (nếu có chọn) */}
          {(selectedIds.size > 0 || isSelectAllTotal) && (
            <button 
              className="btn btn-secondary" 
              onClick={handlePrintSelected}
              disabled={isPrintingAll}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#2563eb', color: '#2563eb', fontWeight: 600 }}
              title="Chỉ in tem cho các thiết bị đang được đánh dấu chọn"
            >
              <CheckSquare size={15} />
              <span>In Đã Chọn ({isSelectAllTotal ? total : selectedIds.size})</span>
            </button>
          )}

          {/* Nút In Toàn Bộ Tất Cả Thiết Bị */}
          <button 
            className="btn btn-secondary" 
            onClick={() => handlePrintAll(false)}
            disabled={isPrintingAll || total === 0}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}
            title="In mã QR cho TOÀN BỘ thiết bị trong cơ sở dữ liệu trên khổ giấy A4"
          >
            <Printer size={15} color="#2563eb" />
            <span>
              {isPrintingAll ? 'Đang chuẩn bị tem...' : `In Tất Cả QR (${total} Thiết Bị)`}
            </span>
          </button>

          {/* Nếu có bộ lọc thì cho phép in toàn bộ theo kết quả lọc */}
          {hasActiveFilter && (
            <button 
              className="btn btn-secondary" 
              onClick={() => handlePrintAll(true)}
              disabled={isPrintingAll || total === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              title="In tất cả thiết bị khớp với kết quả tìm kiếm/bộ lọc hiện tại"
            >
              <Printer size={14} />
              <span>In Kết Quả Lọc ({total})</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4 filter-bar-responsive">
        <div className="filter-search" style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px', width: '100%' }}
            placeholder="Tìm theo tên, số serial, vị trí..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
          />
        </div>

        <select className="form-select filter-item" value={categoryFilter} onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}>
          <option value="">Tất cả loại</option>
          {categoriesList.map((cat: any) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>

        <select className="form-select filter-item" value={departmentFilter} onChange={(e) => handleFilterChange(setDepartmentFilter, e.target.value)}>
          <option value="">Tất cả bộ phận</option>
          {departmentsList.map((dept: string) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select className="form-select filter-item" value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="OPERATIONAL">Hoạt động tốt</option>
          <option value="INCIDENT">Sự cố / Hỏng</option>
          <option value="UNDER_MAINTENANCE">Đang bảo trì / Sửa chữa</option>
          <option value="DISCOMMISSIONED">Ngừng sử dụng</option>
        </select>
      </div>

      {/* Table */}
      <div>
        {/* Selection Banner: Chọn toàn bộ thiết bị qua nhiều trang */}
        {isAllPageSelected && total > equipment.length && (
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '12px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#1e40af',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Đang chọn <strong>{equipment.length}</strong> thiết bị trên trang {page}.</span>
              {isSelectAllTotal ? (
                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                  ✓ Đã chọn TOÀN BỘ {total} thiết bị trong hệ thống.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSelectAllTotal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Chọn tất cả {total} thiết bị trong danh sách
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handlePrintAll(hasActiveFilter)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Printer size={13} />
                In Tem QR Cho Tất Cả {total} Thiết Bị
              </button>
              <button
                type="button"
                onClick={() => { setSelectedIds(new Set()); setIsSelectAllTotal(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline'
                }}
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={isAllPageSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    title="Chọn tất cả thiết bị trên trang này"
                  />
                </th>
                <th>Mã</th>
                <th>Tên thiết bị</th>
                <th>Loại</th>
                <th>Bộ phận</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th>Bảo trì tiếp</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton columns={9} rows={6} />
              ) : equipment.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    Không có thiết bị nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : equipment.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => navigate(`/equipment/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => toggleSelectOne(item.id, e as any)}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.code}</div>
                      {item.accountingCode && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.accountingCode}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
                    <td>
                      <span style={{ fontSize: '13px', color: item.department ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {item.department || '---'}
                      </span>
                    </td>
                    <td>{item.location}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {item.schedules?.[0]?.nextDueDate 
                        ? new Date(item.schedules[0].nextDueDate).toLocaleDateString('vi-VN') 
                        : 'Chưa lập lịch'}
                    </td>
                    <td 
                      style={{ textAlign: 'center', position: 'relative' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setActiveActionMenu(activeActionMenu === item.id ? null : item.id)}
                        style={{ padding: '4px 8px' }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {activeActionMenu === item.id && (
                        <div className="action-dropdown" style={{
                          position: 'absolute', right: '10px', top: '35px',
                          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                          zIndex: 100, display: 'flex', flexDirection: 'column', width: '140px', padding: '4px 0'
                        }}>
                          <button 
                            onClick={() => { navigate(`/equipment/${item.id}`); setActiveActionMenu(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                          >
                            <Eye size={12} /> Xem chi tiết
                          </button>
                          <button 
                            onClick={() => {
                              const code = (item.code || item.id || '').trim();
                              const nameFormatted = (item.name || '').trim().replace(/\s+/g, '_');
                              printSingleQRTag({
                                name: item.name,
                                code,
                                location: item.location,
                                qrPayload: nameFormatted ? `${code}$${nameFormatted}` : code,
                              });
                              setActiveActionMenu(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                          >
                            <Printer size={12} /> In tem QR
                          </button>
                          <button 
                            onClick={() => { setEditItem(item); setIsAddOpen(true); setActiveActionMenu(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                          >
                            <Edit size={12} /> Chỉnh sửa
                          </button>
                          <button 
                            onClick={() => { handleDelete(item.id); setActiveActionMenu(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--danger)' }}
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Responsive Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            itemName="thiết bị"
            onPageChange={setPage}
          />
        </div>

      {/* Modal Add/Edit Equipment */}
      <EquipmentFormModal 
        isOpen={isAddOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleFormSubmit} 
        initialData={editItem}
      />
    </div>
  );
};

export default EquipmentPage;
