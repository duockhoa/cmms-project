import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { getPerformerUnitType } from '../components/work-orders/detail/workOrderDetail.utils';

interface UseWorkOrderDetailOptions {
  workOrderId: string;
  currentUser: any;
  onClose?: () => void;
  onStatusChangeSuccess?: () => void;
}

export const useWorkOrderDetail = ({
  workOrderId, currentUser, onClose, onStatusChangeSuccess,
}: UseWorkOrderDetailOptions) => {
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
  const [logPhotos, setLogPhotos] = useState<File[] | FileList | null>(null);
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
  const [completePhotos, setCompletePhotos] = useState<File[] | FileList | null>(null);

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

  // Work Session States
  const [mySession, setMySession] = useState<any>(null);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [isStopSessionOpen, setIsStopSessionOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const userUnitType = getPerformerUnitType(currentUser);

  const loadSessionsData = async (woId: string) => {
    try {
      const [active, list] = await Promise.all([
        api.getWorkOrderActiveSession(woId).catch(() => null),
        api.getWorkOrderSessions(woId).catch(() => []),
      ]);
      setMySession(active || null);
      setSessionList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load sessions data:', e);
    }
  };

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
      loadSessionsData(workOrderId);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải chi tiết Work Order');
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  // Xác định bộ phận tiếp nhận / xử lý của Work Order
  const targetDeptLabel = useMemo(() => {
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
  const assignableUsers = useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers) || !targetDeptLabel) return [];
    const target = targetDeptLabel.trim().toLowerCase();
    return allUsers.filter((u: any) => {
      if (u.isActive === false) return false;
      if (!u.department) return false;
      const uDept = u.department.trim().toLowerCase();
      return uDept === target || target.includes(uDept) || uDept.includes(target);
    });
  }, [allUsers, targetDeptLabel]);

  const [assignedExecutorIds, setAssignedExecutorIds] = useState<string[]>([]);

  useEffect(() => {
    if (wo) {
      const ids: string[] = Array.isArray(wo.assignedTechnicianIds)
        ? wo.assignedTechnicianIds
        : (wo.assignedTechnicianId ? [wo.assignedTechnicianId] : []);
      setAssignedExecutorIds(ids);
      if (ids.length > 0) {
        setAssignedExecutorId(ids[0]);
      } else if (assignableUsers.length > 0) {
        setAssignedExecutorId(assignableUsers[0].id);
      }
    }
  }, [wo, isAssignExecutorOpen]);

  useEffect(() => {
    if (workOrderId) {
      loadData();
    }
  }, [workOrderId]);

  // Permission Checks: hỗ trợ cả assignedTechnicianId, assignedTechnicianIds, supporterIds
  const isAssigned = wo?.assignedTechnicianId === currentUser?.id ||
    (Array.isArray(wo?.assignedTechnicianIds) && wo?.assignedTechnicianIds.includes(currentUser?.id)) ||
    (Array.isArray(wo?.supporterIds) && wo?.supporterIds.includes(currentUser?.id));
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const isQA = isManagerOrAdmin ||
    (currentUser?.department || '').toLowerCase().includes('qa') ||
    (currentUser?.department || '').toLowerCase().includes('chất lượng') ||
    (currentUser?.department || '').toLowerCase().includes('quality');
  const isWorkshopUser = userUnitType === 'WORKSHOP' || isManagerOrAdmin;

  // Can execute standard repair logs
  const canModify = isAssigned || isManagerOrAdmin || (wo?.handlingRoute === 'WORKSHOP_SELF_HANDLE' && userUnitType === 'WORKSHOP');

  // Upload handler helper
  const uploadPhotos = async (files: FileList | File[], logId: string, category: 'BEFORE' | 'DURING' | 'AFTER' | 'OTHER') => {
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
    const ids = assignedExecutorIds.length > 0 ? assignedExecutorIds : (assignedExecutorId ? [assignedExecutorId] : []);
    if (ids.length === 0) {
      toast.error('Yêu cầu dữ liệu', 'Vui lòng chọn ít nhất 1 kỹ thuật viên để phân công.');
      return;
    }

    const techNames = ids
      .map((id) => assignableUsers.find((t: any) => t.id === id)?.name || allUsers.find((u: any) => u.id === id)?.name)
      .filter(Boolean);

    try {
      setActionLoading(true);
      await (api as any).assignExecutor(wo.id, {
        expectedVersion: wo.version,
        assignedTechnicianId: ids[0],
        assignedTechnicianIds: ids,
        technicianName: techNames.join(', '),
      });
      toast.success('Phân công thành công', `Đã phân công: ${techNames.join(', ')}.`);
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

  // ==================== WORK ORDER SESSIONS ====================

  const handleStartSession = async (taskContent?: string) => {
    try {
      setSessionLoading(true);
      await api.startWorkOrderSession(workOrderId, { taskContent });
      toast.success('Bắt đầu làm việc', 'Đã mở phiên làm việc và kích hoạt đếm giờ.');
      await loadData();
      if (onStatusChangeSuccess) onStatusChangeSuccess();
    } catch (err: any) {
      toast.error('Lỗi bắt đầu phiên', err.message || 'Không thể bắt đầu phiên làm việc');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleOpenStopSession = () => {
    setIsStopSessionOpen(true);
  };

  const handleCloseStopSession = () => {
    setIsStopSessionOpen(false);
  };

  const handleStopSessionSubmit = async (data: { taskContent?: string; resultNotes?: string; photos?: string[]; materialsUsed?: any[] }) => {
    try {
      setSessionLoading(true);
      await api.stopWorkOrderSession(workOrderId, data);
      toast.success('Kết thúc phiên thành công', 'Đã lưu công việc và chốt giờ làm.');
      setIsStopSessionOpen(false);
      await loadData();
      if (onStatusChangeSuccess) onStatusChangeSuccess();
    } catch (err: any) {
      toast.error('Lỗi kết thúc phiên', err.message || 'Không thể chốt phiên làm việc');
    } finally {
      setSessionLoading(false);
    }
  };

  const sessionTotalHours = useMemo(() => {
    return parseFloat(
      sessionList
        .filter((s) => s.status === 'COMPLETED' || s.status === 'AUTO_CLOSED')
        .reduce((sum, s) => sum + (s.durationHours || 0), 0)
        .toFixed(2)
    );
  }, [sessionList]);

  const sessionUserSummary = useMemo(() => {
    const map: Record<string, { userName: string; sessionCount: number; totalHours: number }> = {};
    sessionList.forEach((s) => {
      const uName = s.user?.name || 'Kỹ thuật viên';
      if (!map[uName]) {
        map[uName] = { userName: uName, sessionCount: 0, totalHours: 0 };
      }
      if (s.status === 'COMPLETED' || s.status === 'AUTO_CLOSED') {
        map[uName].sessionCount += 1;
        map[uName].totalHours = parseFloat((map[uName].totalHours + (s.durationHours || 0)).toFixed(2));
      }
    });
    return Object.values(map);
  }, [sessionList]);

  return {
    actionLoading, allUsers, assignableUsers, assignedExecutorId, assignedExecutorIds, setAssignedExecutorIds, canModify,
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
    sessionTotalHours, sessionUserSummary, loadSessionsData,
  };
};
