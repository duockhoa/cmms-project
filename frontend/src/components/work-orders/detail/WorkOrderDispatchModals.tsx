import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../common/Modal';

export const WorkOrderDispatchModals: React.FC<any> = ({
  actionLoading, assignableUsers, assignedExecutorId, classificationNotes,
  classificationResult, escalateReason, handleAssignExecutorSubmit,
  handleClassifySubmit, handleEscalateSubmit, isAssignExecutorOpen,
  isClassifyOpen, isEscalateOpen, setAssignedExecutorId, setClassificationNotes,
  setClassificationResult, setEscalateReason, setIsAssignExecutorOpen,
  setIsClassifyOpen, setIsEscalateOpen, targetDeptLabel,
}) => (
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

      {/* 6. Modal Phân công nhân sự phụ trách */}
      {isAssignExecutorOpen && (
        <Modal 
          isOpen={isAssignExecutorOpen} 
          onClose={() => setIsAssignExecutorOpen(false)} 
          title={`Phân công nhân sự (${targetDeptLabel})`}
        >
          <form onSubmit={handleAssignExecutorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn nhân sự phụ trách *</label>
              {assignableUsers.length > 0 ? (
                <select 
                  className="form-select" 
                  value={assignedExecutorId} 
                  onChange={(e) => setAssignedExecutorId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn nhân sự thực hiện --</option>
                  {assignableUsers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialty || t.role || 'Nhân sự'})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '13px', color: '#b45309', padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                  Không tìm thấy nhân sự thuộc bộ phận "{targetDeptLabel}".
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAssignExecutorOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading || assignableUsers.length === 0}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận phân công"}
              </button>
            </div>
          </form>
        </Modal>
      )}

  </>
);
