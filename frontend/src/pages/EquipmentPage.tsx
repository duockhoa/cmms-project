import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fetchWithAuth } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, MoreHorizontal, Eye, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { EquipmentDetailPage } from './EquipmentDetailPage';
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal';
import { useToast, useConfirmDialog } from '../components/common/Toast';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      if (search) url.searchParams.append('search', search);
      if (categoryFilter) url.searchParams.append('category', categoryFilter);
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
  }, [search, categoryFilter, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const handleFormSubmit = async (finalFormData: any) => {
    try {
      if (editItem) {
        // Edit mode: PATCH
        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment/${editItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: finalFormData.name,
            category: finalFormData.category,
            status: finalFormData.status,
            location: finalFormData.location,
            serialNumber: finalFormData.serialNumber,
            specs: finalFormData.specs,
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
        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment`, {
          method: 'POST',
          body: JSON.stringify(finalFormData)
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thiết bị</h1>
          <p className="page-subtitle">Quản lý thông tin và tình trạng thiết bị</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Thêm thiết bị
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
            placeholder="Tìm theo tên, số serial, vị trí..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: '160px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="Cơ khí">Cơ khí</option>
          <option value="Điện">Điện</option>
          <option value="Điện - Tự động hóa">Điện - Tự động hóa</option>
          <option value="Sản xuất">Sản xuất</option>
        </select>

        <select className="form-select" style={{ width: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="OPERATIONAL">Hoạt động</option>
          <option value="REPAIRING">Đang sửa chữa</option>
          <option value="UNDER_MAINTENANCE">Cảnh báo</option>
          <option value="INCIDENT">Nguy hiểm</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
      ) : (
        <div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên thiết bị</th>
                  <th>Loại</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Bảo trì tiếp</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
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
                    <td style={{ fontWeight: 700 }}>{item.code}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category}</td>
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
                          zIndex: 100, display: 'flex', flexDirection: 'column', width: '130px', padding: '4px 0'
                        }}>
                          <button 
                            onClick={() => { navigate(`/equipment/${item.id}`); setActiveActionMenu(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                          >
                            <Eye size={12} /> Xem chi tiết
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
      )}

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
