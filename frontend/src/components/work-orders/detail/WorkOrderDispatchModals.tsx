import React from 'react';
import { Loader2, Users, Check, Plus, X } from 'lucide-react';
import { Modal } from '../../common/Modal';

export const WorkOrderDispatchModals: React.FC<any> = ({
  actionLoading, assignableUsers, assignedExecutorId, assignedExecutorIds = [],
  classificationNotes, classificationResult, escalateReason, handleAssignExecutorSubmit,
  handleClassifySubmit, handleEscalateSubmit, isAssignExecutorOpen,
  isClassifyOpen, isEscalateOpen, setAssignedExecutorId, setAssignedExecutorIds,
  setClassificationNotes, setClassificationResult, setEscalateReason,
  setIsAssignExecutorOpen, setIsClassifyOpen, setIsEscalateOpen, targetDeptLabel,
}) => {
  const currentSelectedIds: string[] = Array.isArray(assignedExecutorIds) && assignedExecutorIds.length > 0
    ? assignedExecutorIds
    : (assignedExecutorId ? [assignedExecutorId] : []);

  const handleToggleUser = (userId: string) => {
    let nextIds: string[];
    if (currentSelectedIds.includes(userId)) {
      nextIds = currentSelectedIds.filter((id) => id !== userId);
    } else {
      nextIds = [...currentSelectedIds, userId];
    }
    if (setAssignedExecutorIds) {
      setAssignedExecutorIds(nextIds);
    }
    if (setAssignedExecutorId) {
      setAssignedExecutorId(nextIds[0] || '');
    }
  };

  return (
    <>
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

      {/* 5. Modal Phân loại phương án xử lý sự cố (Classify) */}
      {isClassifyOpen && (
        <Modal isOpen={isClassifyOpen} onClose={() => setIsClassifyOpen(false)} title="Phân loại phương án xử lý sự cố">
          <form onSubmit={handleClassifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn phương án phân loại *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '10px', border: classificationResult === 'WORKSHOP_CONTINUE' ? '2px solid #3b82f6' : '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: classificationResult === 'WORKSHOP_CONTINUE' ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="classificationResult"
                    value="WORKSHOP_CONTINUE"
                    checked={classificationResult === 'WORKSHOP_CONTINUE'}
                    onChange={(e) => setClassificationResult(e.target.value)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Tự xử lý nội bộ tại xưởng (WORKSHOP_CONTINUE)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sự cố đơn giản, phân xưởng có thể tự sửa chữa và tự nghiệm thu.</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '10px', border: classificationResult === 'MAINTENANCE_REQUIRED' ? '2px solid #3b82f6' : '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: classificationResult === 'MAINTENANCE_REQUIRED' ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="classificationResult"
                    value="MAINTENANCE_REQUIRED"
                    checked={classificationResult === 'MAINTENANCE_REQUIRED'}
                    onChange={(e) => setClassificationResult(e.target.value)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Chuyển phòng Cơ điện / Kỹ thuật hỗ trợ (MAINTENANCE_REQUIRED)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cần kỹ thuật viên chuyên sâu, sau khi xử lý phải qua kiểm tra & nghiệm thu QA.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú nhận định kỹ thuật</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Nhận định nguyên nhân sơ bộ, yêu cầu an toàn hoặc điều phối..."
                value={classificationNotes}
                onChange={(e) => setClassificationNotes(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsClassifyOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading || !classificationResult}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận phân loại"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Modal Phân công nhân sự phụ trách (Hỗ trợ nhiều người cùng làm) */}
      {isAssignExecutorOpen && (
        <Modal
          isOpen={isAssignExecutorOpen}
          onClose={() => setIsAssignExecutorOpen(false)}
          title={`Phân công nhân sự (${targetDeptLabel})`}
          maxWidth="600px"
        >
          <form onSubmit={handleAssignExecutorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} color="#2563eb" /> Nhân sự thực hiện (Có thể chọn nhiều người) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                    Đã chọn: <strong style={{ color: '#2563eb' }}>{currentSelectedIds.length}</strong> người
                  </span>
                  {currentSelectedIds.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => {
                        if (setAssignedExecutorIds) setAssignedExecutorIds([]);
                        if (setAssignedExecutorId) setAssignedExecutorId('');
                      }}
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Badges danh sách đã chọn */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  minHeight: '36px',
                  padding: '6px 8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  marginBottom: '10px',
                }}
              >
                {currentSelectedIds.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>
                    Chưa chọn nhân sự nào — Vui lòng tick chọn ít nhất 1 người bên dưới
                  </span>
                ) : (
                  currentSelectedIds.map((userId) => {
                    const u = assignableUsers.find((t: any) => t.id === userId);
                    return (
                      <span
                        key={userId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontWeight: 600,
                        }}
                      >
                        {u ? u.name : userId}
                        <button
                          type="button"
                          onClick={() => handleToggleUser(userId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            color: '#1d4ed8',
                          }}
                          title="Bỏ chọn"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              {/* Check-tags danh sách nhân sự bộ phận */}
              {assignableUsers.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    padding: '4px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {assignableUsers.map((t: any) => {
                    const isSelected = currentSelectedIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleToggleUser(t.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? <Check size={12} color="#2563eb" /> : <Plus size={12} color="#94a3b8" />}
                        <span>{t.name}</span>
                        {t.specialty && (
                          <span style={{ fontSize: '10.5px', opacity: 0.75 }}>
                            ({t.specialty})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#b45309', padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                  Không tìm thấy nhân sự thuộc bộ phận "{targetDeptLabel}".
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAssignExecutorOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading || currentSelectedIds.length === 0}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận phân công"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
