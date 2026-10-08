import React from 'react';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Eye, LayoutGrid, List, Package, Plus, RefreshCw, Trash2, User, UserCheck } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { WorkOrderDetailView } from '../common/WorkOrderDetailView';
import { CardListSkeleton, TableSkeleton } from '../common/Skeleton';
import { Pagination } from '../common/Pagination';
import { EmptyState, ExportButton, FilterBar, PageHeader, SearchInput } from '../common';

interface WorkOrdersContentProps {
  model: Record<string, any>;
}

export const WorkOrdersContent: React.FC<WorkOrdersContentProps> = ({ model }) => {
  const {
    can, isAdmin, workOrders, loading, search, setSearch, statusFilter, setStatusFilter,
    handlerTeamFilter, setHandlerTeamFilter, onlyMyWork, setOnlyMyWork, departments, page, setPage, limit, total,
    totalPages, setIsAddOpen, statusDropdownId, setStatusDropdownId, setIsChecklistOpen,
    setSelectedChecklistWO, openMaterialModal, setIsQrScannerOpen, selectedDetailWoId,
    setSelectedDetailWoId, canDeleteWo, currentUser, loadData, exportWorkOrders,
    handleFilterChange, handleQuickStart, handleQuickPause, handleQuickResume,
    handleDeleteWo, startItem, endItem,
  } = model;

  return <>
    {!selectedDetailWoId ? (
      <>
        <PageHeader
          title="Phiếu sửa chữa"
          subtitle="Quản lý lệnh sửa chữa và vật tư liên quan"
          actions={(
            <>
              <ExportButton
                onExport={exportWorkOrders}
                filename={`Phieu_sua_chua_${new Date().toISOString().slice(0, 10)}.csv`}
                label="Xuất Excel"
              />
              <button className="btn btn-warning" onClick={() => setIsQrScannerOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                <Camera size={16} /> Quét mã thiết bị
              </button>
              <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
                <Plus size={16} /> Tạo phiếu mới
              </button>
            </>
          )}
        />

        {/* Filter Bar */}
        <FilterBar
          hasActiveFilters={Boolean(search || statusFilter || handlerTeamFilter || onlyMyWork)}
          onReset={() => {
            setSearch('');
            setStatusFilter('');
            setHandlerTeamFilter('');
            setOnlyMyWork?.(false);
            setPage(1);
          }}
        >
          <div className="filter-search">
            <SearchInput
              placeholder="Tìm kiếm phiếu, mã thiết bị, kỹ thuật viên..."
              value={search}
              onChange={(value) => handleFilterChange(setSearch, value)}
            />
          </div>

          {/* Trạng thái Filter */}
          <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Trạng thái:</label>
            <select
              className="form-select"
              style={{ flex: 1, height: '38px', fontSize: '13px', padding: '0 12px' }}
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
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
          <div className="filter-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Bộ phận phụ trách:</label>
            <select
              className="form-select"
              style={{ flex: 1, height: '38px', fontSize: '13px', padding: '0 12px' }}
              value={handlerTeamFilter}
              onChange={(e) => handleFilterChange(setHandlerTeamFilter, e.target.value)}
            >
              <option value="">-- Tất cả bộ phận --</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Nút lọc nhanh Việc của tôi */}
          {currentUser?.id && (
            <div className="filter-item" style={{ display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn ${onlyMyWork ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  height: '38px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  padding: '0 12px',
                  boxShadow: onlyMyWork ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                }}
                onClick={() => {
                  setOnlyMyWork?.(!onlyMyWork);
                  setPage(1);
                }}
                title="Chỉ hiển thị các phiếu sửa chữa bạn được giao hoặc cùng phối hợp thực hiện"
              >
                <UserCheck size={15} />
                {onlyMyWork ? 'Đang lọc: Việc của tôi' : 'Chỉ việc của tôi'}
              </button>
            </div>
          )}
        </FilterBar>

        {/* Table */}
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
                {loading ? (
                  <TableSkeleton columns={9} rows={6} />
                ) : workOrders.length === 0 ? (
                  <EmptyState colSpan={9} compact minHeight={150} title="Không có phiếu sửa chữa phù hợp" />
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
                    <td><PriorityBadge priority={wo.priority} /></td>
                    <td>
                      {wo.technicianName ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          {wo.technicianName.split(',').map((name: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                fontSize: '11.5px',
                                fontWeight: 600,
                              }}
                            >
                              <User size={11} color="#64748b" /> {name.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>Chưa phân công</span>
                      )}
                    </td>
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

          {/* Responsive Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            itemName="phiếu sửa chữa"
            onPageChange={setPage}
          />
        </div>
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
            <CardListSkeleton count={5} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '16px' }}>
              {workOrders.length === 0 ? (
                <EmptyState compact minHeight={140} title="Không có phiếu bảo trì" />
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
                      <User size={12} /> {wo.technicianName || 'Chưa phân công'}
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

  </>;
};
