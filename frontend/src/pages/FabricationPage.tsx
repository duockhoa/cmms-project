import React from 'react';
import { 
  Hammer, Plus, RefreshCw, Filter, 
  Clock, CheckCircle2, Cog, Wrench, ShieldCheck
} from 'lucide-react';
import { PageHeader, KpiCard, FilterBar, SearchInput } from '../components/common';
import { useFabricationPage } from '../hooks/useFabricationPage';
import { FabricationTable } from '../components/fabrication/FabricationTable';
import { FabricationCreateModal } from '../components/fabrication/FabricationCreateModal';
import { FabricationDetailModal } from '../components/fabrication/FabricationDetailModal';

export const FabricationPage: React.FC = () => {
  const {
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
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedJob,
    setSelectedJob,
    handleCreateSuccess,
    handleUpdateSuccess,
    handleDelete,
  } = useFabricationPage();

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Gia công và Chế tạo"
        subtitle="Quản lý gia công và chế tạo"
        actions={(
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Tạo công việc
          </button>
        )}
      />

      {/* KPI Cards Row */}
      <div className="kpi-row kpi-grid-4" style={{ marginBottom: '20px' }}>
        <KpiCard
          title="Tổng công việc"
          value={stats.total}
          icon={Filter}
          footer="Tất cả"
          onClick={() => setStatusFilter('')}
        />
        <KpiCard
          title="Chờ thực hiện"
          value={stats.assigned}
          icon={Clock}
          variant="warning"
          footer="Chưa thực hiện"
          onClick={() => setStatusFilter('ASSIGNED')}
        />
        <KpiCard
          title="Đang gia công"
          value={stats.inProgress}
          icon={RefreshCw}
          variant="info"
          footer="Đang thực hiện"
          onClick={() => setStatusFilter('IN_PROGRESS')}
        />
        <KpiCard
          title="Đã xong / Nghiệm thu"
          value={stats.completed + stats.closed}
          icon={CheckCircle2}
          variant="success"
          footer="Đã hoàn thành"
          onClick={() => setStatusFilter('COMPLETED')}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        hasActiveFilters={Boolean(statusFilter || categoryFilter || searchTerm)}
        onReset={resetFilters}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: '', label: 'Tất cả' },
            { id: 'ASSIGNED', label: 'Chờ làm' },
            { id: 'IN_PROGRESS', label: 'Đang làm' },
            { id: 'COMPLETED', label: 'Hoàn thành' },
            { id: 'CLOSED', label: 'Đã đóng' },
            { id: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '170px', height: '34px', fontSize: '12.5px' }}
          >
            <option value="">Tất cả loại hình</option>
            <option value="FABRICATION">Gia công chi tiết</option>
            <option value="NEW_MAKING">Chế tạo mới</option>
            <option value="MODIFICATION">Cải tiến / Kaizen</option>
            <option value="INSTALLATION">Lắp đặt & Di dời</option>
            <option value="INFRASTRUCTURE">Hạ tầng xưởng</option>
            <option value="OTHER">Công việc khác</option>
          </select>

          <SearchInput
            placeholder="Tìm mã phiếu, tên việc, xưởng..."
            value={searchTerm}
            onChange={setSearchTerm}
            width="220px"
          />

          <button className="btn btn-secondary btn-sm" onClick={fetchJobs} title="Làm mới">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </FilterBar>

      {/* Main Table */}
      <FabricationTable
        jobs={jobs}
        loading={loading}
        onSelectJob={setSelectedJob}
        onDeleteJob={handleDelete}
      />

      {/* Create Modal */}
      <FabricationCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        technicians={technicians}
        equipments={equipments}
        departments={departments}
        onDepartmentChange={handleDepartmentChange}
      />

      {/* Detail & Update Modal */}
      <FabricationDetailModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onSuccess={handleUpdateSuccess}
        technicians={technicians}
      />
    </div>
  );
};
export default FabricationPage;
