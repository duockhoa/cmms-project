import React from 'react';
import { Eye } from 'lucide-react';
import { API_HOST } from '../../../services/api';
import { EmptyState } from '../../common/EmptyState';

export const WorkOrderTimeline: React.FC<any> = ({
  canModify, logs, setIsLogFormOpen, setLogAdjustReason,
  setLogAdjustTargetId, setLogContent,
}) => (
  <>
        {/* Timeline Log */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Nhật ký quá trình xử lý</h3>
            <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
              <div style={{ position: 'absolute', left: '6px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
              
              {logs.length === 0 ? (
                <EmptyState compact minHeight={120} title="Chưa có quá trình xử lý nào được ghi nhận" />
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
  </>
);
