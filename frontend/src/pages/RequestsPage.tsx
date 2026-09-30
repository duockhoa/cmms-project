import React from 'react';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Plus, Cpu, Edit2, Trash2, Eye, Lock } from 'lucide-react';
import { RequestDetailView } from '../components/common/RequestDetailView';
import { TableSkeleton, CardListSkeleton } from '../components/common/Skeleton';
import { EmptyState, FilterBar, PageHeader } from '../components/common';
import { RequestDeleteModal } from '../components/requests/RequestDeleteModal';
import { RequestCreateModal } from '../components/requests/RequestCreateModal';
import { RequestEditModal } from '../components/requests/RequestEditModal';
import { useRequestsPage } from '../hooks/useRequestsPage';

export const RequestsPage: React.FC = () => {
  const {
    canEdit,
    canDelete,
    requests,
    equipmentList,
    users,
    currentUser,
    loading,
    statusFilter,
    setStatusFilter,
    selectedDetailReqId,
    setSelectedDetailReqId,
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
    deleteConfirmReq,
    setDeleteConfirmReq,
    isDeleting,
    openDeleteConfirm,
    handleDelete,
    isReqLocked,
    loadData,
  } = useRequestsPage();

  return (
    <div>
      <PageHeader
        title="Yêu cầu Sửa chữa & Báo Sự cố"
        subtitle="Tiếp nhận báo hỏng từ nhân viên vận hành xưởng, phê duyệt và tự động tạo phiếu bảo trì."
        actions={(
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} /> Gửi yêu cầu báo sự cố mới
          </button>
        )}
      />

      {/* Filter Bar */}
      <FilterBar hasActiveFilters={Boolean(statusFilter)} onReset={() => setStatusFilter('')}>
        <select className="form-select" style={{ width: '250px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">-- Tất cả Trạng thái --</option>
          <option value="PENDING">Chờ xử lý (Phê duyệt)</option>
          <option value="APPROVED">Đã duyệt (Đang sửa chữa)</option>
          <option value="CLOSED">Đã đóng (Đã nghiệm thu xong)</option>
          <option value="REJECTED">Đã từ chối</option>
          <option value="RETURNED">Đã trả lại</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </FilterBar>

      {/* Main Content Area */}
      <div className="master-detail-container">
        
        {/* Master List Pane */}
        <div className={`master-pane ${selectedDetailReqId ? 'has-selection' : ''}`}>
          {selectedDetailReqId ? (
            // Cột bên trái khi đang xem chi tiết (Card List)
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)' }}>
              {loading ? (
                <CardListSkeleton count={5} />
              ) : requests.length === 0 ? (
                <EmptyState compact minHeight={160} title="Không có yêu cầu sự cố" />
              ) : (
                requests.map(req => (
                  <div 
                    key={req.id}
                    onClick={() => setSelectedDetailReqId(req.id)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      backgroundColor: selectedDetailReqId === req.id ? 'var(--bg-primary)' : 'var(--bg-card)',
                      border: selectedDetailReqId === req.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      boxShadow: selectedDetailReqId === req.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.requestCode}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={req.status} />
                        {isReqLocked(req) ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span 
                              title={req.status === 'CLOSED' ? 'Sự cố đã nghiệm thu hoàn tất và đóng' : 'Đã chuyển thành phiếu sửa chữa, đã khóa'} 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}
                            >
                              <Lock size={11} /> Đã khóa
                            </span>
                            {canDelete && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Xóa yêu cầu sự cố (Quản trị viên)"
                                onClick={(e) => { e.stopPropagation(); openDeleteConfirm(req); }}
                                style={{ padding: '4px', borderRadius: '4px', color: '#dc2626', border: '1px solid #fecaca', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {canEdit && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Chỉnh sửa"
                                onClick={(e) => { e.stopPropagation(); openEditModal(req); }}
                                style={{ padding: '4px', borderRadius: '4px', color: '#d97706', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Xóa"
                                onClick={(e) => { e.stopPropagation(); openDeleteConfirm(req); }}
                                style={{ padding: '4px', borderRadius: '4px', color: '#dc2626', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{req.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Thiết bị: {req.equipment?.code || '---'}
                      {req.functionalUnit && (
                        <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 500 }}>
                          • Cụm: {req.functionalUnit.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Full Table khi không xem chi tiết
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã Yêu cầu</th>
                    <th>Thiết bị sự cố</th>
                    <th>Mô tả / Tiêu đề</th>
                    <th>Người báo</th>
                    <th>Ưu tiên</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={7} rows={6} />
                  ) : requests.length === 0 ? (
                    <EmptyState colSpan={7} compact minHeight={160} title="Không có yêu cầu sự cố phù hợp" />
                  ) : (
                    requests.map((req) => (
                    <tr 
                      key={req.id}
                      onClick={() => setSelectedDetailReqId(req.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {req.requestCode}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{req.equipment?.name || '---'}</div>
                        {req.functionalUnit ? (
                          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Cpu size={12} />
                            <span>Cụm: {req.functionalUnit.name} {req.functionalUnit.code ? `(${req.functionalUnit.code})` : ''}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Toàn bộ thiết bị
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.description}</div>
                        {req.status === 'RETURNED' && req.returnedReason && (
                          <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                            <strong>Lý do trả lại:</strong> {req.returnedReason}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div>{req.reporterName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.department}</div>
                      </td>
                      <td><PriorityBadge priority={req.priority} /></td>
                      <td><StatusBadge status={req.status} /></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Xem chi tiết"
                            onClick={(e) => { e.stopPropagation(); setSelectedDetailReqId(req.id); }}
                            style={{ padding: '6px', borderRadius: '6px', color: '#2563eb', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                          >
                            <Eye size={15} />
                          </button>
                          {isReqLocked(req) ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span 
                                title={req.status === 'CLOSED' ? 'Yêu cầu đã đóng sau khi hoàn thành nghiệm thu' : 'Đã chuyển thành phiếu sửa chữa, đã khóa'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '6px' }}
                              >
                                <Lock size={13} /> Đã khóa
                              </span>
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Xóa yêu cầu sự cố (Quản trị viên)"
                                  onClick={(e) => { e.stopPropagation(); openDeleteConfirm(req); }}
                                  style={{ padding: '6px', borderRadius: '6px', color: '#dc2626', border: '1px solid #fecaca', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Chỉnh sửa yêu cầu"
                                  onClick={(e) => { e.stopPropagation(); openEditModal(req); }}
                                  style={{ padding: '6px', borderRadius: '6px', color: '#d97706', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Xóa yêu cầu sự cố"
                                  onClick={(e) => { e.stopPropagation(); openDeleteConfirm(req); }}
                                  style={{ padding: '6px', borderRadius: '6px', color: '#dc2626', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail View Pane */}
        {selectedDetailReqId && (
          <div className="detail-pane">
            <RequestDetailView 
              requestId={selectedDetailReqId} 
              users={users} 
              currentUser={currentUser} 
              onActionSuccess={() => { loadData(); }} 
              onClose={() => setSelectedDetailReqId(null)} 
              onEdit={canEdit && !isReqLocked(requests.find(r => r.id === selectedDetailReqId)) ? openEditModal : undefined}
              onDelete={canDelete && !isReqLocked(requests.find(r => r.id === selectedDetailReqId)) ? openDeleteConfirm : undefined}
            />
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <RequestCreateModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        formData={formData}
        setFormData={setFormData}
        equipmentList={equipmentList}
        functionalUnits={functionalUnits}
        loadingUnits={loadingUnits}
        showScanner={showScanner}
        setShowScanner={setShowScanner}
        onQRScan={handleQRScan}
        onSubmit={handleCreate}
      />

      {/* Edit Request Modal */}
      <RequestEditModal
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setEditingReq(null); }}
        editingReq={editingReq}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        equipmentList={equipmentList}
        editFunctionalUnits={editFunctionalUnits}
        loadingEditUnits={loadingEditUnits}
        isSubmittingEdit={isSubmittingEdit}
        onSubmit={handleUpdate}
      />

      {/* Delete Confirmation Modal */}
      <RequestDeleteModal
        request={deleteConfirmReq}
        locked={isReqLocked(deleteConfirmReq)}
        deleting={isDeleting}
        onClose={() => setDeleteConfirmReq(null)}
        onConfirm={handleDelete}
      />

    </div>
  );
};
