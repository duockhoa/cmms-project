import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, MoreHorizontal, Eye, Trash2, Edit, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { EquipmentDetailPage } from './EquipmentDetailPage';
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { TableSkeleton } from '../components/common/Skeleton';
import { printBatchQRTags, printSingleQRTag } from '../utils/qrPrintHelper';

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
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const isAllPageSelected = equipment.length > 0 && equipment.every(item => selectedIds.has(item.id));
  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(equipment.map(item => item.id)));
    }
  };

  const handlePrintBatch = () => {
    const targetItems = selectedIds.size > 0
      ? equipment.filter(item => selectedIds.has(item.id))
      : equipment;

    if (targetItems.length === 0) {
      toast.error('Không có thiết bị nào để in!');
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

    printBatchQRTags({
      title: 'Danh sách Mã QR Thiết bị',
      items: printItems,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thiết bị</h1>
          <p className="page-subtitle">Quản lý thông tin và tình trạng thiết bị</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePrintBatch}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="In nhiều tem QR trên giấy A4 có đường cắt phân tách"
          >
            <Printer size={15} />
            <span>In tem QR hàng loạt {selectedIds.size > 0 ? `(${selectedIds.size})` : `(${equipment.length})`}</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo tên, số serial, vị trí..."
            value={search}
            onChange={(e) => handleFilterChange(setSearch, e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: '160px' }} value={categoryFilter} onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}>
          <option value="">Tất cả loại</option>
          {categoriesList.map((cat: any) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: '170px' }} value={departmentFilter} onChange={(e) => handleFilterChange(setDepartmentFilter, e.target.value)}>
          <option value="">Tất cả bộ phận</option>
          {departmentsList.map((dept: string) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: '160px' }} value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="OPERATIONAL">Hoạt động</option>
          <option value="REPAIRING">Đang sửa chữa</option>
          <option value="UNDER_MAINTENANCE">Cảnh báo</option>
          <option value="INCIDENT">Nguy hiểm</option>
        </select>
      </div>

      {/* Table */}
      <div>
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
                Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{total}</strong> thiết bị
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
