import React from 'react';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';
import { DetailViewSkeleton } from './Skeleton';
import { WorkOrderExecutionModals } from '../work-orders/detail/WorkOrderExecutionModals';
import { InitialAssessmentModal } from '../work-orders/detail/InitialAssessmentModal';
import { WorkOrderDispatchModals } from '../work-orders/detail/WorkOrderDispatchModals';
import { WorkOrderAcceptanceModals } from '../work-orders/detail/WorkOrderAcceptanceModals';
import { WorkOrderTimeline } from '../work-orders/detail/WorkOrderTimeline';
import { WorkOrderMetadata } from '../work-orders/detail/WorkOrderMetadata';
import { WorkOrderDetailHeader } from '../work-orders/detail/WorkOrderDetailHeader';
import { StopWorkOrderSessionModal } from '../work-orders/detail/StopWorkOrderSessionModal';
import { WorkOrderSessionLogsTable } from '../work-orders/detail/WorkOrderSessionLogsTable';
import { getWorkOrderStatusColor, getWorkOrderStatusLabel } from '../work-orders/detail/workOrderDetail.utils';
import { useWorkOrderDetail } from '../../hooks/useWorkOrderDetail';

interface WorkOrderDetailViewProps {
  workOrderId: string;
  onStatusChangeSuccess?: () => void;
  currentUser: any;
  onClose?: () => void;
}

export const WorkOrderDetailView: React.FC<WorkOrderDetailViewProps> = ({
  workOrderId,
  onStatusChangeSuccess,
  currentUser,
  onClose,
}) => {
  const detail = useWorkOrderDetail({ workOrderId, currentUser, onClose, onStatusChangeSuccess });
  const {
    actionLoading, allUsers, assignableUsers, assignedExecutorId, canModify,
    availableDepartments, selectedDepartment, handleDepartmentChange,
    classificationNotes, classificationResult, cleanlinessResult, completeConclusion,
    completeEquipmentStatus, completePhotos, completeRecommendation, completeTestResult,
    completeWorkDone, customPauseReason, escalateReason, gmpImpactAssessment,
    handleAssignExecutorSubmit, handleClassifySubmit, handleCompleteSubmit,
    handleEscalateSubmit, handleLogSubmit, handlePauseSubmit, handleQaRejectSubmit,
    handleQaVerifySubmit, handleRejectHandoverSubmit, handleResume, handleStart,
    handleWorkshopAcceptSubmit, isAssignExecutorOpen, isClassifyOpen, isCompleteFormOpen,
    isEscalateOpen, isLogFormOpen, isAssessmentModalOpen, setIsAssessmentModalOpen, isManagerOrAdmin, isPauseFormOpen, isQA,
    isQaAcceptOpen, isQaRejectOpen, isRejectHandoverOpen, isWorkshopAcceptOpen,
    lineClearanceResult, loading, logAdjustReason, logAdjustTargetId, logContent,
    logNotes, logPhotoCategory, logPhotos, logResult, logs, pauseReason, qaComment,
    qaRejectReason, rejectHandoverReason, setAssignedExecutorId, assignedExecutorIds, setAssignedExecutorIds, setClassificationNotes,
    setClassificationResult, setCleanlinessResult, setCompleteConclusion,
    setCompleteEquipmentStatus, setCompletePhotos, setCompleteRecommendation,
    setCompleteTestResult, setCompleteWorkDone, setCustomPauseReason, setEscalateReason,
    setGmpImpactAssessment, setIsAssignExecutorOpen, setIsClassifyOpen,
    setIsCompleteFormOpen, setIsEscalateOpen, setIsLogFormOpen, setIsPauseFormOpen,
    setIsQaAcceptOpen, setIsQaRejectOpen, setIsRejectHandoverOpen,
    setIsWorkshopAcceptOpen, setLineClearanceResult, setLogAdjustReason,
    setLogAdjustTargetId, setLogContent, setLogNotes, setLogPhotoCategory,
    setLogPhotos, setLogResult, setPauseReason, setQaComment, setQaRejectReason,
    setRejectHandoverReason, setTestRunResult, setWorkshopComment, targetDeptLabel,
    testRunResult, userUnitType, wo, workshopComment,
    // Work Sessions
    mySession, sessionList, isStopSessionOpen, sessionLoading,
    handleStartSession, handleOpenStopSession, handleCloseStopSession, handleStopSessionSubmit,
    sessionTotalHours, sessionUserSummary, loadData,
  } = detail;

  if (loading || !wo) {
    return <DetailViewSkeleton />;
  }

  return (
    <div className="work-order-detail-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <WorkOrderDetailHeader
        actionLoading={actionLoading}
        canModify={canModify}
        handleResume={handleResume}
        handleStart={handleStart}
        isManagerOrAdmin={isManagerOrAdmin}
        isQA={isQA}
        onClose={onClose}
        onReload={loadData}
        onStatusChangeSuccess={onStatusChangeSuccess}
        setIsAssignExecutorOpen={setIsAssignExecutorOpen}
        setIsClassifyOpen={setIsClassifyOpen}
        setIsCompleteFormOpen={setIsCompleteFormOpen}
        setIsEscalateOpen={setIsEscalateOpen}
        setIsLogFormOpen={setIsLogFormOpen}
        setIsPauseFormOpen={setIsPauseFormOpen}
        setIsQaAcceptOpen={setIsQaAcceptOpen}
        setIsQaRejectOpen={setIsQaRejectOpen}
        setIsRejectHandoverOpen={setIsRejectHandoverOpen}
        setIsWorkshopAcceptOpen={setIsWorkshopAcceptOpen}
        setQaComment={setQaComment}
        setQaRejectReason={setQaRejectReason}
        setWorkshopComment={setWorkshopComment}
        userUnitType={userUnitType}
        wo={wo}
        // Work Session & Assessment props
        mySession={mySession}
        sessionLoading={sessionLoading}
        handleStartSession={handleStartSession}
        handleOpenStopSession={handleOpenStopSession}
        setIsAssessmentModalOpen={setIsAssessmentModalOpen}
      />

      <div className="work-order-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>

        {/* Khảo sát & Đánh giá sơ bộ sự cố (4h SLA) Banner */}
        {Boolean(wo?.requestId || wo?.request) && !wo?.initialAssessment && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#d97706' }} />
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#b45309' }}>
                Chưa đánh giá sơ bộ sự cố (SLA ≤ 4h)
              </div>
            </div>
            <button
              onClick={() => setIsAssessmentModalOpen(true)}
              className="btn btn-warning"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '12.5px',
                padding: '6px 14px',
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <Zap size={15} />
              Đánh giá ngay
            </button>
          </div>
        )}

        {wo?.initialAssessment && (
          <div style={{
            padding: '16px 20px',
            borderRadius: '10px',
            backgroundColor: wo.initialAssessment.isWithinSla4h ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${wo.initialAssessment.isWithinSla4h ? '#bbf7d0' : '#fecaca'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} style={{ color: wo.initialAssessment.isWithinSla4h ? '#16a34a' : '#dc2626' }} />
                <strong style={{ fontSize: '14px', color: wo.initialAssessment.isWithinSla4h ? '#15803d' : '#b91c1c' }}>
                  Đánh giá sơ bộ sự cố ({wo.initialAssessment.isWithinSla4h ? 'Đạt chuẩn SLA 4h' : 'Trễ hạn SLA 4h'})
                </strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  — KTV: <strong>{wo.initialAssessment.assessorName}</strong> ({new Date(wo.initialAssessment.assessedAt).toLocaleString('vi-VN')})
                </span>
              </div>
              <button
                onClick={() => setIsAssessmentModalOpen(true)}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '12px', padding: '3px 10px' }}
              >
                Xem / Cập nhật đánh giá
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
              <div><strong>Hiện trạng:</strong> {wo.initialAssessment.actualCondition}</div>
              <div><strong>Nguyên nhân sơ bộ:</strong> {wo.initialAssessment.preliminaryCause}</div>
              <div><strong>Phương án:</strong> {wo.initialAssessment.proposedSolution} ({wo.initialAssessment.estimatedCompletionMinutes} phút)</div>
              {wo.initialAssessment.requireSpareParts && (
                <div style={{ color: '#b45309' }}><strong>Linh kiện cần:</strong> {wo.initialAssessment.sparePartsNeeded || 'Cần phụ tùng'}</div>
              )}
            </div>
          </div>
        )}

        <WorkOrderMetadata
          allUsers={allUsers}
          getStatusColor={getWorkOrderStatusColor}
          getStatusLabel={getWorkOrderStatusLabel}
          targetDeptLabel={targetDeptLabel}
          wo={wo}
        />

        {/* Bảng Tiến độ & Nhật ký tổng hợp các phiên */}
        <WorkOrderSessionLogsTable
          sessions={sessionList}
          totalHours={sessionTotalHours}
          userSummary={sessionUserSummary}
        />

        <WorkOrderTimeline
          canModify={canModify}
          logs={logs}
          setIsLogFormOpen={setIsLogFormOpen}
          setLogAdjustReason={setLogAdjustReason}
          setLogAdjustTargetId={setLogAdjustTargetId}
          setLogContent={setLogContent}
        />
      </div>

      {/* Modal kết thúc phiên làm việc */}
      <StopWorkOrderSessionModal
        isOpen={isStopSessionOpen}
        onClose={handleCloseStopSession}
        onSubmit={handleStopSessionSubmit}
        activeSession={mySession}
        loading={sessionLoading}
      />

      {/* Form khảo sát & đánh giá sơ bộ sự cố (chốt SLA KPI 4h) */}
      <InitialAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        workOrder={wo}
        onSuccess={() => {
          loadData();
          if (onStatusChangeSuccess) onStatusChangeSuccess();
        }}
      />

      <WorkOrderExecutionModals
        wo={wo}
        actionLoading={actionLoading}
        completeConclusion={completeConclusion}
        completeEquipmentStatus={completeEquipmentStatus}
        completePhotos={completePhotos}
        completeRecommendation={completeRecommendation}
        completeTestResult={completeTestResult}
        completeWorkDone={completeWorkDone}
        customPauseReason={customPauseReason}
        handleCompleteSubmit={handleCompleteSubmit}
        handleLogSubmit={handleLogSubmit}
        handlePauseSubmit={handlePauseSubmit}
        isCompleteFormOpen={isCompleteFormOpen}
        isLogFormOpen={isLogFormOpen}
        isPauseFormOpen={isPauseFormOpen}
        logAdjustReason={logAdjustReason}
        logAdjustTargetId={logAdjustTargetId}
        logContent={logContent}
        logNotes={logNotes}
        logPhotoCategory={logPhotoCategory}
        logPhotos={logPhotos}
        logResult={logResult}
        pauseReason={pauseReason}
        setCompleteConclusion={setCompleteConclusion}
        setCompleteEquipmentStatus={setCompleteEquipmentStatus}
        setCompletePhotos={setCompletePhotos}
        setCompleteRecommendation={setCompleteRecommendation}
        setCompleteTestResult={setCompleteTestResult}
        setCompleteWorkDone={setCompleteWorkDone}
        setCustomPauseReason={setCustomPauseReason}
        setIsCompleteFormOpen={setIsCompleteFormOpen}
        setIsLogFormOpen={setIsLogFormOpen}
        setIsPauseFormOpen={setIsPauseFormOpen}
        setLogAdjustReason={setLogAdjustReason}
        setLogAdjustTargetId={setLogAdjustTargetId}
        setLogContent={setLogContent}
        setLogNotes={setLogNotes}
        setLogPhotoCategory={setLogPhotoCategory}
        setLogPhotos={setLogPhotos}
        setLogResult={setLogResult}
        setPauseReason={setPauseReason}
      />
      <WorkOrderDispatchModals
        actionLoading={actionLoading}
        assignableUsers={assignableUsers}
        assignedExecutorId={assignedExecutorId}
        assignedExecutorIds={assignedExecutorIds}
        setAssignedExecutorIds={setAssignedExecutorIds}
        availableDepartments={availableDepartments}
        selectedDepartment={selectedDepartment}
        handleDepartmentChange={handleDepartmentChange}
        classificationNotes={classificationNotes}
        classificationResult={classificationResult}
        escalateReason={escalateReason}
        handleAssignExecutorSubmit={handleAssignExecutorSubmit}
        handleClassifySubmit={handleClassifySubmit}
        handleEscalateSubmit={handleEscalateSubmit}
        isAssignExecutorOpen={isAssignExecutorOpen}
        isClassifyOpen={isClassifyOpen}
        isEscalateOpen={isEscalateOpen}
        setAssignedExecutorId={setAssignedExecutorId}
        setClassificationNotes={setClassificationNotes}
        setClassificationResult={setClassificationResult}
        setEscalateReason={setEscalateReason}
        setIsAssignExecutorOpen={setIsAssignExecutorOpen}
        setIsClassifyOpen={setIsClassifyOpen}
        setIsEscalateOpen={setIsEscalateOpen}
        targetDeptLabel={targetDeptLabel}
      />
      <WorkOrderAcceptanceModals
        actionLoading={actionLoading}
        cleanlinessResult={cleanlinessResult}
        gmpImpactAssessment={gmpImpactAssessment}
        handleQaRejectSubmit={handleQaRejectSubmit}
        handleQaVerifySubmit={handleQaVerifySubmit}
        handleRejectHandoverSubmit={handleRejectHandoverSubmit}
        handleWorkshopAcceptSubmit={handleWorkshopAcceptSubmit}
        isQaAcceptOpen={isQaAcceptOpen}
        isQaRejectOpen={isQaRejectOpen}
        isRejectHandoverOpen={isRejectHandoverOpen}
        isWorkshopAcceptOpen={isWorkshopAcceptOpen}
        lineClearanceResult={lineClearanceResult}
        qaComment={qaComment}
        qaRejectReason={qaRejectReason}
        rejectHandoverReason={rejectHandoverReason}
        setCleanlinessResult={setCleanlinessResult}
        setGmpImpactAssessment={setGmpImpactAssessment}
        setIsQaAcceptOpen={setIsQaAcceptOpen}
        setIsQaRejectOpen={setIsQaRejectOpen}
        setIsRejectHandoverOpen={setIsRejectHandoverOpen}
        setIsWorkshopAcceptOpen={setIsWorkshopAcceptOpen}
        lineClearanceResultLabel={lineClearanceResult}
        setLineClearanceResult={setLineClearanceResult}
        setQaComment={setQaComment}
        setQaRejectReason={setQaRejectReason}
        setRejectHandoverReason={setRejectHandoverReason}
        setTestRunResult={setTestRunResult}
        setWorkshopComment={setWorkshopComment}
        testRunResult={testRunResult}
        workshopComment={workshopComment}
      />
    </div>
  );
};
