import React from 'react';
import { Modal } from '../common/Modal';
import { MaintenanceScheduleTab } from '../maintenance/MaintenanceScheduleTab';
import { CreateScheduleModal } from '../maintenance/CreateScheduleModal';
import { ScheduleLogModal } from '../maintenance/ScheduleLogModal';
import { useMaintenancePage } from '../../hooks/useMaintenancePage';

export const MaintenancePlansSettingsTab: React.FC = () => {
  const {
    schedules, loadingSchedules, processingDue,
    search, setSearch, statusFilter, setStatusFilter, freqFilter, setFreqFilter,
    overdueFilter, setOverdueFilter, activeCount, overdueCount, pausedCount,
    draftCount, handleProcessDue, openCreateModal, openEditModal, handleActivate,
    handleGenerateWO, setPauseTarget, setActionReason, openHistory,
    isAddOpen, editTarget, formData, setFormData, equipmentList,
    checklistTemplates, technicians, closeScheduleModal, handleCreate, handleUpdate,
    pauseTarget, actionReason, handlePauseSubmit, historyTarget, historyTimeline,
    historyLoading, setHistoryTarget,
  } = useMaintenancePage();

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          Thiết lập Kế hoạch Bảo trì Định kỳ
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          Quản lý chu kỳ bảo dưỡng phòng ngừa (PM), thiết lập tần suất (ngày, tuần, tháng, giờ chạy), checklist mẫu và cấu hình quét sinh phiếu tự động hoặc thủ công.
        </p>
      </div>

      <MaintenanceScheduleTab
        schedules={schedules}
        loading={loadingSchedules}
        processingDue={processingDue}
        search={search}
        statusFilter={statusFilter}
        frequencyFilter={freqFilter}
        overdueOnly={overdueFilter}
        counts={{ active: activeCount, overdue: overdueCount, paused: pausedCount, draft: draftCount }}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onFrequencyChange={setFreqFilter}
        onOverdueChange={setOverdueFilter}
        onResetFilters={() => {
          setSearch('');
          setStatusFilter('');
          setFreqFilter('');
          setOverdueFilter(false);
        }}
        onProcessDue={handleProcessDue}
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onActivate={handleActivate}
        onGenerateWorkOrder={handleGenerateWO}
        onPause={(schedule) => {
          setPauseTarget(schedule);
          setActionReason('');
        }}
        onViewHistory={openHistory}
      />

      {/* ===================== MODALS ===================== */}

      <CreateScheduleModal
        isOpen={isAddOpen || Boolean(editTarget)}
        editTarget={editTarget}
        formData={formData}
        equipmentList={equipmentList}
        checklistTemplates={checklistTemplates}
        technicians={technicians}
        onChange={setFormData}
        onClose={closeScheduleModal}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Modal Pause Schedule */}
      {pauseTarget && (
        <Modal
          isOpen={!!pauseTarget}
          onClose={() => setPauseTarget(null)}
          title={`Tạm dừng kế hoạch: ${pauseTarget.scheduleCode}`}
        >
          <form onSubmit={handlePauseSubmit}>
            <div className="form-group">
              <label className="form-label">Lý do tạm dừng kế hoạch *</label>
              <input
                type="text"
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Ví dụ: Thiết bị ngừng sản xuất, đang chờ linh kiện thay thế..."
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPauseTarget(null)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-warning">
                Xác nhận Tạm Dừng
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ScheduleLogModal
        schedule={historyTarget}
        timeline={historyTimeline}
        loading={historyLoading}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
};
