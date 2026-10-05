import React from 'react';
import { RefreshCw, XCircle } from 'lucide-react';

export const OperationLogVoidModal: React.FC<any> = ({
  handleVoidSubmit, setVoidReason, setVoidTargetSession,
  voidReason, voidSubmitting, voidTargetSession,
}) => voidTargetSession ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => !voidSubmitting && setVoidTargetSession(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '22px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#ffe4e6', color: '#e11d48' }}>
                <XCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Đánh dấu Hủy kết quả sai
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Phiên ghi lúc: {new Date(voidTargetSession.recordedAt).toLocaleString('vi-VN')} ({voidTargetSession.recordedByName})
                </div>
              </div>
            </div>

            <form onSubmit={handleVoidSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  Lý do hủy kết quả sai <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Ví dụ: Nhập nhầm thang đo áp suất, đọc nhầm đồng hồ, thao tác nhầm thiết bị..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Quick Reason Suggestion Chips */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '6px' }}>Gợi ý nhanh:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    'Nhập nhầm số liệu',
                    'Đọc nhầm thang đo',
                    'Thiết bị vừa bảo trì chưa reset',
                    'Thao tác nhầm phiên ghi',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setVoidReason(preset)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={voidSubmitting}
                  onClick={() => setVoidTargetSession(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={voidSubmitting || !voidReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#e11d48', borderColor: '#e11d48', color: '#ffffff' }}
                >
                  {voidSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Đang đánh dấu...
                    </>
                  ) : (
                    <>
                      <XCircle size={14} /> Xác nhận Đánh dấu Hủy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null;
