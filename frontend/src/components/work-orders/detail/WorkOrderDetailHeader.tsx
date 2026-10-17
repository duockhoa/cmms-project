import React, { useState } from 'react';
import {
  ArrowRightLeft, CheckCircle2, Lock, Play, Square,
  ShieldCheck, XOctagon, Loader2, Ban
} from 'lucide-react';
import { usePermissions } from '../../../hooks/usePermissions';
import { Modal } from '../../common/Modal';
import { api } from '../../../services/api';
import { useToast } from '../../common/Toast';

const ActionButton = ({ onClick, disabled, icon: Icon, label, color }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      background: 'none',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }}
  >
    <div
      className="action-grid-btn"
      style={{
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        width: '44px',
        height: '44px'
      }}
    >
      <Icon size={22} />
    </div>
    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.3' }}>
      {label}
    </span>
  </button>
);

export const WorkOrderDetailHeader: React.FC<any> = ({
  actionLoading, canModify, isManagerOrAdmin, isQA,
  onClose, onReload, onStatusChangeSuccess, setIsAssignExecutorOpen, setIsClassifyOpen, setIsCompleteFormOpen,
  setIsEscalateOpen, setIsQaAcceptOpen,
  setIsQaRejectOpen, setIsRejectHandoverOpen, setIsWorkshopAcceptOpen,
  setQaComment, setQaRejectReason, setWorkshopComment, userUnitType, wo,
  // Work Session props
  mySession, sessionLoading, handleStartSession, handleOpenStopSession,
}) => {
  const { can, isAdmin, user: authUser } = usePermissions();
  const toast = useToast();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const isAssigned = Boolean(
    authUser?.id && (
      wo.assignedTechnicianId === authUser.id ||
      (Array.isArray(wo.assignedTechnicianIds) && wo.assignedTechnicianIds.includes(authUser.id))
    )
  );
  const canCancel = !['VERIFIED', 'CLOSED', 'CANCELLED'].includes(wo.status) && (
    isAdmin ||
    can('work_orders:cancel') ||
    can('ALL') ||
    can('*') ||
    (['PENDING', 'ASSIGNED'].includes(wo.status) && (isAssigned || isManagerOrAdmin))
  );

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập lý do đánh dấu hủy phiếu bảo trì.');
      return;
    }
    try {
      setIsCancelling(true);
      await api.cancelWorkOrder(wo.id, {
        reason: cancelReason.trim(),
        expectedVersion: wo.version,
      });
      toast.success('Thành công', `Đã đánh dấu hủy phiếu bảo trì ${wo.orderCode}.`);
      setIsCancelModalOpen(false);
      setCancelReason('');
      if (onReload) onReload();
      if (onStatusChangeSuccess) onStatusChangeSuccess();
    } catch (err: any) {
      toast.error('Lỗi hủy phiếu bảo trì', err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const isWorkingStatus = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(wo.status);

  const eqName = wo.equipment?.name?.trim() || '';
  const eqCode = wo.equipment?.code?.trim() || '';
  const eqInfo = eqName ? `${eqName}${eqCode ? ` (${eqCode})` : ''}` : '';
  const hasEquipmentInTitle = eqName && wo.title?.toLowerCase().includes(eqName.toLowerCase());
  const displayTitle = hasEquipmentInTitle
    ? wo.title
    : `${wo.title}${eqInfo ? ` – ${eqInfo}` : ''}`;

  return (
    <>
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          {displayTitle} <span style={{ color: 'var(--text-muted)' }}>– {wo.orderCode}</span>
        </h2>
        {onClose && (
          <button onClick={onClose} className="btn-icon">
            <XOctagon size={18} />
          </button>
        )}
      </div>

      {/* Top Header Card - Action Grid */}
      <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
          {displayTitle} – {wo.orderCode}
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>

          {/* Phiên làm việc (Session Start / Stop) */}
          {canModify && isWorkingStatus && (
            <>
              {!mySession ? (
                <ActionButton
                  onClick={() => handleStartSession?.()}
                  disabled={actionLoading || sessionLoading}
                  icon={sessionLoading ? Loader2 : Play}
                  label="Bắt đầu làm việc"
                  color="#10b981"
                />
              ) : (
                <ActionButton
                  onClick={() => handleOpenStopSession?.()}
                  disabled={actionLoading || sessionLoading}
                  icon={Square}
                  label="Kết thúc phiên"
                  color="#f59e0b"
                />
              )}

              {/* Hoàn thành sửa / Bàn giao */}
              {wo.status === 'IN_PROGRESS' && (
                <ActionButton
                  onClick={() => setIsCompleteFormOpen(true)}
                  disabled={actionLoading}
                  icon={CheckCircle2}
                  label={wo?.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? 'Đề nghị bàn giao' : 'Hoàn thành sửa'}
                  color="#2563eb"
                />
              )}
            </>
          )}

          {/* Escalate */}
          {wo?.handlingRoute === 'WORKSHOP_SELF_HANDLE' && isWorkingStatus && (userUnitType === 'WORKSHOP' || isManagerOrAdmin) && (
            <ActionButton onClick={() => setIsEscalateOpen(true)} disabled={actionLoading} icon={ArrowRightLeft} label="Yêu cầu hỗ trợ" color="#ef4444" />
          )}

          {/* Classify - Chỉ áp dụng cho sự cố từ xưởng cần phân loại tuyến, KHÔNG áp dụng cho lịch bảo trì định kỳ */}
          {!wo.scheduleId && !wo.title?.startsWith('[Định kỳ]') && wo.handlingRoute !== 'TECHNICAL_MAINTENANCE_SUPPORT' && wo.status === 'PENDING' && !wo.classificationResult && (userUnitType === 'TECHNICAL' || isManagerOrAdmin) && (
            <ActionButton onClick={() => setIsClassifyOpen(true)} disabled={actionLoading} icon={ShieldCheck} label="Phân loại sự cố" color="#f59e0b" />
          )}

          {/* Assign */}
          {wo.status === 'PENDING' && !wo.assignedTechnicianId && (
            <ActionButton
              onClick={() => setIsAssignExecutorOpen(true)}
              disabled={actionLoading}
              icon={Play}
              label={wo?.handlingRoute === 'WORKSHOP_SELF_HANDLE' ? "Phân công nội bộ xưởng" : "Phân công Kỹ thuật / Cơ điện"}
              color="#3b82f6"
            />
          )}
          {['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(wo.status) && wo.assignedTechnicianId && (isManagerOrAdmin || userUnitType === 'TECHNICAL') && (
            <ActionButton
              onClick={() => setIsAssignExecutorOpen(true)}
              disabled={actionLoading}
              icon={ArrowRightLeft}
              label={['IN_PROGRESS', 'ON_HOLD'].includes(wo.status) ? 'Thêm / Đổi nhân sự' : 'Đổi người phụ trách'}
              color="#6366f1"
            />
          )}

          {/* Accept/Reject Handover */}
          {wo?.status === 'COMPLETED' && (userUnitType === 'WORKSHOP' || isManagerOrAdmin || wo?.handlingRoute === 'WORKSHOP_SELF_HANDLE') && (
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

          {wo.status === 'CANCELLED' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              width: '100%',
              maxWidth: '600px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#dc2626' }}>
                <Ban size={18} />
                <span>Phiếu bảo trì / sửa chữa đã bị đánh dấu hủy</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {wo.cancelledReason && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Lý do hủy:</strong> {wo.cancelledReason}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {wo.cancelledBy?.name && <span>Người hủy: <strong>{wo.cancelledBy.name}</strong> • </span>}
                  {wo.cancelledAt && <span>Thời gian: {new Date(wo.cancelledAt).toLocaleString('vi-VN')}</span>}
                </div>
              </div>
            </div>
          )}

          {canCancel && (
            <ActionButton
              onClick={() => setIsCancelModalOpen(true)}
              disabled={actionLoading}
              icon={Ban}
              label="Đánh dấu hủy"
              color="#ef4444"
            />
          )}

        </div>
      </div>

      {/* ── MODAL ĐÁNH DẤU HỦY PHIẾU BẢO TRÌ ── */}
      {isCancelModalOpen && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
          title="Đánh dấu hủy phiếu bảo trì / sửa chữa"
        >
          <div style={{ padding: '6px 0' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Bạn đang thực hiện đánh dấu hủy phiếu <strong>{wo.orderCode}</strong> ({wo.title}) của thiết bị <strong>{wo.equipment?.name}</strong>. Phiếu sau khi hủy sẽ bị ẩn khỏi danh sách mặc định và chỉ xuất hiện khi lọc theo trạng thái "Đã hủy".
            </p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Lý do đánh dấu hủy <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Nhập chi tiết lý do hủy phiếu tạo sai..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setIsCancelModalOpen(false); setCancelReason(''); }}
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
    </>
  );
};
