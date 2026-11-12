import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { StatusBadge } from '../components/common/Badge';
import { Plus, MoreHorizontal, Eye, Trash2, Edit, Printer, CheckSquare, FileSpreadsheet } from 'lucide-react';
import { EquipmentDetailPage } from './EquipmentDetailPage';
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal';
import { EquipmentImportModal } from '../components/equipment/EquipmentImportModal';
import { TableSkeleton } from '../components/common/Skeleton';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, ExportButton, FilterBar, PageHeader, SearchInput } from '../components/common';
import { useEquipmentPage } from '../hooks/useEquipmentPage';

export const EquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    navigate,
    equipment,
    loading,
    total,
    totalPages,
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
    page,
    setPage,
    limit,
    selectedIds,
    setSelectedIds,
    isSelectAllTotal,
    setIsSelectAllTotal,
    isAllPageSelected,
    toggleSelectOne,
    toggleSelectAll,
    isPrintingAll,
    handlePrintAll,
    handlePrintSelected,
    handlePrintSingle,
    equipmentModal,
    activeActionMenu,
    setActiveActionMenu,
    exportEquipment,
    handleFormSubmit,
    handleDelete,
    loadEquipment,
  } = useEquipmentPage();

  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number; openUpwards?: boolean } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    if (!activeActionMenu) return;
    const handleClose = () => {
      setActiveActionMenu(null);
      setMenuAnchor(null);
    };
    document.addEventListener('click', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('click', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [activeActionMenu, setActiveActionMenu]);

  const activeItem = equipment.find((item) => item.id === activeActionMenu);

  const toggleActionMenu = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (activeActionMenu === itemId) {
      setActiveActionMenu(null);
      setMenuAnchor(null);
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpwards = spaceBelow < 185;
      setMenuAnchor({
        top: openUpwards ? rect.top - 6 : rect.bottom + 4,
        right: Math.max(10, window.innerWidth - rect.right),
        openUpwards,
      });
      setActiveActionMenu(itemId);
    }
  };

  if (id) {
    return <EquipmentDetailPage item={{ id }} onBack={() => navigate('/equipment')} />;
  }

  return (
    <div>
      <PageHeader
        title="Quản lý thiết bị"
        subtitle="Quản lý thông tin và tình trạng thiết bị"
        actions={
          <>
          <ExportButton
            onExport={exportEquipment}
            filename={`Danh_sach_thiet_bi_${new Date().toISOString().slice(0, 10)}.csv`}
            label="Xuất Excel"
          />
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

          <button
            className="btn btn-secondary"
            onClick={() => setIsImportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Tải biểu mẫu và nhập thiết bị hàng loạt từ Excel"
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Import Excel</span>
          </button>

          <button className="btn btn-primary" onClick={() => equipmentModal.open()}>
            <Plus size={16} /> Thêm thiết bị
          </button>
          </>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        hasActiveFilters={Boolean(search || categoryFilter || departmentFilter || statusFilter)}
        onReset={() => {
          setSearch('');
          setCategoryFilter('');
          setDepartmentFilter('');
          setStatusFilter('');
          setPage(1);
        }}
      >
        <div className="filter-search">
          <SearchInput
            placeholder="Tìm theo tên, số serial, vị trí..."
            value={search}
            onChange={(value) => handleFilterChange(setSearch, value)}
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
      </FilterBar>

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

        <div className="table-wrapper" style={{ minHeight: equipment.length > 0 ? '220px' : 'auto' }}>
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
                <EmptyState
                  colSpan={9}
                  compact
                  minHeight={150}
                  title="Không có thiết bị phù hợp"
                  description="Thử thay đổi từ khóa hoặc đặt lại bộ lọc để xem thêm kết quả."
                  action={{ label: 'Thêm thiết bị', onClick: () => equipmentModal.open(), icon: Plus }}
                />
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
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.code}</div>
                      {item.oldCode && (
                        <div style={{ fontSize: '11.5px', color: 'var(--accent-blue, #2563eb)', fontWeight: 600 }}>
                          {item.oldCode}
                        </div>
                      )}
                      {item.accountingCode && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          KT: {item.accountingCode}
                        </div>
                      )}
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
                      style={{ textAlign: 'center' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={(e) => toggleActionMenu(e, item.id)}
                        style={{ padding: '4px 8px' }}
                        title="Tùy chọn thao tác"
                      >
                        <MoreHorizontal size={14} />
                      </button>
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

      {/* Floating Action Menu rendered outside table wrapper to avoid clipping */}
      {activeActionMenu && activeItem && menuAnchor && createPortal(
        <div 
          className="action-dropdown" 
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: menuAnchor.openUpwards ? undefined : `${menuAnchor.top}px`,
            bottom: menuAnchor.openUpwards ? `${window.innerHeight - menuAnchor.top}px` : undefined,
            right: `${menuAnchor.right}px`,
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: 'var(--radius-sm, 6px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            width: '145px',
            padding: '4px 0',
          }}
        >
          <button 
            onClick={() => { navigate(`/equipment/${activeItem.id}`); setActiveActionMenu(null); setMenuAnchor(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Eye size={13} /> Xem chi tiết
          </button>
          <button 
            onClick={() => { handlePrintSingle(activeItem); setActiveActionMenu(null); setMenuAnchor(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Printer size={13} /> In tem QR
          </button>
          <button 
            onClick={() => { equipmentModal.open(activeItem); setActiveActionMenu(null); setMenuAnchor(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Edit size={13} /> Chỉnh sửa
          </button>
          <button 
            onClick={() => { handleDelete(activeItem.id); setActiveActionMenu(null); setMenuAnchor(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--danger, #dc2626)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Trash2 size={13} /> Xóa
          </button>
        </div>,
        document.body
      )}

      {/* Modal Add/Edit Equipment */}
      <EquipmentFormModal 
        isOpen={equipmentModal.isOpen}
        onClose={() => equipmentModal.close()} 
        onSubmit={handleFormSubmit} 
        initialData={equipmentModal.data}
      />

      {/* Modal Import Equipment */}
      <EquipmentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadEquipment()}
      />
    </div>
  );
};

export default EquipmentPage;
