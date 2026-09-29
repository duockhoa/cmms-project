import React, { useState, useEffect } from 'react';
import { api, API_HOST } from '../../services/api';
import { useToast } from './Toast';
import { Play, Pause, CheckCircle2, FileText, Plus, AlertTriangle, Eye, ArrowRightLeft, ShieldCheck, XOctagon, Lock } from 'lucide-react';
import { DetailViewSkeleton } from './Skeleton';
import { WorkOrderExecutionModals } from '../work-orders/detail/WorkOrderExecutionModals';
import { WorkOrderDispatchModals } from '../work-orders/detail/WorkOrderDispatchModals';
import { WorkOrderAcceptanceModals } from '../work-orders/detail/WorkOrderAcceptanceModals';

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
  const toast = useToast();
  const [wo, setWo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  // Custom Log Modal state
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [logResult, setLogResult] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logPhotos, setLogPhotos] = useState<FileList | null>(null);
  const [logPhotoCategory, setLogPhotoCategory] = useState<'BEFORE' | 'DURING' | 'AFTER' | 'OTHER'>('DURING');
  const [logAdjustTargetId, setLogAdjustTargetId] = useState<string | null>(null);
  const [logAdjustReason, setLogAdjustReason] = useState('');

  // Pause Modal state
  const [isPauseFormOpen, setIsPauseFormOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('Chờ phụ tùng');
  const [customPauseReason, setCustomPauseReason] = useState('');

  // Complete Modal state
  const [isCompleteFormOpen, setIsCompleteFormOpen] = useState(false);
  const [completeWorkDone, setCompleteWorkDone] = useState('');
  const [completeEquipmentStatus, setCompleteEquipmentStatus] = useState('Hoạt động bình thường');
  const [completeTestResult, setCompleteTestResult] = useState('');
  const [completeConclusion, setCompleteConclusion] = useState('Hoạt động bình thường');
  const [completeRecommendation, setCompleteRecommendation] = useState('');
  const [completePhotos, setCompletePhotos] = useState<FileList | null>(null);

  // Escalate Modal State
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  // Classify Modal State
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [classificationResult, setClassificationResult] = useState<'WORKSHOP_CONTINUE' | 'MAINTENANCE_REQUIRED'>('WORKSHOP_CONTINUE');
  const [classificationNotes, setClassificationNotes] = useState('');

  // Assign Executor Modal State
  const [isAssignExecutorOpen, setIsAssignExecutorOpen] = useState(false);
  const [assignedExecutorId, setAssignedExecutorId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Reject Handover Modal State
  const [rejectHandoverReason, setRejectHandoverReason] = useState('');
  const [isRejectHandoverOpen, setIsRejectHandoverOpen] = useState(false);

  // Workshop Acceptance Modal State
  const [isWorkshopAcceptOpen, setIsWorkshopAcceptOpen] = useState(false);
  const [workshopComment, setWorkshopComment] = useState('');
  const [testRunResult, setTestRunResult] = useState('Đạt yêu cầu vận hành, máy hoạt động ổn định, đủ thông số kỹ thuật');
  const [cleanlinessResult, setCleanlinessResult] = useState('Đạt tiêu chuẩn vệ sinh 5S / xưởng sạch sẽ, không rơi vãi đồ nghề');

  // QA Acceptance Modal State
  const [isQaAcceptOpen, setIsQaAcceptOpen] = useState(false);
  const [qaComment, setQaComment] = useState('');
  const [gmpImpactAssessment, setGmpImpactAssessment] = useState('Không ảnh hưởng đến chất lượng sản phẩm / Đạt tiêu chuẩn GMP');
  const [lineClearanceResult, setLineClearanceResult] = useState('Đồng ý giải phóng chuyền, cho phép đưa thiết bị vào sản xuất trở lại');

  // QA Reject Modal State
  const [isQaRejectOpen, setIsQaRejectOpen] = useState(false);
  const [qaRejectReason, setQaRejectReason] = useState('');

  const getPerformerUnitType = (user: any): 'WORKSHOP' | 'TECHNICAL' | 'MAINTENANCE' => {
    if (!user) return 'MAINTENANCE';
    const dept = (user.department || '').toLowerCase();
    if (dept.includes('cơ điện') || dept.includes('kỹ thuật') || dept.includes('technical') || user.role === 'ADMIN' || user.role === 'MANAGER') {
      return 'TECHNICAL';
    }
    if (dept.includes('xưởng') || dept.includes('px') || dept.includes('workshop') || user.role === 'OPERATOR') {
      return 'WORKSHOP';
    }
    return 'MAINTENANCE';
  };

  const userUnitType = getPerformerUnitType(currentUser);

  const loadData = async () => {
    try {
      setLoading(true);
      const [woData, logData, usersData] = await Promise.all([
        api.getWorkOrderById(workOrderId),
        api.getWorkOrderRepairLogs(workOrderId),
        api.getUsers().catch(() => []),
      ]);
      setWo(woData);
      setLogs(logData);
      setAllUsers(usersData);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải chi tiết Work Order');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Xác định bộ phận tiếp nhận / xử lý của Work Order
  const targetDeptLabel = React.useMemo(() => {
    if (!wo) return '';
    if (wo.handlingRoute === 'WORKSHOP_SELF_HANDLE') {
      return wo.request?.department || wo.equipment?.location || 'Phân xưởng';
    }
    // Tuyến kỹ thuật/cơ điện: trích xuất bộ phận từ tiêu đề "[... xử lý]" hoặc mặc định Cơ điện
    const titleMatch = wo.title?.match(/\[(.*?) xử lý\]/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1];
    }
    return 'xưởng cơ điện';
  }, [wo]);

  // LỌC NGHIÊM NGẶT: Chỉ phân công người thuộc đúng phòng ban đó, tuyệt đối không load toàn bộ người
  const assignableUsers = React.useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers) || !targetDeptLabel) return [];
    const target = targetDeptLabel.trim().toLowerCase();
    return allUsers.filter((u: any) => {
      if (u.isActive === false) return false;
      if (!u.department) return false;
      const uDept = u.department.trim().toLowerCase();
      return uDept === target || target.includes(uDept) || uDept.includes(target);
    });
  }, [allUsers, targetDeptLabel]);

  useEffect(() => {
    if (assignableUsers.length > 0 && !assignedExecutorId) {
      setAssignedExecutorId(assignableUsers[0].id);
    }
  }, [assignableUsers, assignedExecutorId]);

  useEffect(() => {
    if (workOrderId) {
      loadData();
    }
  }, [workOrderId]);

  if (loading || !wo) {
    return (
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <DetailViewSkeleton />
      </div>
    );
  }

  // Permission Checks
  const isAssigned = wo.assignedTechnicianId === currentUser?.id;
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const isQA = isManagerOrAdmin || 
               (currentUser?.department || '').toLowerCase().includes('qa') || 
               (currentUser?.department || '').toLowerCase().includes('chất lượng') ||
               (currentUser?.department || '').toLowerCase().includes('quality');
  const isWorkshopUser = userUnitType === 'WORKSHOP' || isManagerOrAdmin;
  
  // Can execute standard repair logs
  const canModify = isAssigned || isManagerOrAdmin || (wo.handlingRoute === 'WORKSHOP_SELF_HANDLE' && userUnitType === 'WORKSHOP');

  // Upload handler helper
  const uploadPhotos = async (files: FileList, logId: string, category: 'BEFORE' | 'DURING' | 'AFTER' | 'OTHER') => {
    let failedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'WorkOrderRepairLog');
      formData.append('entityId', logId);
      formData.append('workOrderId', wo.id);
      formData.append('repairLogId', logId);
      formData.append('photoCategory', category);
      formData.append('uploadedById', currentUser?.id || '');

      try {
        await api.uploadAttachment(formData);
      } catch (err) {
        console.error('Failed to upload image:', file.name, err);
        failedCount++;
      }
    }

    if (failedCount > 0) {
      toast.warning('Cảnh báo tải ảnh', `Tải lên thất bại ${failedCount}/${files.length} ảnh. Ghi nhận văn bản vẫn được lưu.`);
    } else if (files.length > 0) {
      toast.success('Thành công', `Đã tải lên ${files.length} ảnh đính kèm.`);
    }
  };

  const handleStart = async () => {
    if (!canModify) {
      toast.error('Từ chối truy cập', 'Bạn không được phân công thực hiện công việc này.');
      return;
    }
    try {
      setActionLoading(true);
      await api.updateWorkOrderStatus(wo.id, {
        status: 'IN_PROGRESS',
        expectedVersion: wo.version,
      });
      toast.success('Bắt đầu thành công', 'Đã chuyển trạng thái sang Đang sửa chữa.');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;

    const reasonStr = pauseReason === 'Lý do khác' ? customPauseReason : pauseReason;
    if (!reasonStr.trim()) {
      toast.error('Yêu cầu dữ liệu', 'Vui lòng nhập lý do tạm dừng.');
      return;
    }

    try {
      setActionLoading(true);
      await api.updateWorkOrderStatus(wo.id, {
        status: 'ON_HOLD',
        expectedVersion: wo.version,
        reason: reasonStr,
      } as any);
      toast.success('Tạm dừng thành công', 'Đã chuyển trạng thái sang Tạm dừng.');
      setIsPauseFormOpen(false);
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!canModify) return;
    try {
      setActionLoading(true);
      await api.updateWorkOrderStatus(wo.id, {
        status: 'IN_PROGRESS',
        expectedVersion: wo.version,
      });
      toast.success('Tiếp tục thành công', 'Đã chuyển trạng thái sang Đang sửa chữa.');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    if (!logContent.trim()) {
      toast.error('Yêu cầu dữ liệu', 'Nội dung thao tác bắt buộc phải có.');
      return;
    }

    try {
      setActionLoading(true);
      const log = await api.createWorkOrderRepairLog(wo.id, {
        content: logContent,
        result: logResult || undefined,
        notes: logNotes || undefined,
        adjustedLogId: logAdjustTargetId || undefined,
        adjustmentReason: logAdjustTargetId ? logAdjustReason : undefined,
      });

      // Upload files if any
      if (logPhotos && logPhotos.length > 0) {
        await uploadPhotos(logPhotos, log.id, logPhotoCategory);
      }

      toast.success('Thêm nhật ký thành công', 'Nhật ký sửa chữa đã được lưu.');
      setLogContent('');
      setLogResult('');
      setLogNotes('');
      setLogPhotos(null);
      setLogAdjustTargetId(null);
      setLogAdjustReason('');
      setIsLogFormOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    if (!completeWorkDone.trim()) {
      toast.error('Yêu cầu dữ liệu', 'Vui lòng nhập nội dung công việc đã thực hiện.');
      return;
    }

    try {
      setActionLoading(true);
      
      const isMaintRoute = wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT';
      let result;

      if (isMaintRoute) {
        // Submit handover for Maintenance route
        result = await (api as any).submitHandover(wo.id, {
          expectedVersion: wo.version,
          workDone: completeWorkDone,
          equipmentStatusAfter: completeEquipmentStatus,
          testResult: completeTestResult,
          conclusion: completeConclusion,
          recommendation: completeRecommendation || undefined,
        });
      } else {
        // Direct complete for Workshop route
        result = await api.updateWorkOrderStatus(wo.id, {
          status: 'COMPLETED',
          expectedVersion: wo.version,
          workDone: completeWorkDone,
          equipmentStatusAfter: completeEquipmentStatus,
          testResult: completeTestResult,
          conclusion: completeConclusion,
          recommendation: completeRecommendation,
        } as any);
      }

      // Find the HANDOVER_SUBMIT or COMPLETE type log created automatically during transaction
      const updatedLogs = await api.getWorkOrderRepairLogs(wo.id);
      const targetLogType = isMaintRoute ? 'HANDOVER_SUBMIT' : 'COMPLETE';
      const completeLog = updatedLogs.find((l: any) => l.actionType === targetLogType);

      if (completeLog && completePhotos && completePhotos.length > 0) {
        await uploadPhotos(completePhotos, completeLog.id, 'AFTER');
      }

      toast.success(
        isMaintRoute ? 'Gửi yêu cầu bàn giao thành công' : 'Hoàn thành sửa chữa',
        isMaintRoute ? 'Đã gửi bàn giao kỹ thuật đề nghị nghiệm thu.' : 'Đã chuyển trạng thái sang Chờ nghiệm thu.'
      );
      setIsCompleteFormOpen(false);
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) {
      toast.error('Yêu cầu nhập lý do', 'Vui lòng nhập lý do yêu cầu hỗ trợ kỹ thuật.');
      return;
    }

    try {
      setActionLoading(true);
      await (api as any).escalateWorkOrder(wo.id, {
        expectedVersion: wo.version,
        reason: escalateReason,
      });
      toast.success('Yêu cầu hỗ trợ kỹ thuật thành công', 'Phiếu đã chuyển sang Chờ phân loại kỹ thuật.');
      setIsEscalateOpen(false);
      setEscalateReason('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClassifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await (api as any).classifyWorkOrder(wo.id, {
        expectedVersion: wo.version,
        classificationResult,
        classificationNotes: classificationNotes || undefined,
      });
      toast.success('Phân loại thành công', `Đã phân loại kết quả: ${classificationResult === 'WORKSHOP_CONTINUE' ? 'Xưởng tự xử lý' : 'Cơ điện sửa chữa'}.`);
      setIsClassifyOpen(false);
      setClassificationNotes('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignExecutorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedExecutorId) {
      toast.error('Yêu cầu dữ liệu', 'Vui lòng chọn kỹ thuật viên để phân công.');
      return;
    }

    const tech = assignableUsers.find((t: any) => t.id === assignedExecutorId);
    try {
      setActionLoading(true);
      await (api as any).assignExecutor(wo.id, {
        expectedVersion: wo.version,
        assignedTechnicianId: assignedExecutorId,
        technicianName: tech ? tech.name : undefined,
      });
      toast.success('Phân công thành công', `Đã phân công: ${tech ? tech.name : 'Nhân sự phụ trách'}.`);
      setIsAssignExecutorOpen(false);
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWorkshopAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopComment.trim()) {
      toast.error('Yêu cầu nhập ý kiến', 'Vui lòng nhập ý kiến / đánh giá nghiệm thu của phân xưởng.');
      return;
    }

    try {
      setActionLoading(true);
      await api.acceptHandover(wo.id, {
        expectedVersion: wo.version,
        comment: workshopComment.trim(),
        testRunResult: testRunResult.trim(),
        cleanlinessResult: cleanlinessResult.trim(),
      });
      toast.success('Xưởng nghiệm thu thành công', 'Đã chuyển phiếu sang bước Chờ QA thẩm định & nghiệm thu (INSPECTION).');
      setIsWorkshopAcceptOpen(false);
      setWorkshopComment('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi nghiệm thu', err.message || 'Không thể thực hiện nghiệm thu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQaVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaComment.trim()) {
      toast.error('Yêu cầu nhập kết luận', 'Vui lòng nhập kết luận thẩm định của bộ phận QA.');
      return;
    }

    try {
      setActionLoading(true);
      await api.qaVerifyWorkOrder(wo.id, {
        expectedVersion: wo.version,
        comment: qaComment.trim(),
        gmpImpactAssessment: gmpImpactAssessment.trim(),
        lineClearanceResult: lineClearanceResult.trim(),
      });
      toast.success('QA Nghiệm thu hoàn tất', 'Đã phê duyệt nghiệm thu phiếu sửa chữa (VERIFIED) và tự động đóng yêu cầu sự cố.');
      setIsQaAcceptOpen(false);
      setQaComment('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi thẩm định QA', err.message || 'Không thể nghiệm thu QA');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQaRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaRejectReason.trim()) {
      toast.error('Yêu cầu nhập lý do', 'Vui lòng nhập lý do QA yêu cầu xử lý lại.');
      return;
    }

    try {
      setActionLoading(true);
      await api.qaRejectWorkOrder(wo.id, {
        expectedVersion: wo.version,
        reason: qaRejectReason.trim(),
      });
      toast.success('QA yêu cầu xử lý lại', 'Đã trả phiếu về Đang thực hiện sửa chữa (IN_PROGRESS).');
      setIsQaRejectOpen(false);
      setQaRejectReason('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể gửi yêu cầu xử lý lại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectHandoverReason.trim()) {
      toast.error('Yêu cầu nhập lý do', 'Vui lòng nhập lý do từ chối bàn giao.');
      return;
    }

    try {
      setActionLoading(true);
      await (api as any).rejectHandover(wo.id, {
        expectedVersion: wo.version,
        reason: rejectHandoverReason,
      });
      toast.success('Yêu cầu xử lý lại thành công', 'Đã chuyển trả phiếu về Đang sửa chữa cho Kỹ thuật viên.');
      setIsRejectHandoverOpen(false);
      setRejectHandoverReason('');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Chờ xử lý';
      case 'ASSIGNED': return 'Đã phân công';
      case 'IN_PROGRESS': return 'Đang sửa chữa';
      case 'ON_HOLD': return 'Tạm dừng';
      case 'COMPLETED': return 'Chờ nghiệm thu';
      case 'VERIFIED': return 'Đã nghiệm thu';
      case 'CLOSED': return 'Đã đóng';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return '#3b82f6';
      case 'IN_PROGRESS': return '#f59e0b';
      case 'ON_HOLD': return '#ef4444';
      case 'COMPLETED': return '#10b981';
      case 'VERIFIED': return '#059669';
      case 'CLOSED': return '#6b7280';
      case 'CANCELLED': return '#9ca3af';
      default: return '#374151';
    }
  };

  const ActionButton = ({ onClick, disabled, icon: Icon, label, color }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', 
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div className="action-grid-btn" style={{ 
        borderRadius: '50%', backgroundColor: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Icon size={24} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.3' }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="work-order-detail-view" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          {wo.title} <span style={{ color: 'var(--text-muted)' }}>- {wo.orderCode}</span>
        </h2>
        {onClose && (
          <button onClick={onClose} className="btn-icon">
            <XOctagon size={18} />
          </button>
        )}
      </div>

      <div className="work-order-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Top Header Card - Action Grid */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
             {wo.title} - {wo.orderCode}
           </h3>
           
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
             
             {canModify && wo.status === 'ASSIGNED' && (
               <ActionButton onClick={handleStart} disabled={actionLoading} icon={Play} label="Bắt đầu sửa chữa" color="#3b82f6" />
             )}

             {canModify && wo.status === 'IN_PROGRESS' && (
               <>
                 <ActionButton onClick={() => setIsLogFormOpen(true)} disabled={actionLoading} icon={Plus} label="Ghi nhận thao tác" color="#8b5cf6" />
                 <ActionButton onClick={() => setIsPauseFormOpen(true)} disabled={actionLoading} icon={Pause} label="Tạm dừng" color="#f59e0b" />
                 <ActionButton onClick={() => setIsCompleteFormOpen(true)} disabled={actionLoading} icon={CheckCircle2} label={wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? 'Đề nghị bàn giao' : 'Hoàn thành sửa'} color="#10b981" />
               </>
             )}

             {canModify && wo.status === 'ON_HOLD' && (
               <ActionButton onClick={handleResume} disabled={actionLoading} icon={Play} label="Tiếp tục sửa chữa" color="#3b82f6" />
             )}

             {/* Escalate */}
             {wo.handlingRoute === 'WORKSHOP_SELF_HANDLE' && ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(wo.status) && (userUnitType === 'WORKSHOP' || isManagerOrAdmin) && (
               <ActionButton onClick={() => setIsEscalateOpen(true)} disabled={actionLoading} icon={ArrowRightLeft} label="Yêu cầu hỗ trợ" color="#ef4444" />
             )}

             {/* Classify */}
             {wo.status === 'PENDING' && !wo.classificationResult && (userUnitType === 'TECHNICAL' || isManagerOrAdmin) && (
               <ActionButton onClick={() => setIsClassifyOpen(true)} disabled={actionLoading} icon={ShieldCheck} label="Phân loại sự cố" color="#f59e0b" />
             )}

             {/* Assign */}
             {wo.status === 'PENDING' && !wo.assignedTechnicianId && (
               <ActionButton 
                 onClick={() => setIsAssignExecutorOpen(true)} 
                 disabled={actionLoading} 
                 icon={Plus} 
                 label={wo.handlingRoute === 'WORKSHOP_SELF_HANDLE' ? "Phân công nội bộ xưởng" : "Phân công Kỹ thuật / Cơ điện"} 
                 color="#3b82f6" 
               />
             )}
             {['PENDING', 'ASSIGNED'].includes(wo.status) && wo.assignedTechnicianId && (isManagerOrAdmin || userUnitType === 'TECHNICAL') && (
               <ActionButton 
                 onClick={() => setIsAssignExecutorOpen(true)} 
                 disabled={actionLoading} 
                 icon={ArrowRightLeft} 
                 label="Đổi người phụ trách" 
                 color="#6366f1" 
               />
             )}

             {/* Accept/Reject Handover */}
             {wo.status === 'COMPLETED' && (userUnitType === 'WORKSHOP' || isManagerOrAdmin || wo.handlingRoute === 'WORKSHOP_SELF_HANDLE') && (
               <>
                  <ActionButton 
                    onClick={() => {
                      setWorkshopComment('');
                      setIsWorkshopAcceptOpen(true);
                    }} 
                    disabled={actionLoading} 
                    icon={ShieldCheck} 
                    label="Nghiệm thu bàn giao (Xưởng)" 
                    color="#059669" 
                  />
                 <ActionButton onClick={() => setIsRejectHandoverOpen(true)} disabled={actionLoading} icon={XOctagon} label="Yêu cầu xử lý lại" color="#ef4444" />
               </>
             )}

             {/* QA Verification Actions */}
             {wo.status === 'INSPECTION' && isQA && (
               <>
                 <ActionButton 
                   onClick={() => {
                     setQaComment('');
                     setIsQaAcceptOpen(true);
                   }} 
                   disabled={actionLoading} 
                   icon={ShieldCheck} 
                   label="QA Thẩm định & Nghiệm thu" 
                   color="#7c3aed" 
                 />
                 <ActionButton 
                   onClick={() => {
                     setQaRejectReason('');
                     setIsQaRejectOpen(true);
                   }} 
                   disabled={actionLoading} 
                   icon={XOctagon} 
                   label="QA Yêu cầu xử lý lại" 
                   color="#ef4444" 
                 />
               </>
             )}

             {wo.status === 'INSPECTION' && !isQA && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#b45309', fontSize: '13px' }}>
                 <ShieldCheck size={18} />
                 <span>Xưởng đã nghiệm thu đạt. Đang chờ <strong>Bộ phận Đảm bảo chất lượng (QA)</strong> thẩm định hoàn tất.</span>
               </div>
             )}

             {['VERIFIED', 'CLOSED'].includes(wo.status) && (
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#047857', fontSize: '13px' }}>
                 <Lock size={18} />
                 <span>Phiếu đã được <strong>Phân xưởng</strong> và <strong>Bộ phận QA</strong> nghiệm thu hoàn tất. Thao tác đã khóa.</span>
               </div>
             )}

           </div>
        </div>

        {/* Metadata Table */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', width: '25%', color: 'var(--text-secondary)' }}>Mã lệnh sửa chữa</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo.orderCode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mã thiết bị</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo.equipment?.code} - {wo.equipment?.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(wo.status) }}></span>
                    <span style={{ fontWeight: 700, color: getStatusColor(wo.status) }}>{getStatusLabel(wo.status)}</span>
                  </div>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tuyến xử lý</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo.handlingRoute === 'WORKSHOP_SELF_HANDLE' ? 'Xưởng tự xử lý' : 'Cơ điện sửa chữa'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</td>
                <td style={{ padding: '12px 0' }}>
                  <span className={`badge badge-${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'danger' : 'warning'}`}>
                    {wo.priority}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người yêu cầu</td>
                <td style={{ padding: '12px 0' }}>{wo.request?.reporterName || 'Hệ thống'} ({wo.request?.department || 'Cơ điện'})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người phụ trách</td>
                <td style={{ padding: '12px 0' }}>
                  {(() => {
                    const ids: string[] = Array.isArray(wo.assignedTechnicianIds) ? wo.assignedTechnicianIds : [];
                    if (ids.length > 0 && allUsers.length > 0) {
                      return ids.map((tid: string) => {
                        const u = allUsers.find((user: any) => user.id === tid);
                        return u ? u.name : tid;
                      }).join(', ');
                    }
                    return wo.technicianName || 'Chưa phân công';
                  })()}
                </td>
              </tr>
              {Array.isArray(wo.supporterIds) && wo.supporterIds.length > 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người hỗ trợ</td>
                  <td style={{ padding: '12px 0' }}>
                    {wo.supporterIds.map((sid: string) => {
                      const u = allUsers.find((user: any) => user.id === sid);
                      return u ? u.name : sid;
                    }).join(', ')}
                  </td>
                </tr>
              )}
              {wo.watcherId && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người theo dõi</td>
                  <td style={{ padding: '12px 0' }}>
                    {(() => {
                      const u = allUsers.find((user: any) => user.id === wo.watcherId);
                      return u ? u.name : wo.watcherId;
                    })()}
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Ngày tạo</td>
                <td style={{ padding: '12px 0' }}>{new Date(wo.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mô tả sự cố</td>
                <td style={{ padding: '12px 0' }}>{wo.description}</td>
              </tr>
              {wo.classificationResult && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Kết quả phân loại</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>{wo.classificationResult === 'WORKSHOP_CONTINUE' ? 'Xưởng tiếp tục tự xử lý' : 'Yêu cầu Cơ điện sửa chữa'}</span>
                    {wo.classificationNotes && <div style={{ fontSize: '13px', marginTop: '4px' }}>Ghi chú: {wo.classificationNotes}</div>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Incident Image */}
        {wo.request?.images && JSON.parse(wo.request.images).length > 0 && (
          <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Hình ảnh sự cố ban đầu</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {JSON.parse(wo.request.images).map((imgUrl: string, idx: number) => (
                <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px' }}>
                  <img src={imgUrl} alt="Initial incident" style={{ maxHeight: '120px', maxWidth: '200px', objectFit: 'contain', borderRadius: '4px' }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Log */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Nhật ký quá trình xử lý</h3>
            <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
              <div style={{ position: 'absolute', left: '6px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
              
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có quá trình xử lý nào được ghi nhận.</div>
              ) : (
                logs.map((log: any) => {
                  let badgeColor = '#6b7280';
                  if (log.actionType === 'START') badgeColor = '#3b82f6';
                  if (log.actionType === 'PAUSE') badgeColor = '#ef4444';
                  if (log.actionType === 'RESUME') badgeColor = '#3b82f6';
                  if (log.actionType === 'COMPLETE' || log.actionType === 'HANDOVER_SUBMIT') badgeColor = '#10b981';
                  if (log.actionType === 'HANDOVER_ACCEPT') badgeColor = log.content?.includes('[QA') ? '#7c3aed' : '#059669';
                  if (log.actionType === 'HANDOVER_REJECT') badgeColor = '#ef4444';
                  if (log.actionType === 'ESCALATE') badgeColor = '#dc2626';
                  if (log.actionType === 'CLASSIFY') badgeColor = '#f59e0b';
                  if (log.actionType === 'LOG') badgeColor = '#8b5cf6';

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                      
                      {/* Timeline dot */}
                      <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: badgeColor, border: '3px solid var(--bg-card)', zIndex: 10 }}></div>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: badgeColor }}>
                            {log.actionType} – {log.performedBy?.name || 'Hệ thống'} ({log.performerUnitType})
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(log.recordedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px', fontWeight: 500 }}>
                          {log.content}
                        </div>

                        {/* Additional structured metadata */}
                        {log.pauseReason && (
                          <div style={{ fontSize: '13px', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', padding: '6px 12px', borderRadius: '4px', marginTop: '8px', fontWeight: 600 }}>
                            Lý do tạm dừng: {log.pauseReason}
                          </div>
                        )}

                        {(log.actionType === 'COMPLETE' || log.actionType === 'HANDOVER_SUBMIT') && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '6px', marginTop: '12px', fontSize: '13px' }}>
                            <div><strong>Công việc đã thực hiện:</strong> {log.workDone || '---'}</div>
                            <div><strong>Tình trạng thiết bị:</strong> {log.equipmentStatusAfter || '---'}</div>
                            <div><strong>Kết quả test:</strong> {log.testResult || '---'}</div>
                            <div><strong>Kết luận:</strong> <span style={{ fontWeight: 700, color: '#10b981' }}>{log.conclusion || '---'}</span></div>
                            {log.recommendations && <div><strong>Khuyến nghị/Công việc tiếp theo:</strong> {log.recommendations}</div>}
                          </div>
                        )}

                        {log.actionType === 'HANDOVER_ACCEPT' && (log.testResult || log.recommendations || log.conclusion) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: log.content?.includes('[QA') ? 'rgba(124, 58, 237, 0.05)' : 'rgba(5, 150, 105, 0.05)', border: `1px dashed ${log.content?.includes('[QA') ? 'rgba(124, 58, 237, 0.2)' : 'rgba(5, 150, 105, 0.2)'}`, padding: '12px', borderRadius: '6px', marginTop: '12px', fontSize: '13px' }}>
                            {log.conclusion && <div><strong>Kết luận:</strong> <span style={{ fontWeight: 700, color: log.content?.includes('[QA') ? '#7c3aed' : '#059669' }}>{log.conclusion}</span></div>}
                            {log.testResult && <div><strong>{log.content?.includes('[QA') ? 'Tác động chất lượng GMP:' : 'Kiểm tra chạy thử:'}</strong> {log.testResult}</div>}
                            {log.recommendations && <div><strong>{log.content?.includes('[QA') ? 'Giải phóng chuyền SX:' : 'Vệ sinh 5S khu vực:'}</strong> {log.recommendations}</div>}
                          </div>
                        )}

                        {log.adjustedLogId && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' }}>
                            * Bản ghi điều chỉnh cho nhật ký ID: {log.adjustedLogId.substring(0, 8)} (Lý do: {log.adjustmentReason})
                          </div>
                        )}

                        {log.actionType === 'LOG' && (log.result || log.notes) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', paddingLeft: '12px', borderLeft: '3px solid var(--border-color)' }}>
                            {log.result && <div><strong>Kết quả:</strong> {log.result}</div>}
                            {log.notes && <div><strong>Ghi chú:</strong> {log.notes}</div>}
                          </div>
                        )}

                        {/* Uploaded Photos timeline list */}
                        {log.attachments && log.attachments.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                            {log.attachments.map((file: any) => (
                              <div key={file.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px', backgroundColor: 'var(--bg-card)', position: 'relative' }}>
                                <img src={`${API_HOST}/${file.storagePath}`} alt="Repair step" style={{ height: '80px', width: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                                <span style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{file.photoCategory || 'OTHER'}</span>
                                <a href={`${API_HOST}/${file.storagePath}`} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}>
                                  <Eye size={12} />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Adjustment trigger button */}
                        {canModify && log.actionType === 'LOG' && !log.adjustedLogId && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ alignSelf: 'flex-end', fontSize: '12px', padding: '4px 8px', marginTop: '12px' }}
                            onClick={() => {
                              setLogAdjustTargetId(log.id);
                              setLogAdjustReason('');
                              setLogContent(`[ĐIỀU CHỈNH] ${log.content}`);
                              setIsLogFormOpen(true);
                            }}
                          >
                            Điều chỉnh ghi nhận này
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        </div>
      </div>

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
        setLogContent={setLogContent}
        setLogNotes={setLogNotes}
        setLogPhotoCategory={setLogPhotoCategory}
        setLogPhotos={setLogPhotos}
        setLogResult={setLogResult}
        setPauseReason={setPauseReason}
        wo={wo}
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
