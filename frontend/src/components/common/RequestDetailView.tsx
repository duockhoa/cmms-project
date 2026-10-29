import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { CheckCircle, XCircle, RotateCcw, Send, Ban, Loader2, XOctagon, Cpu, Edit2, Trash2, Lock, MapPin, Building2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { DetailViewSkeleton } from './Skeleton';

interface RequestDetailViewProps {
  requestId: string;
  currentUser: any;
  users: any[];
  onActionSuccess: () => void;
  onClose: () => void;
  onEdit?: (request: any) => void;
  onDelete?: (request: any) => void;
}

export const RequestDetailView: React.FC<RequestDetailViewProps> = ({
  requestId,
  currentUser,
  users,
  onActionSuccess,
  onClose,
  onEdit,
  onDelete,
}) => {
  const toast = useToast();
  const [req, setReq] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for actions
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [handlerType, setHandlerType] = useState<'WORKSHOP' | 'EXTERNAL_DEPT'>('WORKSHOP');
  const [internalDepartment, setInternalDepartment] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [assignedTechnicianIds, setAssignedTechnicianIds] = useState<string[]>([]);
  const [supporterIds, setSupporterIds] = useState<string[]>([]);
  const [watcherId, setWatcherId] = useState('');
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);

  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitFields, setResubmitFields] = useState<any>({});
  const [resubmitComment, setResubmitComment] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  const { can, isAdmin, user: authUser } = usePermissions();
  const effectiveUser = currentUser || authUser;

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, h, depts] = await Promise.all([
        api.getRequestById(requestId),
        api.getRequestHistory(requestId),
        api.getDepartments().catch(() => []),
      ]);
      setReq(data);
      setHistory(h);
      setDepartmentsList(depts);

      const reqDept = (data?.department || data?.equipment?.department || '').trim();
      if (reqDept) {
        setInternalDepartment(reqDept);
      }

      const otherDepts = depts.filter((d: string) => d.trim().toLowerCase() !== reqDept.toLowerCase());
      if (otherDepts.length > 0 && !targetDepartment) {
        setTargetDepartment(otherDepts[0]);
      }
    } catch (err: any) {
      toast.error('Lỗi tải chi tiết', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) loadData();
  }, [requestId]);

  // Bộ phận sở tại phát sinh sự cố (Bộ phận của người báo cáo / thiết bị)
  const reqDepartment = (req?.department || req?.equipment?.department || internalDepartment || '').trim();
  // Vị trí địa lý đặt thiết bị trong nhà máy
  const equipmentLocation = req?.equipment?.location || 'Chưa cập nhật vị trí';

  // Xác định thẩm quyền phê duyệt: Quản trị viên (Toàn quyền) HOẶC Quản lý thuộc/kiêm nhiệm bộ phận sự cố
  const isGlobalManager = isAdmin || can('ALL') || can('*');
  const extractDepts = (u: any): string[] => {
    if (!u) return [];
    const raw: string[] = [];
    if (typeof u.department === 'string' && u.department.trim()) {
      raw.push(...u.department.split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean));
    }
    if (Array.isArray(u.managedDepartments)) {
      raw.push(...u.managedDepartments.map((s: any) => String(s || '').trim()).filter(Boolean));
    } else if (typeof u.managedDepartments === 'string' && u.managedDepartments.trim()) {
      try {
        const parsed = JSON.parse(u.managedDepartments);
        if (Array.isArray(parsed)) raw.push(...parsed.map((s: any) => String(s || '').trim()).filter(Boolean));
      } catch {
        raw.push(...u.managedDepartments.split(/[,;|]+/).map((s: string) => s.trim()).filter(Boolean));
      }
    }
    return Array.from(new Set(raw.map((d) => d.toLowerCase())));
  };

  const userDeptList = extractDepts(effectiveUser);
  const candidateReqDepts = [req?.department, req?.equipment?.department, internalDepartment]
    .map((d) => (d || '').trim().toLowerCase())
    .filter(Boolean);
  const isDepartmentMatch = Boolean(
    userDeptList.length > 0 &&
    candidateReqDepts.length > 0 &&
    candidateReqDepts.some((rd) => userDeptList.includes(rd))
  );

  const canApprove = isGlobalManager || (can('requests:approve') && isDepartmentMatch);
  const canReject = isGlobalManager || (can('requests:reject') && isDepartmentMatch);

  // Chỉ lấy nhân sự thuộc hoặc kiêm nhiệm bộ phận sở tại khi xử lý nội bộ
  const internalUsers = React.useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    if (!reqDepartment) return [];
    const target = reqDepartment.toLowerCase();
    return users.filter((u: any) => {
      if (u.isActive === false) return false;
      const uDepts = extractDepts(u);
      return uDepts.includes(target);
    });
  }, [users, reqDepartment]);

  // Danh sách các bộ phận khác để chuyển giao (hoàn toàn động từ API, loại trừ bộ phận sở tại)
  const externalDepartments = React.useMemo(() => {
    if (!departmentsList || !Array.isArray(departmentsList)) return [];
    const current = reqDepartment.toLowerCase();
    return departmentsList.filter((dept) => {
      if (!dept) return false;
      return dept.trim().toLowerCase() !== current;
    });
  }, [departmentsList, reqDepartment]);

  const handleApproveConfirm = async () => {
    try {
      const firstTech = internalUsers.find((u: any) => assignedTechnicianIds.includes(u.id));
      await api.approveRequest(req.id, { 
        handlerType,
        targetDepartment: handlerType === 'EXTERNAL_DEPT' ? targetDepartment : undefined,
        assignedTechnicianIds: handlerType === 'WORKSHOP' && assignedTechnicianIds.length > 0 ? assignedTechnicianIds : undefined,
        assignedTechnicianId: handlerType === 'WORKSHOP' && assignedTechnicianIds.length > 0 ? assignedTechnicianIds[0] : undefined,
        technicianName: handlerType === 'WORKSHOP' && firstTech ? firstTech.name : undefined,
        supporterIds: handlerType === 'WORKSHOP' && supporterIds.length > 0 ? supporterIds : undefined,
        watcherId: handlerType === 'WORKSHOP' && watcherId ? watcherId : undefined,
      });
      setApproveModalOpen(false);
      setHandlerType('WORKSHOP');
      setAssignedTechnicianIds([]);
      setSupporterIds([]);
      setWatcherId('');
      toast.success(
        'Phê duyệt thành công', 
        handlerType === 'EXTERNAL_DEPT' 
          ? `Đã tạo phiếu bảo trì chuyển giao ${targetDepartment} ở trạng thái Chờ phân công.`
          : 'Đã tạo phiếu bảo trì cho phân xưởng tự xử lý.'
      );
      onActionSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi phê duyệt', err.message);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Nhập lý do từ chối:');
    if (reason) {
      try {
        await api.rejectRequest(req.id, { reason });
        toast.success('Thành công', 'Đã từ chối yêu cầu.');
        onActionSuccess();
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message);
      }
    }
  };

  const handleReturn = async () => {
    const reason = prompt('Nhập lý do trả lại:');
    if (reason) {
      try {
        await api.returnRequest(req.id, {
          reason: reason.trim(),
          expectedVersion: req.version,
          actedById: getActiveUserId(),
        });
        toast.success('Thành công', 'Đã trả lại yêu cầu.');
        onActionSuccess();
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message);
      }
    }
  };

  const openResubmit = () => {
    setResubmitFields({
      title: req.title,
      description: req.description,
      priority: req.priority,
    });
    setResubmitComment('');
    setResubmitModalOpen(true);
  };

  const handleResubmitConfirm = async () => {
    try {
      await api.resubmitRequest(req.id, {
        expectedVersion: req.version,
        actedById: getActiveUserId(),
        comment: resubmitComment || 'Đã bổ sung thông tin',
        updatedFields: resubmitFields,
      });
      setResubmitModalOpen(false);
      toast.success('Thành công', 'Đã tái gửi yêu cầu.');
      onActionSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập lý do hủy bản ghi.');
      return;
    }
    try {
      setIsCancelling(true);
      await api.cancelRequest(req.id, {
        reason: cancelReason.trim(),
        expectedVersion: req.version,
      });
      toast.success('Thành công', 'Đã đánh dấu hủy bản ghi báo sự cố.');
      setCancelModalOpen(false);
      setCancelReason('');
      onActionSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi hủy yêu cầu', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading || !req) {
    return (
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <DetailViewSkeleton />
      </div>
    );
  }

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

  const hasClosedWorkOrder = Boolean(req.workOrders?.some((wo: any) => ['CLOSED', 'VERIFIED'].includes(wo.status)));
  const isOwner = Boolean(effectiveUser?.id && req.reporterId === effectiveUser.id && ['PENDING', 'RETURNED'].includes(req.status));
  const canCancel = !['CANCELLED', 'CLOSED'].includes(req.status) && !hasClosedWorkOrder && (isGlobalManager || (can('requests:cancel') && isDepartmentMatch) || isOwner);
  const isLocked = req.status === 'CLOSED' || req.status === 'CANCELLED' || (req.workOrders && req.workOrders.length > 0);

  return (
    <div className="request-detail-view" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          {req.title} <span style={{ color: 'var(--text-muted)' }}>- {req.requestCode}</span>
        </h2>
        <button onClick={onClose} className="btn-icon">
          <XOctagon size={18} />
        </button>
      </div>

      <div className="request-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Top Header Card - Action Grid */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
             Các thao tác
           </h3>
           
           {req.status === 'CANCELLED' ? (
             <div style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               gap: '10px',
               padding: '18px 24px',
               backgroundColor: 'rgba(239, 68, 68, 0.08)',
               border: '1px solid rgba(239, 68, 68, 0.3)',
               borderRadius: '10px',
               textAlign: 'center',
               maxWidth: '620px',
               margin: '0 auto',
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: '#dc2626' }}>
                 <Ban size={18} />
                 <span>Bản ghi sự cố đã bị đánh dấu hủy</span>
               </div>
               <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                 {req.cancelledReason && (
                   <div style={{ marginBottom: '6px' }}>
                     <strong>Lý do hủy:</strong> {req.cancelledReason}
                   </div>
                 )}
                 <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                   {req.cancelledBy?.name && <span>Người hủy: <strong>{req.cancelledBy.name}</strong> • </span>}
                   {req.cancelledAt && <span>Thời gian: {new Date(req.cancelledAt).toLocaleString('vi-VN')}</span>}
                 </div>
               </div>
             </div>
           ) : req.status === 'CLOSED' ? (
             <div style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               gap: '10px',
               padding: '18px 24px',
               backgroundColor: 'rgba(16, 185, 129, 0.08)',
               border: '1px solid rgba(16, 185, 129, 0.3)',
               borderRadius: '10px',
               textAlign: 'center',
               maxWidth: '620px',
               margin: '0 auto',
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px', color: '#059669' }}>
                 <Lock size={18} />
                 <span>Yêu cầu đã Đóng & Nghiệm thu hoàn tất</span>
               </div>
               <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                 Phiếu sửa chữa liên kết đến sự cố này đã hoàn thành nghiệm thu. Yêu cầu báo sự cố đã tự động chuyển sang trạng thái <strong>ĐÃ ĐÓNG</strong> và bị khóa toàn bộ thao tác nhằm đảm bảo tính toàn vẹn dữ liệu bảo trì GMP.
               </div>
             </div>
           ) : (
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
               {req.status === 'PENDING' && (
                 <>
                   {canApprove && (
                     <ActionButton onClick={() => setApproveModalOpen(true)} icon={CheckCircle} label="Duyệt" color="#10b981" />
                   )}
                   {canReject && (
                     <>
                       <ActionButton onClick={handleReject} icon={XCircle} label="Từ chối" color="#ef4444" />
                       <ActionButton onClick={handleReturn} icon={RotateCcw} label="Trả lại" color="#f59e0b" />
                     </>
                   )}
                   {!canApprove && !canReject && !canCancel && (
                     <div style={{ 
                       display: 'inline-flex', alignItems: 'center', gap: '8px', 
                       padding: '10px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', 
                       border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)' 
                     }}>
                       <ShieldAlert size={16} style={{ color: '#d97706' }} />
                       <span>
                         Sự cố thuộc bộ phận <strong>{reqDepartment || 'chưa xác định'}</strong>. Chỉ Quản lý bộ phận này hoặc Quản trị viên mới có quyền phê duyệt.
                       </span>
                     </div>
                   )}
                 </>
               )}

               {req.status === 'RETURNED' && (
                 <ActionButton onClick={openResubmit} icon={Send} label="Tái gửi" color="#3b82f6" />
               )}

               {canCancel && (
                 <ActionButton onClick={() => setCancelModalOpen(true)} icon={Ban} label="Đánh dấu hủy" color="#ef4444" />
               )}

               {/* Thao tác Chỉnh sửa & Xóa - Chỉ cho phép khi chưa khóa và chưa có Work Order */}
               {!isLocked && onEdit && (
                 <ActionButton onClick={() => onEdit(req)} icon={Edit2} label="Chỉnh sửa" color="#3b82f6" />
               )}

               {!isLocked && onDelete && (
                 <ActionButton onClick={() => onDelete(req)} icon={Trash2} label="Xóa sự cố" color="#dc2626" />
               )}

               {['APPROVED', 'REJECTED'].includes(req.status) && (!onEdit || isLocked) && !canCancel && (
                 <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   {isLocked && <Lock size={14} />} Yêu cầu này đã được phê duyệt hoặc chuyển thành phiếu sửa chữa. Thao tác đã khóa.
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Metadata Table */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a' }}>Thông tin Yêu cầu</h3>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', width: '25%', color: 'var(--text-secondary)' }}>Mã yêu cầu</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.requestCode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tiêu đề</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.title}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thiết bị</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.equipment?.code} - {req.equipment?.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Cụm chức năng lỗi</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>
                  {req.functionalUnit ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#1d4ed8' }}>
                      <Cpu size={15} />
                      <span>{req.functionalUnit.name} {req.functionalUnit.code ? `(${req.functionalUnit.code})` : ''}</span>
                      {req.functionalUnit.libraryItem?.category && (
                        <span className="badge" style={{ fontSize: '11px', marginLeft: '4px' }}>
                          {req.functionalUnit.libraryItem.category}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Toàn bộ thiết bị / Chưa phân loại cụm
                    </span>
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
                <td style={{ padding: '12px 0' }}>
                  <StatusBadge status={req.status} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</td>
                <td style={{ padding: '12px 0' }}>
                  <StatusBadge status={req.priority} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Bộ phận phát sinh</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>
                  <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={13} /> {reqDepartment || 'Chưa cập nhật'}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Vị trí đặt máy</td>
                <td style={{ padding: '12px 0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                    <MapPin size={13} style={{ color: '#dc2626' }} /> {equipmentLocation}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người báo</td>
                <td style={{ padding: '12px 0' }}>{req.reporterName} {req.department ? `(${req.department})` : ''}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Version</td>
                <td style={{ padding: '12px 0' }}>{req.version}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mô tả chi tiết</td>
                <td style={{ padding: '12px 0' }}>{req.description}</td>
              </tr>
              
              {/* Phiếu sửa chữa liên kết nếu có */}
              {req.workOrders && req.workOrders.length > 0 && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Phiếu sửa chữa liên kết</td>
                  <td style={{ padding: '12px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {req.workOrders.map((wo: any) => (
                        <div key={wo.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{wo.code}</span>
                          <StatusBadge status={wo.status} />
                          {wo.title && <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>- {wo.title}</span>}
                          {wo.assignedTechnicianName && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(KTV: {wo.assignedTechnicianName})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Lý do trả/từ chối/huỷ nếu có */}
              {req.returnedReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do trả lại</td>
                  <td style={{ padding: '12px 0', color: 'var(--danger)', fontWeight: 600 }}>{req.returnedReason}</td>
                </tr>
              )}
              {req.rejectedReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do từ chối</td>
                  <td style={{ padding: '12px 0', color: 'var(--danger)', fontWeight: 600 }}>{req.rejectedReason}</td>
                </tr>
              )}
              {req.cancelledReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do hủy</td>
                  <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{req.cancelledReason}</td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Timeline Lịch sử */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', color: '#1e3a8a' }}>Lịch sử chuyển trạng thái</h3>
          <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
            <div style={{ position: 'absolute', left: '6px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
            
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có lịch sử trạng thái.</div>
            ) : (
              history.map((h: any) => {
                return (
                  <div key={h.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#6b7280', border: '3px solid var(--bg-card)', zIndex: 10 }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                          {h.action}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Trạng thái: <strong>{h.fromStatus || '---'}</strong> &rarr; <strong>{h.toStatus || '---'}</strong>
                      </div>
                      
                      {h.reason && <div style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '4px' }}>Lý do: {h.reason}</div>}
                      {h.comment && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ghi chú: {h.comment}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Approve Modal */}
      {approveModalOpen && (
        <Modal 
          isOpen={approveModalOpen} 
          onClose={() => { setApproveModalOpen(false); setHandlerType('WORKSHOP'); setAssignedTechnicianIds([]); setSupporterIds([]); setWatcherId(''); }} 
          title={`Phê duyệt yêu cầu: ${req.requestCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div><strong>Thiết bị:</strong> {req.equipment?.name} ({req.equipment?.code})</div>
              <div style={{ marginTop: '4px' }}><strong>Vị trí đặt máy:</strong> <span style={{ marginLeft: '4px', fontWeight: 600 }}>{equipmentLocation}</span></div>
              <div style={{ marginTop: '4px' }}><strong>Bộ phận sở tại:</strong> <span className="badge badge-secondary" style={{ marginLeft: '4px' }}>{reqDepartment || 'Chưa cập nhật'}</span></div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Phương án xử lý sự cố *</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: handlerType === 'WORKSHOP' ? '2px solid #2563eb' : '1px solid var(--border-color)', backgroundColor: handlerType === 'WORKSHOP' ? '#eff6ff' : '#ffffff', flex: 1 }}>
                  <input 
                    type="radio" 
                    name="handlerType" 
                    value="WORKSHOP" 
                    checked={handlerType === 'WORKSHOP'} 
                    onChange={() => setHandlerType('WORKSHOP')} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Tự xử lý</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: handlerType === 'EXTERNAL_DEPT' ? '2px solid #2563eb' : '1px solid var(--border-color)', backgroundColor: handlerType === 'EXTERNAL_DEPT' ? '#eff6ff' : '#ffffff', flex: 1 }}>
                  <input 
                    type="radio" 
                    name="handlerType" 
                    value="EXTERNAL_DEPT" 
                    checked={handlerType === 'EXTERNAL_DEPT'} 
                    onChange={() => setHandlerType('EXTERNAL_DEPT')} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Yêu cầu hỗ trợ</span>
                </label>
              </div>
            </div>

            {/* Trường hợp 1: Tự xử lý */}
            {handlerType === 'WORKSHOP' && (
              <>
                {/* Người phụ trách (có thể chọn nhiều) */}
                <div className="form-group">
                  <label className="form-label">Người phụ trách</label>
                  {internalUsers.length > 0 ? (
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                      {internalUsers.map((u: any) => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <input
                            type="checkbox"
                            checked={assignedTechnicianIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedTechnicianIds(prev => [...prev, u.id]);
                              } else {
                                setAssignedTechnicianIds(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span>{u.name} ({u.specialty || u.role || 'Nhân viên'})</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#b45309', padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                      Không có nhân sự thuộc bộ phận "{internalDepartment || reqDepartment}". WO sẽ ở trạng thái Chờ phân công.
                    </div>
                  )}
                  {assignedTechnicianIds.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Đã chọn: {assignedTechnicianIds.length} người</div>
                  )}
                </div>

                {/* Người hỗ trợ (không bắt buộc, có thể chọn nhiều) */}
                {internalUsers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Người hỗ trợ <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>(không bắt buộc)</span></label>
                    <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                      {internalUsers.filter((u: any) => !assignedTechnicianIds.includes(u.id)).map((u: any) => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <input
                            type="checkbox"
                            checked={supporterIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSupporterIds(prev => [...prev, u.id]);
                              } else {
                                setSupporterIds(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span>{u.name} ({u.specialty || u.role || 'Nhân viên'})</span>
                        </label>
                      ))}
                    </div>
                    {supporterIds.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Đã chọn: {supporterIds.length} người</div>
                    )}
                  </div>
                )}

                {/* Người theo dõi (không bắt buộc, 1 người) */}
                {internalUsers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Người theo dõi <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>(không bắt buộc)</span></label>
                    <select
                      className="form-select"
                      value={watcherId}
                      onChange={(e) => setWatcherId(e.target.value)}
                    >
                      <option value="">-- Chưa chỉ định --</option>
                      {internalUsers.filter((u: any) => !assignedTechnicianIds.includes(u.id) && !supporterIds.includes(u.id)).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.specialty || u.role || 'Nhân viên'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Trường hợp 2: Yêu cầu hỗ trợ */}
            {handlerType === 'EXTERNAL_DEPT' && (
              <div className="form-group">
                <label className="form-label">Chọn bộ phận tiếp nhận *</label>
                <select 
                  className="form-select" 
                  value={targetDepartment} 
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  required
                >
                  {externalDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  {externalDepartments.length === 0 && (
                    <option value="" disabled>-- Chưa có danh sách bộ phận khác --</option>
                  )}
                </select>
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setApproveModalOpen(false); setHandlerType('WORKSHOP'); setAssignedTechnicianIds([]); setSupporterIds([]); setWatcherId(''); }}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleApproveConfirm}
                style={{ fontWeight: 700 }}
              >
                Xác nhận Duyệt & Tạo Phiếu WO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resubmit Modal */}
      {resubmitModalOpen && (
        <Modal isOpen={resubmitModalOpen} onClose={() => setResubmitModalOpen(false)} title={`Tái gửi yêu cầu ${req.requestCode}`}>
          <div>
            <div className="form-group">
              <label className="form-label">Tiêu đề</label>
              <input type="text" className="form-input" value={resubmitFields.title || ''} onChange={(e) => setResubmitFields({ ...resubmitFields, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả chi tiết (bổ sung thêm thông tin)</label>
              <textarea className="form-textarea" rows={3} value={resubmitFields.description || ''} onChange={(e) => setResubmitFields({ ...resubmitFields, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mức độ ưu tiên</label>
              <select className="form-select" value={resubmitFields.priority || 'MEDIUM'} onChange={(e) => setResubmitFields({ ...resubmitFields, priority: e.target.value })}>
                <option value="URGENT">Khẩn cấp</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú bổ sung</label>
              <input type="text" className="form-input" value={resubmitComment} onChange={(e) => setResubmitComment(e.target.value)} placeholder="Đã bổ sung mô tả và hình ảnh..." />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setResubmitModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleResubmitConfirm}>
                <Send size={14} /> Tái gửi Yêu cầu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => { setCancelModalOpen(false); setCancelReason(''); }}
          title="Đánh dấu hủy bản ghi sự cố"
        >
          <div style={{ padding: '6px 0' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Bạn đang thực hiện đánh dấu hủy bản ghi báo sự cố <strong>{req.requestCode}</strong> ({req.title}).
            </p>
            {req.workOrders && req.workOrders.length > 0 && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                fontSize: '12.5px',
                color: '#b91c1c',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Lưu ý:</strong> Báo cáo sự cố này đã sinh phiếu sửa chữa <strong>{req.workOrders.map((w: any) => w.orderCode).join(', ')}</strong>. Khi đánh dấu hủy sự cố, các phiếu sửa chữa này cũng sẽ <strong>tự động bị hủy</strong> và không hiện trên danh sách phiếu sửa chữa nữa.
                </span>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Lý do đánh dấu hủy <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Nhập chi tiết lý do hủy bản ghi báo sai..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setCancelModalOpen(false); setCancelReason(''); }}
                disabled={isCancelling}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmCancel}
                disabled={isCancelling || !cancelReason.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isCancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
