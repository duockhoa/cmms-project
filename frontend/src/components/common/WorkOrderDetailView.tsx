import React, { useState, useEffect } from 'react';
import { api, API_HOST } from '../../services/api';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { Play, Pause, CheckCircle2, FileText, Camera, Upload, Plus, AlertTriangle, Eye, Loader2, ArrowRightLeft, ShieldCheck, XOctagon } from 'lucide-react';

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
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Reject Handover Modal State
  const [isRejectHandoverOpen, setIsRejectHandoverOpen] = useState(false);
  const [rejectHandoverReason, setRejectHandoverReason] = useState('');

  const getPerformerUnitType = (user: any): 'WORKSHOP' | 'TECHNICAL' | 'MAINTENANCE' => {
    if (!user) return 'MAINTENANCE';
    const dept = (user.department || '').toLowerCase();
    if (dept.includes('xưởng') || dept.includes('workshop') || user.role === 'OPERATOR') {
      return 'WORKSHOP';
    }
    if (dept.includes('kỹ thuật') || dept.includes('technical') || user.role === 'ADMIN' || user.role === 'MANAGER') {
      return 'TECHNICAL';
    }
    return 'MAINTENANCE';
  };

  const userUnitType = getPerformerUnitType(currentUser);

  const loadData = async () => {
    try {
      setLoading(true);
      const woData = await api.getWorkOrderById(workOrderId);
      setWo(woData);
      
      const logData = await api.getWorkOrderRepairLogs(workOrderId);
      setLogs(logData);

      // Load technicians if user is manager, admin, or technical
      const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
      if (isManagerOrAdmin || userUnitType === 'TECHNICAL') {
        const techs = await api.getUsers({ role: 'TECHNICIAN' });
        setTechnicians(techs);
        if (techs.length > 0 && !assignedExecutorId) {
          setAssignedExecutorId(techs[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải chi tiết Work Order');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workOrderId) {
      loadData();
    }
  }, [workOrderId]);

  if (loading || !wo) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px auto' }} size={24} />
          Đang tải chi tiết lệnh sửa chữa...
        </div>
      </div>
    );
  }

  // Permission Checks
  const isAssigned = wo.assignedTechnicianId === currentUser?.id;
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  
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

    const tech = technicians.find(t => t.id === assignedExecutorId);
    try {
      setActionLoading(true);
      await (api as any).assignExecutor(wo.id, {
        expectedVersion: wo.version,
        assignedTechnicianId: assignedExecutorId,
        technicianName: tech ? tech.name : undefined,
      });
      toast.success('Phân công thành công', `Đã phân công Cơ điện: ${tech ? tech.name : 'Kỹ thuật viên'}.`);
      setIsAssignExecutorOpen(false);
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptHandover = async () => {
    try {
      setActionLoading(true);
      await (api as any).acceptHandover(wo.id, { expectedVersion: wo.version });
      toast.success('Đã nghiệm thu nhận bàn giao', 'Đã chuyển trạng thái sang Đã nghiệm thu (VERIFIED).');
      if (onStatusChangeSuccess) onStatusChangeSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
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
      toast.success('Từ chối bàn giao thành công', 'Đã chuyển trả phiếu về Đang sửa chữa cho Cơ điện.');
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
        opacity: disabled ? 0.5 : 1, width: '90px'
      }}
    >
      <div style={{ 
        width: '50px', height: '50px', borderRadius: '50%', backgroundColor: color, 
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
             {wo.status === 'PENDING' && wo.classificationResult === 'MAINTENANCE_REQUIRED' && !wo.assignedTechnicianId && (userUnitType === 'TECHNICAL' || isManagerOrAdmin) && (
               <ActionButton onClick={() => setIsAssignExecutorOpen(true)} disabled={actionLoading} icon={Plus} label="Phân công Cơ điện" color="#3b82f6" />
             )}

             {/* Accept/Reject Handover */}
             {wo.status === 'COMPLETED' && wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' && (userUnitType === 'WORKSHOP' || isManagerOrAdmin) && (
               <>
                 <ActionButton onClick={handleAcceptHandover} disabled={actionLoading} icon={ShieldCheck} label="Nghiệm thu bàn giao" color="#059669" />
                 <ActionButton onClick={() => setIsRejectHandoverOpen(true)} disabled={actionLoading} icon={XOctagon} label="Từ chối bàn giao" color="#ef4444" />
               </>
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
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Kỹ thuật viên</td>
                <td style={{ padding: '12px 0' }}>{wo.technicianName || 'Chưa phân công'}</td>
              </tr>
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
                  if (log.actionType === 'HANDOVER_ACCEPT') badgeColor = '#059669';
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

      {/* 1. Modal Thêm ghi nhận sửa chữa */}
      {isLogFormOpen && (
        <Modal isOpen={isLogFormOpen} onClose={() => setIsLogFormOpen(false)} title={logAdjustTargetId ? "Điều chỉnh ghi nhận sửa chữa" : "Ghi nhận thao tác xử lý & Ảnh chụp"}>
          <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {logAdjustTargetId && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#ef4444', fontWeight: 700 }}>Lý do điều chỉnh *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ghi sai số đo, nhầm lẫn linh kiện..." 
                  value={logAdjustReason} 
                  onChange={(e) => setLogAdjustReason(e.target.value)} 
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nội dung thao tác xử lý *</label>
              <textarea 
                className="form-input" 
                rows={3} 
                required 
                placeholder="Ví dụ: Kiểm tra điện áp và đo đạc thông số dòng..." 
                value={logContent} 
                onChange={(e) => setLogContent(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết quả sau thao tác (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ví dụ: Điện áp ổn định ở mức 220V..." 
                value={logResult} 
                onChange={(e) => setLogResult(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú thêm (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Các lưu ý hoặc thông số kỹ thuật khác..." 
                value={logNotes} 
                onChange={(e) => setLogNotes(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Chọn phân loại ảnh đính kèm</label>
              <select className="form-select" value={logPhotoCategory} onChange={(e) => setLogPhotoCategory(e.target.value as any)}>
                <option value="BEFORE">Ảnh trước sửa chữa (BEFORE)</option>
                <option value="DURING">Ảnh trong quá trình (DURING)</option>
                <option value="AFTER">Ảnh sau sửa chữa (AFTER)</option>
                <option value="OTHER">Ảnh khác (OTHER)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Camera size={18} /> Chụp / Chọn ảnh đính kèm (Có thể chọn nhiều)
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="form-input" 
                onChange={(e) => setLogPhotos(e.target.files)} 
              />
              {logPhotos && logPhotos.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-success)', marginTop: '4px', fontWeight: 600 }}>
                  Đã chọn {logPhotos.length} file ảnh.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsLogFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Lưu ghi nhận"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Modal Tạm dừng sửa chữa */}
      {isPauseFormOpen && (
        <Modal isOpen={isPauseFormOpen} onClose={() => setIsPauseFormOpen(false)} title="Xác nhận Tạm dừng sửa chữa">
          <form onSubmit={handlePauseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn lý do tạm dừng sửa chữa *</label>
              <select className="form-select" value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}>
                <option value="Chờ phụ tùng">Chờ phụ tùng</option>
                <option value="Chờ sản xuất bàn giao thiết bị">Chờ sản xuất bàn giao thiết bị</option>
                <option value="Chờ hỗ trợ kỹ thuật">Chờ hỗ trợ kỹ thuật</option>
                <option value="Chờ phê duyệt">Chờ phê duyệt</option>
                <option value="Hết ca">Hết ca</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            {pauseReason === 'Lý do khác' && (
              <div className="form-group">
                <label className="form-label">Nhập chi tiết lý do khác *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Nhập lý do tạm dừng chi tiết..." 
                  value={customPauseReason} 
                  onChange={(e) => setCustomPauseReason(e.target.value)} 
                />
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPauseFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận tạm dừng"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Modal Hoàn thành sửa chữa / Đề nghị bàn giao */}
      {isCompleteFormOpen && (
        <Modal isOpen={isCompleteFormOpen} onClose={() => setIsCompleteFormOpen(false)} title={wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Đề nghị bàn giao kỹ thuật" : "Xác nhận hoàn thành sửa chữa"}>
          <form onSubmit={handleCompleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
            
            <div className="form-group">
              <label className="form-label">Nội dung công việc sửa chữa đã thực hiện *</label>
              <textarea 
                className="form-input" 
                rows={3} 
                required 
                placeholder="Ví dụ: Đã thay thế cầu chì nguồn và hiệu chỉnh cảm biến tiệm cận..." 
                value={completeWorkDone} 
                onChange={(e) => setCompleteWorkDone(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tình trạng thiết bị sau sửa chữa *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="Ví dụ: Thiết bị hoạt động ổn định, đủ áp lực khí..." 
                value={completeEquipmentStatus} 
                onChange={(e) => setCompleteEquipmentStatus(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết quả chạy thử / Kiểm tra test tải *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="Ví dụ: Chạy thử liên tục 15 phút, không phát sinh nhiệt cao hay lỗi báo động..." 
                value={completeTestResult} 
                onChange={(e) => setCompleteTestResult(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết luận nghiệm thu kỹ thuật *</label>
              <select className="form-select" value={completeConclusion} onChange={(e) => setCompleteConclusion(e.target.value)}>
                <option value="Hoạt động bình thường">Hoạt động bình thường</option>
                <option value="Hoạt động có điều kiện">Hoạt động có điều kiện</option>
                <option value="Chưa khắc phục hoàn toàn">Chưa khắc phục hoàn toàn</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Khuyến nghị hoặc các công việc tiếp theo (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ví dụ: Cần theo dõi thêm bộ phận motor sau 1 tuần chạy..." 
                value={completeRecommendation} 
                onChange={(e) => setCompleteRecommendation(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Camera size={18} /> Ảnh chụp sau sửa chữa / Nghiệm thu (Tùy chọn)
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="form-input" 
                onChange={(e) => setCompletePhotos(e.target.files)} 
              />
              {completePhotos && completePhotos.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-success)', marginTop: '4px', fontWeight: 600 }}>
                  Đã chọn {completePhotos.length} file ảnh AFTER.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-success" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : (wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Gửi đề nghị bàn giao" : "Xác nhận hoàn thành")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Modal Yêu cầu hỗ trợ kỹ thuật (Escalate) */}
      {isEscalateOpen && (
        <Modal isOpen={isEscalateOpen} onClose={() => setIsEscalateOpen(false)} title="Yêu cầu hỗ trợ kỹ thuật (Phòng Cơ điện)">
          <form onSubmit={handleEscalateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Lý do yêu cầu hỗ trợ kỹ thuật *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Ví dụ: Lỗi bo mạch điện tử phức tạp, cần máy móc kiểm tra chuyên sâu..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEscalateOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Gửi yêu cầu hỗ trợ"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. Modal Phân loại sự cố (Classify) */}
      {isClassifyOpen && (
        <Modal isOpen={isClassifyOpen} onClose={() => setIsClassifyOpen(false)} title="Phân loại phương án xử lý sự cố">
          <form onSubmit={handleClassifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn phương án xử lý *</label>
              <select className="form-select" value={classificationResult} onChange={(e) => setClassificationResult(e.target.value as any)}>
                <option value="WORKSHOP_CONTINUE">Xưởng tiếp tục tự xử lý (WORKSHOP_CONTINUE)</option>
                <option value="MAINTENANCE_REQUIRED">Yêu cầu Cơ điện sửa chữa chuyên nghiệp (MAINTENANCE_REQUIRED)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú nhận xét phân loại (Tùy chọn)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Ghi chú đánh giá tình trạng lỗi hoặc chỉ dẫn thực hiện..."
                value={classificationNotes}
                onChange={(e) => setClassificationNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsClassifyOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận phân loại"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Modal Phân công kỹ thuật Cơ điện */}
      {isAssignExecutorOpen && (
        <Modal isOpen={isAssignExecutorOpen} onClose={() => setIsAssignExecutorOpen(false)} title="Phân công kỹ thuật viên Cơ điện">
          <form onSubmit={handleAssignExecutorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn kỹ thuật viên *</label>
              <select className="form-select" value={assignedExecutorId} onChange={(e) => setAssignedExecutorId(e.target.value)}>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.specialty || 'Kỹ thuật viên'})</option>
                ))}
              </select>
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAssignExecutorOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận phân công"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Modal Từ chối nhận bàn giao */}
      {isRejectHandoverOpen && (
        <Modal isOpen={isRejectHandoverOpen} onClose={() => setIsRejectHandoverOpen(false)} title="Từ chối nhận bàn giao nghiệm thu">
          <form onSubmit={handleRejectHandoverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Lý do từ chối nhận bàn giao *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Ví dụ: Thiết bị chạy thử vẫn bị rung động mạnh, chưa đạt yêu cầu..."
                value={rejectHandoverReason}
                onChange={(e) => setRejectHandoverReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRejectHandoverOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận từ chối"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
