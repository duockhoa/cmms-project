import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { AttachmentManager } from './AttachmentManager';
import { CheckCircle, AlertTriangle, XCircle, Play, AlertCircle, RefreshCw, Paperclip, FileText } from 'lucide-react';
import { useToast, useConfirmDialog } from './Toast';

interface ChecklistManagerProps {
  workOrderId: string;
  workOrderStatus: string;
  onStatusChange?: () => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  workOrderId,
  workOrderStatus,
  onStatusChange,
}) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // New Execution Form
  const [selectedTechId, setSelectedTechId] = useState('');
  const [creating, setCreating] = useState(false);

  // Active Draft Execution State
  const [activeExec, setActiveExec] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [execData, techData] = await Promise.all([
        api.getChecklistExecutions(workOrderId),
        api.getUsers({ role: 'TECHNICIAN' }),
      ]);
      setExecutions(execData);
      setTechnicians(techData);

      // Find DRAFT execution
      const draft = execData.find((ex: any) => ex.status === 'DRAFT');
      setActiveExec(draft || null);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải thông tin Checklist. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workOrderId]);

  const handleStartNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      alert('Vui lòng chọn kỹ thuật viên thực hiện!');
      return;
    }

    setCreating(true);
    try {
      // Default checklist items for manually created work orders
      const defaultItems = [
        'Vệ sinh & bảo dưỡng ngoài thiết bị',
        'Kiểm tra rò rỉ, ốc vít và kết cấu cơ khí',
        'Đo thông số điện áp (U) và dòng điện (I)',
        'Kiểm tra và thử nghiệm vận hành hệ thống',
      ];

      const newExec = await api.createChecklistExecution(workOrderId, {
        executedById: selectedTechId,
        checklistItems: defaultItems,
      });

      setActiveExec(newExec);
      toast.success('Thành công', 'Khởi tạo checklist mới thành công.');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', `Khởi tạo checklist thất bại: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleItemChange = async (
    itemIndex: number,
    status: string,
    comment: string,
    currentVersion: number
  ) => {
    if (!activeExec) return;

    if (status === 'FAILED' && (!comment || comment.trim() === '')) {
      // Just local update or block? We can let them change type, but they won't be able to submit complete without comment.
      // Wait, to prevent errors on server side, if they select FAILED, we should guide them to write a comment.
    }

    try {
      const updatedExec = await api.updateChecklistItem(activeExec.id, {
        itemIndex,
        status,
        comment: comment || undefined,
        expectedVersion: currentVersion,
      });
      // Update local state version and items
      setActiveExec(updatedExec);
      // Also update in executions list
      setExecutions((prev) =>
        prev.map((ex) => (ex.id === activeExec.id ? updatedExec : ex))
      );
    } catch (err: any) {
      console.error(err);
      alert(`Cập nhật thất bại: ${err.message || 'Lỗi xung đột phiên làm việc'}`);
      loadData(); // Reload to get fresh version
    }
  };

  const handleComplete = async () => {
    if (!activeExec) return;

    // Client-side validation: FAILED must have comment
    const failedWithoutComment = activeExec.items.some(
      (it: any) => it.status === 'FAILED' && (!it.comment || it.comment.trim() === '')
    );
    if (failedWithoutComment) {
      toast.warning('Cảnh báo', 'Tất cả các đầu mục bị FAILED bắt buộc phải có giải trình comment!');
      return;
    }

    const hasNotChecked = activeExec.items.some((it: any) => it.status === 'NOT_CHECKED');
    if (hasNotChecked) {
      toast.warning('Chưa hoàn thành', 'Vui lòng hoàn thành kiểm tra toàn bộ đầu mục (không để NOT_CHECKED) trước khi hoàn tất!');
      return;
    }

    const ok = await confirm('Hoàn tất Checklist', 'Bạn có chắc chắn muốn hoàn tất lượt thực hiện Checklist này?', { confirmText: 'Hoàn tất', type: 'info' });
    if (!ok) return;

    try {
      const completed = await api.completeChecklistExecution(activeExec.id, {
        expectedVersion: activeExec.version,
      });
      toast.success('Đã hoàn tất', `Kết quả tổng hợp: ${completed.result === 'PASSED' ? 'ĐẠT (PASSED)' : 'HỎNG (FAILED)'}`);
      loadData();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      console.error(err);
      toast.error('Hoàn tất thất bại', err.message || 'Lỗi xung đột phiên làm việc');
      loadData();
    }
  };

  const handleCancel = async () => {
    if (!activeExec) return;
    const reason = window.prompt('Vui lòng nhập lý do hủy lượt thực hiện Checklist:');
    if (!reason || reason.trim() === '') return;

    try {
      await api.cancelChecklistExecution(activeExec.id, {
        expectedVersion: activeExec.version,
        reason: reason.trim(),
      });
      toast.success('Thành công', 'Đã hủy lượt thực hiện checklist.');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('Hủy thất bại', err.message || 'Lỗi xung đột phiên làm việc');
      loadData();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px', gap: '8px' }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <span>Đang tải thông tin checklist bảo trì...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', borderColor: 'var(--danger)' }}>
        <AlertCircle size={32} style={{ color: 'var(--danger)', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{error}</p>
        <button className="btn btn-primary" onClick={loadData}>
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  // Count items status
  const totalItems = activeExec ? activeExec.items.length : 0;
  const checkedItems = activeExec ? activeExec.items.filter((it: any) => it.status !== 'NOT_CHECKED').length : 0;
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  const isCompleteDisabled = checkedItems < totalItems;

  const isTerminalWO = workOrderStatus === 'CLOSED' || workOrderStatus === 'CANCELLED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Active Checklist Runner (DRAFT) */}
      {activeExec ? (
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Đang thực hiện Checklist bảo trì</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Người thực hiện: <strong style={{ color: 'var(--text-primary)' }}>{activeExec.executedBy?.name || 'Chưa phân công'}</strong>
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                Tiến độ: {checkedItems}/{totalItems} mục ({progressPercent}%)
              </div>
              <div style={{ width: '120px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {activeExec.items.map((item: any, idx: number) => {
              const showCommentWarning = item.status === 'FAILED' && (!item.comment || item.comment.trim() === '');
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', flex: 1 }}>
                      {idx + 1}. {item.itemText}
                    </div>

                    {/* Radio Button Options */}
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {['NOT_CHECKED', 'PASSED', 'FAILED', 'NA'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: 'none',
                            boxShadow: 'none',
                            backgroundColor: item.status === st ? (
                              st === 'PASSED' ? 'var(--success-bg, rgba(16, 185, 129, 0.1))' :
                              st === 'FAILED' ? 'var(--danger-bg, rgba(239, 68, 68, 0.1))' :
                              st === 'NA' ? 'var(--info-bg, rgba(59, 130, 246, 0.1))' :
                              'var(--border-color)'
                            ) : 'transparent',
                            color: item.status === st ? (
                              st === 'PASSED' ? 'var(--success)' :
                              st === 'FAILED' ? 'var(--danger)' :
                              st === 'NA' ? 'var(--info)' :
                              'var(--text-primary)'
                            ) : 'var(--text-secondary)',
                            fontWeight: item.status === st ? 700 : 500,
                          }}
                          onClick={() => handleItemChange(item.itemIndex, st, item.comment || '', activeExec.version)}
                        >
                          {st === 'NOT_CHECKED' ? 'Chưa Check' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment & Attachments block */}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Ghi chú / Comment {item.status === 'FAILED' && <span style={{ color: 'var(--danger)' }}>* (Bắt buộc)</span>}
                      </label>
                      <input
                        type="text"
                        className={`form-input ${showCommentWarning ? 'form-input-error' : ''}`}
                        placeholder={item.status === 'FAILED' ? 'Bắt buộc giải trình nguyên nhân hỏng hóc...' : 'Ghi chú thêm thông tin...'}
                        value={item.comment || ''}
                        onChange={(e) => handleItemChange(item.itemIndex, item.status, e.target.value, activeExec.version)}
                        style={{ padding: '6px 12px', fontSize: '13px', borderColor: showCommentWarning ? 'var(--danger)' : undefined }}
                      />
                      {showCommentWarning && (
                        <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>
                          Yêu cầu nhập ghi chú giải trình cho đầu mục bị hỏng (FAILED)
                        </span>
                      )}
                    </div>

                    {/* Attachment Evidence */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                      <AttachmentManager
                        entityType="ChecklistExecutionItem"
                        entityId={item.id}
                        uploadedById={activeExec.executedById}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Hủy lượt thực hiện
            </button>
            <button className="btn btn-primary" onClick={handleComplete} disabled={isCompleteDisabled}>
              <CheckCircle size={16} /> Hoàn tất Checklist
            </button>
          </div>
        </div>
      ) : (
        /* Start New Checklist Button */
        <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
          <FileText size={36} style={{ color: 'var(--text-secondary)', marginBottom: '12px', opacity: 0.7 }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Không có lượt thực hiện Checklist DRAFT nào</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Để ghi nhận kết quả kiểm tra chất lượng bảo trì cho phiếu này, hãy chọn kỹ thuật viên và bắt đầu thực hiện checklist.
          </p>

          {!isTerminalWO ? (
            <form onSubmit={handleStartNew} style={{ display: 'flex', gap: '10px', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto', alignItems: 'center' }}>
              <select
                className="form-select"
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                style={{ flex: 1, margin: 0 }}
                required
              >
                <option value="">-- Chọn kỹ thuật viên thực hiện --</option>
                {technicians.filter(t => t.isActive).map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name} ({tech.specialty || 'Chưa cập nhật'})</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary" disabled={creating} style={{ whiteSpace: 'nowrap' }}>
                {creating ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />} Bắt đầu
              </button>
            </form>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Không thể bắt đầu thực hiện checklist khi Work Order đã Đóng hoặc Hủy.
            </span>
          )}
        </div>
      )}

      {/* Checklist History (COMPLETED / CANCELLED) */}
      {executions.filter((ex: any) => ex.status !== 'DRAFT').length > 0 && (
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Lịch sử thực hiện Checklist ({executions.filter((ex: any) => ex.status !== 'DRAFT').length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {executions.filter((ex: any) => ex.status !== 'DRAFT').map((ex) => {
              const isPassed = ex.result === 'PASSED';
              return (
                <div key={ex.id} className="card" style={{ padding: '16px', opacity: 0.85 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className={`badge ${ex.status === 'CANCELLED' ? 'badge-secondary' : isPassed ? 'badge-success' : 'badge-danger'}`}
                        style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {ex.status === 'CANCELLED' ? 'HỦY BỎ' : isPassed ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                        {ex.status === 'CANCELLED' ? 'CANCELLED' : isPassed ? 'PASSED (ĐẠT)' : 'FAILED (HỎNG)'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Bởi: <strong>{ex.executedBy?.name || '---'}</strong>
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Hoàn thành: {ex.completedAt ? new Date(ex.completedAt).toLocaleString('vi-VN') : '---'}
                    </span>
                  </div>

                  {/* Read-only Checklist items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    {ex.items.map((item: any, itemIdx: number) => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{itemIdx + 1}. {item.itemText}</span>
                          <span style={{
                            fontWeight: 700,
                            color: item.status === 'PASSED' ? 'var(--success)' : item.status === 'FAILED' ? 'var(--danger)' : 'var(--text-secondary)'
                          }}>
                            {item.status}
                          </span>
                        </div>
                        {item.comment && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', paddingLeft: '12px', borderLeft: '2px solid var(--border-color)' }}>
                            Ghi chú: {item.comment}
                          </div>
                        )}
                        {/* Display read-only attachments for auditing */}
                        <div style={{ paddingLeft: '12px' }}>
                          <AttachmentManager
                            entityType="ChecklistExecutionItem"
                            entityId={item.id}
                            disabled={true}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
