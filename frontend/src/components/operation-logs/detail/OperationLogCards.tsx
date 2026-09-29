import React from 'react';
import { Camera, CheckCircle2, FileText, User, XCircle } from 'lucide-react';

export const OperationLogCards: React.FC<any> = ({
  displayParameters, equipmentId, expandedSessions, filteredSessions, navigate,
  setVoidReason, setVoidTargetSession, toggleSessionExpand,
}) => (
          <div className="op-mobile-feed">
            {filteredSessions.map((session, idx) => {
              const hasOutlier = session.outlierCount > 0;
              const dateObj = new Date(session.recordedAt);
              const timeFormatted = dateObj.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dayFormatted = dateObj.toLocaleDateString('vi-VN');

              // For multi-parameter cards: Prioritize outliers first, then normal params
              const availableParams = displayParameters.filter((p) => session.paramValues[p.id]);
              const outlierList = availableParams.filter((p) => session.paramValues[p.id]?.isOutlier);
              const normalList = availableParams.filter((p) => !session.paramValues[p.id]?.isOutlier);
              const sortedParams = [...outlierList, ...normalList];

              const isExpanded = expandedSessions[session.key];
              const displayList = (isExpanded || sortedParams.length <= 6)
                ? sortedParams
                : sortedParams.slice(0, 6);

              return (
                <div
                  key={session.key}
                  className={`op-session-card ${session.isVoided ? 'is-voided' : hasOutlier ? 'has-outlier' : ''}`}
                >
                  <div className="op-session-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: session.isVoided ? '#64748b' : '#0f172a' }}>
                          {timeFormatted}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {dayFormatted}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <User size={11} /> {session.recordedByName}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {session.isVoided ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          🚫 Đã hủy (Sai số liệu)
                        </span>
                      ) : hasOutlier ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                          }}
                        >
                          ⚠️ {session.outlierCount} lệch chuẩn
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#dcfce7',
                            color: '#16a34a',
                            border: '1px solid #86efac',
                          }}
                        >
                          <CheckCircle2 size={11} /> Đạt chuẩn
                        </span>
                      )}

                      {/* Action buttons: Báo sai / Hủy or Nhập lại */}
                      {session.isVoided ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Quét QR tại máy để ghi nhận lại số liệu chuẩn xác thay thế"
                        >
                          <Camera size={12} /> + Nhập lại đúng
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
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Đánh dấu hủy kết quả sai (dữ liệu được giữ nguyên và lưu vết lý do trong nhật ký kiểm toán)"
                        >
                          <XCircle size={12} /> Báo sai / Hủy
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parameter Values Grid */}
                  <div className="op-session-param-grid">
                    {displayList.map((p) => {
                      const valObj = session.paramValues[p.id];
                      if (!valObj) return null;
                      const isItemVoided = session.isVoided || valObj.isVoided;
                      return (
                        <div
                          key={p.id}
                          className={`op-param-box ${isItemVoided ? 'voided' : valObj.isOutlier ? 'outlier' : ''}`}
                        >
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '15px',
                                fontWeight: 800,
                                textDecoration: isItemVoided ? 'line-through' : 'none',
                                color: isItemVoided
                                  ? '#94a3b8'
                                  : valObj.isOutlier
                                  ? '#dc2626'
                                  : '#0f172a',
                              }}
                            >
                              {valObj.value}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {p.unit || ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: isItemVoided ? '#94a3b8' : valObj.isOutlier ? '#b91c1c' : '#64748b', marginTop: '1px' }}>
                            {p.minSpec !== null && p.maxSpec !== null
                              ? `[${p.minSpec}~${p.maxSpec}]`
                              : p.minSpec !== null
                              ? `[≥${p.minSpec}]`
                              : p.maxSpec !== null
                              ? `[≤${p.maxSpec}]`
                              : 'Chuẩn'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Audit Trail Banner for Voided Session */}
                  {session.isVoided && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        fontSize: '11.5px',
                        color: '#9f1239',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                        <XCircle size={13} />
                        <span>Kết quả đã đánh dấu hủy:</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <strong>Lý do ghi sai:</strong> {session.voidReason || 'Kỹ thuật viên báo sai số liệu'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#be123c', marginTop: '1px' }}>
                        Hủy bởi: <strong>{session.voidedByName || 'Kỹ thuật viên'}</strong> • Lúc: {session.voidedAt ? new Date(session.voidedAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button for sessions with > 6 parameters */}
                  {sortedParams.length > 6 && (
                    <button
                      type="button"
                      onClick={() => toggleSessionExpand(session.key)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        border: '1px dashed #bfdbfe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: 600,
                        marginTop: '2px',
                      }}
                    >
                      {isExpanded
                        ? '▲ Thu gọn thông số'
                        : `▼ Xem thêm ${sortedParams.length - 6} thông số khác (tổng ${sortedParams.length})`}
                    </button>
                  )}

                  {/* Notes if any */}
                  {session.notes && (
                    <div style={{ fontSize: '11.5px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <FileText size={12} style={{ marginTop: '2px', flexShrink: 0, color: '#64748b' }} />
                      <span>{session.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
);
