import React from 'react';
import {
  ArrowRightLeft, CheckCircle2, Lock, Play, Square,
  ShieldCheck, XOctagon, Loader2
} from 'lucide-react';

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
  onClose, setIsAssignExecutorOpen, setIsClassifyOpen, setIsCompleteFormOpen,
  setIsEscalateOpen, setIsQaAcceptOpen,
  setIsQaRejectOpen, setIsRejectHandoverOpen, setIsWorkshopAcceptOpen,
  setQaComment, setQaRejectReason, setWorkshopComment, userUnitType, wo,
  // Work Session props
  mySession, sessionLoading, handleStartSession, handleOpenStopSession,
}) => {
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

        </div>
      </div>
    </>
  );
};
