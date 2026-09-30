import React from 'react';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { FeedbackDetailModal } from '../components/feedback/FeedbackDetailModal';
import { FeedbackTable } from '../components/feedback/FeedbackTable';
import { 
  MessageSquarePlus, RefreshCw, Filter,
  CheckCircle2, Clock 
} from 'lucide-react';
import { FilterBar, KpiCard, PageHeader, SearchInput } from '../components/common';
import { useFeedbacksPage } from '../hooks/useFeedbacksPage';

export const FeedbacksPage: React.FC = () => {
  const {
    feedbacks,
    loading,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    searchTerm,
    setSearchTerm,
    resetFilters,
    fetchFeedbacks,
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedFeedback,
    setSelectedFeedback,
    previewImage,
    setPreviewImage,
    stats: { totalCount, pendingCount, inProgressCount, resolvedCount },
  } = useFeedbacksPage();

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Yêu cầu Chỉnh sửa & Báo lỗi App"
        subtitle="Theo dõi, phản hồi và cập nhật tiến độ xử lý các góp ý và lỗi hệ thống DK.QLTB"
        actions={(
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <MessageSquarePlus size={16} /> Gửi Góp ý / Báo lỗi
          </button>
        )}
      />

      {/* KPI Cards Row */}
      <div className="kpi-row kpi-grid-4" style={{ marginBottom: '20px' }}>
        <KpiCard title="Tổng yêu cầu" value={totalCount} icon={Filter} footer="Tất cả các loại" onClick={() => setStatusFilter('')} />
        <KpiCard title="Mới tiếp nhận / Chờ xử lý" value={pendingCount} icon={Clock} variant="warning" footer="Chưa được xử lý" onClick={() => setStatusFilter('PENDING')} />
        <KpiCard title="Đang xử lý" value={inProgressCount} icon={RefreshCw} variant="info" footer="Đang trong tiến trình" onClick={() => setStatusFilter('IN_PROGRESS')} />
        <KpiCard title="Đã hoàn thành" value={resolvedCount} icon={CheckCircle2} variant="success" footer="Đã khắc phục / phát hành" onClick={() => setStatusFilter('RESOLVED')} />
      </div>

      {/* Filter & Search Bar */}
      <FilterBar
        hasActiveFilters={Boolean(statusFilter || typeFilter || searchTerm)}
        onReset={resetFilters}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {[
            { id: '', label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ xử lý' },
            { id: 'IN_PROGRESS', label: 'Đang xử lý' },
            { id: 'RESOLVED', label: 'Đã hoàn thành' },
            { id: 'REJECTED', label: 'Từ chối' },
            { id: 'CLOSED', label: 'Đã đóng' },
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

        {/* Search and Type filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: '140px', height: '34px', fontSize: '12.5px' }}
          >
            <option value="">Tất cả loại</option>
            <option value="BUG">Báo lỗi (BUG)</option>
            <option value="FEATURE">Tính năng mới</option>
            <option value="IMPROVEMENT">Cải tiến</option>
            <option value="OTHER">Khác</option>
          </select>

          <SearchInput
            placeholder="Tìm mã, nội dung, người gửi..."
            value={searchTerm}
            onChange={setSearchTerm}
            width="220px"
          />

          <button className="btn btn-secondary btn-sm" onClick={fetchFeedbacks} title="Làm mới">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </FilterBar>

      {/* Main Table */}
      <FeedbackTable
        feedbacks={feedbacks}
        loading={loading}
        onSelectFeedback={setSelectedFeedback}
        onPreviewImage={setPreviewImage}
      />

      {/* Modal create */}
      <FeedbackModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchFeedbacks}
      />

      {/* Modal detail & update */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onUpdated={fetchFeedbacks}
      />

      {/* Image Preview Overlay */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <img src={previewImage} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
};
