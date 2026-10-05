import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Hammer, Plus, RefreshCw, Filter, 
  Clock, CheckCircle2, ChevronLeft, ChevronRight,
  Trash2, User, LayoutGrid, MapPin
} from 'lucide-react';
import { PageHeader, KpiCard, FilterBar, SearchInput, EmptyState } from '../components/common';
import { StatusBadge } from '../components/common/Badge';
import { CardListSkeleton } from '../components/common/Skeleton';
import { useFabricationPage, FabricationJobItem } from '../hooks/useFabricationPage';
import { usePermissions } from '../hooks/usePermissions';
import { FabricationTable } from '../components/fabrication/FabricationTable';
import { FabricationCreateModal } from '../components/fabrication/FabricationCreateModal';
import { FabricationDetailView } from '../components/fabrication/FabricationDetailView';

export const FabricationPage: React.FC = () => {
  const { id: urlJobId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { can, isAdmin } = usePermissions();
  const canDelete = isAdmin || can('fabrication:delete');

  const [selectedJobId, setSelectedJobId] = useState<string | null>(urlJobId || null);
  const [masterPage, setMasterPage] = useState<number>(1);
  const masterPageSize = 10;

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
    handleCreateSuccess,
    handleDelete,
  } = useFabricationPage();

  // Sync selectedJobId with urlJobId
  useEffect(() => {
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    } else {
      setSelectedJobId(null);
    }
  }, [urlJobId]);

  const handleSelectJob = (job: FabricationJobItem) => {
    setSelectedJobId(job.id);
    navigate(`/fabrication/${job.id}`);
  };

  const handleCloseDetail = () => {
    setSelectedJobId(null);
    navigate('/fabrication');
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FABRICATION': return 'Gia công cơ khí';
      case 'NEW_MAKING': return 'Chế tạo mới';
      case 'MODIFICATION': return 'Cải tiến kỹ thuật';
      case 'INSTALLATION': return 'Lắp đặt / Di dời';
      case 'INFRASTRUCTURE': return 'Hạ tầng xưởng';
      default: return 'Khác';
    }
  };

  // Master pane pagination
  const totalMasterPages = Math.ceil(jobs.length / masterPageSize) || 1;
  const paginatedMasterJobs = useMemo(() => {
    const start = (masterPage - 1) * masterPageSize;
    return jobs.slice(start, start + masterPageSize);
  }, [jobs, masterPage, masterPageSize]);

  return (
    <div style={{ height: '100%' }}>
      {!selectedJobId ? (
        <>
          {/* Header */}
          <PageHeader
            title="Gia công và Chế tạo"
            subtitle="Quản lý phiếu gia công, chế tạo và cải tiến thiết bị"
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
              footer="Tất cả phiếu"
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
              footer="Đang làm việc"
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
                { id: 'ON_HOLD', label: 'Tạm dừng' },
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
            onSelectJob={handleSelectJob}
            onDeleteJob={handleDelete}
          />
        </>
      ) : (
        /* MASTER-DETAIL SPLIT CONTAINER (Synchronized with WorkOrdersPage flow) */
        <div className="master-detail-container">
          {/* Master List Pane */}
          <div
            className={`master-pane ${selectedJobId ? 'has-selection' : ''}`}
            style={{ padding: '16px', flexDirection: 'column', gap: '12px' }}
          >
            {/* Header Left */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 className="page-title" style={{ fontSize: '20px', margin: 0 }}>Danh sách phiếu</h1>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseDetail}
                  title="Đóng chi tiết & trở về bảng"
                  style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}
                >
                  <ChevronLeft size={16} /> Trở về
                </button>
              </div>
            </div>

            {/* List Cards */}
            {loading ? (
              <CardListSkeleton count={5} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '4px', paddingBottom: '16px' }}>
                {jobs.length === 0 ? (
                  <EmptyState compact minHeight={140} title="Không có phiếu gia công" />
                ) : (
                  paginatedMasterJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: selectedJobId === job.id ? '2px solid #2563eb' : '1px solid var(--border-color)',
                        backgroundColor: selectedJobId === job.id ? '#eff6ff' : 'var(--bg-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedJobId === job.id ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '14px' }}>{job.orderCode}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <StatusBadge status={job.status} />
                          {canDelete && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Xóa phiếu"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(job.id);
                              }}
                              style={{
                                padding: '3px 5px',
                                borderRadius: '4px',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                backgroundColor: 'var(--bg-card)',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{job.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Hammer size={12} /> {getCategoryLabel(job.category)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> {job.assignedTechnician?.name || 'Chưa phân công'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination for Master List */}
            {jobs.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={masterPage === 1}
                  onClick={() => setMasterPage((prev) => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Trang {masterPage} / {totalMasterPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={masterPage >= totalMasterPages}
                  onClick={() => setMasterPage((prev) => Math.min(totalMasterPages, prev + 1))}
                  style={{ padding: '4px 8px' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lề phải: Detail View Pane */}
          <div className="detail-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <FabricationDetailView
              jobId={selectedJobId}
              onClose={handleCloseDetail}
              onUpdated={() => {
                fetchJobs();
              }}
              onDeleted={() => {
                handleCloseDetail();
                fetchJobs();
              }}
            />
          </div>
        </div>
      )}

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
    </div>
  );
};

export default FabricationPage;
