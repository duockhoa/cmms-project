import React from 'react';
import { Modal } from '../components/common/Modal';
import {
  Calendar,
  History,
} from 'lucide-react';
import { PageHeader, Tabs } from '../components/common';
import { CreateScheduleModal } from '../components/maintenance/CreateScheduleModal';
import { MaintenanceHistoryTab } from '../components/maintenance/MaintenanceHistoryTab';
import { MaintenanceScheduleTab } from '../components/maintenance/MaintenanceScheduleTab';
import { ScheduleLogModal } from '../components/maintenance/ScheduleLogModal';
import { useMaintenancePage } from '../hooks/useMaintenancePage';

export const MaintenancePage: React.FC = () => {
  const maintenanceViewModel = useMaintenancePage();
  const {
    activeTab, setActiveTab, schedules, loadingSchedules, processingDue,
    search, setSearch, statusFilter, setStatusFilter, freqFilter, setFreqFilter,
    overdueFilter, setOverdueFilter, activeCount, overdueCount, pausedCount,
    draftCount, handleProcessDue, openCreateModal, openEditModal, handleActivate,
    handleGenerateWO, setPauseTarget, setActionReason, openHistory, history,
    loadingHistory, page, setPage, limit, total, totalPages, totalCost, totalHours,
    isAddOpen, editTarget, formData, setFormData, equipmentList,
    checklistTemplates, technicians, closeScheduleModal, handleCreate, handleUpdate,
    pauseTarget, actionReason, handlePauseSubmit, historyTarget, historyTimeline,
    historyLoading, setHistoryTarget,
  } = maintenanceViewModel;
  return (
    <div>
      <PageHeader
        title="Kế hoạch Bảo trì & Lịch sử"
        subtitle="Quản lý kế hoạch bảo dưỡng phòng ngừa định kỳ (PM) và tra cứu lịch sử thực hiện"
      />

      {/* Tabs Switcher */}
      <Tabs
        variant="pills"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'schedules' | 'history')}
        items={[
          { key: 'schedules', label: 'Kế hoạch Bảo trì', shortLabel: 'Kế hoạch', icon: Calendar, count: schedules.length },
          { key: 'history', label: 'Lịch sử thực hiện & Chi phí', shortLabel: 'Lịch sử', icon: History, count: total },
        ]}
        style={{ marginBottom: '20px' }}
      />

      {activeTab === 'schedules' && (
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
      )}

      {activeTab === 'history' && (
        <MaintenanceHistoryTab
          history={history}
          loading={loadingHistory}
          page={page}
          pageSize={limit}
          total={total}
          totalPages={totalPages}
          totalCost={totalCost}
          totalHours={totalHours}
          onPageChange={setPage}
        />
      )}

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
