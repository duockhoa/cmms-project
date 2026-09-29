import React from 'react';
import { Camera, CheckCircle2, XCircle } from 'lucide-react';

export const OperationLogTable: React.FC<any> = ({
  displayParameters, equipmentId, filteredSessions, navigate,
  setVoidReason, setVoidTargetSession,
}) => (
          <div
            style={{
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '6px',
              overflowX: 'auto',
              backgroundColor: '#ffffff',
            }}
          >
            <table className="custom-table" style={{ margin: 0, width: '100%', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary, #f8fafc)' }}>
                  <th className="sticky-col-stt" style={{ textAlign: 'center', padding: '8px 6px' }}>STT</th>
                  <th className="sticky-col-time" style={{ padding: '8px 10px' }}>Thời gian ghi</th>
                  <th className="sticky-col-user" style={{ padding: '8px 10px' }}>Người ghi</th>

                  {/* Dynamic parameter columns (filterable) */}
                  {displayParameters.map((p) => (
                    <th key={p.id} style={{ textAlign: 'center', minWidth: '105px', padding: '8px 8px' }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {p.unit ? `(${p.unit})` : ''}{' '}
                        {p.minSpec !== null && p.maxSpec !== null
                          ? `[${p.minSpec}~${p.maxSpec}]`
                          : p.minSpec !== null
                          ? `[≥${p.minSpec}]`
                          : p.maxSpec !== null
                          ? `[≤${p.maxSpec}]`
                          : ''}
                      </div>
                    </th>
                  ))}

                  <th style={{ width: '115px', textAlign: 'center', padding: '8px 8px' }}>Đánh giá</th>
                  <th style={{ minWidth: '140px', padding: '8px 10px' }}>Ghi chú / Lý do hủy</th>
                  <th style={{ width: '120px', textAlign: 'center', padding: '8px 8px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, idx) => {
                  const hasOutlier = session.outlierCount > 0;
                  const timeFormatted = new Date(session.recordedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const dayFormatted = new Date(session.recordedAt).toLocaleDateString('vi-VN');

                  return (
                    <tr
                      key={session.key}
                      className={session.isVoided ? 'is-voided' : hasOutlier ? 'has-outlier' : ''}
                      style={{
                        backgroundColor: session.isVoided
                          ? '#f8fafc'
                          : hasOutlier
                          ? 'rgba(239, 68, 68, 0.03)'
                          : 'transparent',
                        opacity: session.isVoided ? 0.8 : 1,
                      }}
                    >
                      <td className="sticky-col-stt" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', padding: '6px 4px' }}>
                        {idx + 1}
                      </td>
                      <td className="sticky-col-time" style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: session.isVoided ? '#64748b' : 'var(--text-primary)' }}>
                          {timeFormatted}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {dayFormatted}
                        </div>
                      </td>
                      <td className="sticky-col-user" style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {session.recordedByName}
                        </div>
                      </td>

                      {/* Parameter cells */}
                      {displayParameters.map((p) => {
                        const valObj = session.paramValues[p.id];
                        if (!valObj) {
                          return (
                            <td key={p.id} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6px 8px' }}>
                              —
                            </td>
                          );
                        }

                        const isItemVoided = session.isVoided || valObj.isVoided;
                        return (
                          <td key={p.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {isItemVoided ? (
                              <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }} title="Giá trị đã đánh dấu hủy">
                                {valObj.value}
                              </span>
                            ) : valObj.isOutlier ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  border: '1px solid #fca5a5',
                                }}
                                title="Giá trị đo vượt ngưỡng tiêu chuẩn!"
                              >
                                ⚠️ {valObj.value}
                              </span>
                            ) : (
                              <span style={{ fontWeight: 600, fontSize: '12px', color: '#16a34a' }}>
                                {valObj.value}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Evaluation badge */}
                      <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                        {session.isVoided ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            🚫 Đã hủy
                          </span>
                        ) : hasOutlier ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                            }}
                          >
                            ⚠️ Lệch chuẩn
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              border: '1px solid #86efac',
                            }}
                          >
                            <CheckCircle2 size={11} /> Đạt chuẩn
                          </span>
                        )}
                      </td>

                      {/* Notes / Explanation & Audit Trail */}
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '6px 10px' }}>
                        {session.notes && <div>{session.notes}</div>}
                        {session.isVoided && (
                          <div style={{ color: '#be123c', fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                            🚫 Hủy bởi {session.voidedByName}: {session.voidReason}
                          </div>
                        )}
                        {!session.notes && !session.isVoided && '—'}
                      </td>

                      {/* Actions Column */}
                      <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                        {session.isVoided ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Quét QR tại máy để ghi nhận lại số liệu đúng"
                          >
                            <Camera size={11} /> Nhập lại
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setVoidTargetSession(session);
                              setVoidReason('');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Đánh dấu hủy kết quả sai (kết quả vẫn được lưu vết kiểm toán)"
                          >
                            <XCircle size={11} /> Báo sai
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
);
