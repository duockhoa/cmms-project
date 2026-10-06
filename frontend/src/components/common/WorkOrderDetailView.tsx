import React from 'react';
import { DetailViewSkeleton } from './Skeleton';
import { WorkOrderExecutionModals } from '../work-orders/detail/WorkOrderExecutionModals';
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
    classificationNotes, classificationResult, cleanlinessResult, completeConclusion,
    completeEquipmentStatus, completePhotos, completeRecommendation, completeTestResult,
    completeWorkDone, customPauseReason, escalateReason, gmpImpactAssessment,
    handleAssignExecutorSubmit, handleClassifySubmit, handleCompleteSubmit,
    handleEscalateSubmit, handleLogSubmit, handlePauseSubmit, handleQaRejectSubmit,
    handleQaVerifySubmit, handleRejectHandoverSubmit, handleResume, handleStart,
    handleWorkshopAcceptSubmit, isAssignExecutorOpen, isClassifyOpen, isCompleteFormOpen,
    isEscalateOpen, isLogFormOpen, isManagerOrAdmin, isPauseFormOpen, isQA,
    isQaAcceptOpen, isQaRejectOpen, isRejectHandoverOpen, isWorkshopAcceptOpen,
    lineClearanceResult, loading, logAdjustReason, logAdjustTargetId, logContent,
    logNotes, logPhotoCategory, logPhotos, logResult, logs, pauseReason, qaComment,
    qaRejectReason, rejectHandoverReason, setAssignedExecutorId, setClassificationNotes,
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
    sessionTotalHours, sessionUserSummary,
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
        // Work Session props
        mySession={mySession}
        sessionLoading={sessionLoading}
        handleStartSession={handleStartSession}
        handleOpenStopSession={handleOpenStopSession}
      />

      <div className="work-order-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>

        <WorkOrderMetadata
          allUsers={allUsers}
          getStatusColor={getWorkOrderStatusColor}
          getStatusLabel={getWorkOrderStatusLabel}
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

      <WorkOrderExecutionModals
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
