import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  Activity, Clock, PowerOff, RefreshCw, Search, 
  Wifi, ShieldAlert, Monitor, Smartphone, Globe, Filter, X
} from 'lucide-react';

interface ConnectionLog {
  id: string;
  userId: string;
  hrmId?: string | null;
  userName: string;
  department?: string | null;
  role: string;
  socketId?: string | null;
  status: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  connectedAt: string;
  lastSeenAt: string;
  disconnectedAt?: string | null;
  reconnectCount: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface ConnectionStats {
  connected: number;
  reconnecting: number;
  disconnected: number;
}

function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const DD = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const YYYY = d.getFullYear();
  return `${hh}:${mm}:${ss} ${DD}/${MM}/${YYYY}`;
}

function formatDuration(startStr: string | Date, endStr?: string | Date | null): string {
  if (!startStr) return '—';
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  
  if (diffSec < 60) return `${diffSec} giây`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHr = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHr < 24) {
    return remMin > 0 ? `${diffHr} giờ ${remMin} phút` : `${diffHr} giờ`;
  }
  const diffDays = Math.floor(diffHr / 24);
  const remHr = diffHr % 24;
  return remHr > 0 ? `${diffDays} ngày ${remHr} giờ` : `${diffDays} ngày`;
}

function getDeviceInfo(ua?: string | null) {
  if (!ua) return { os: 'Không rõ', browser: 'Không rõ', isMobile: false };
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  let os = 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Chrome';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  return { os, browser, isMobile };
}

export const ConnectionLogsSettingsTab: React.FC = () => {
  const { can } = usePermissions();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [stats, setStats] = useState<ConnectionStats>({ connected: 0, reconnecting: 0, disconnected: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.getUserConnections({
        status: statusFilter,
        search: searchTerm.trim() || undefined,
        page,
        limit: 15,
      });

      if (res) {
        setLogs(res.items || []);
        if (res.stats) {
          setStats(res.stats);
        }
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalCount(res.meta.total || 0);
        }
      }
    } catch (err: any) {
      if (!isSilent) {
        toast.error('Không thể tải lịch sử kết nối: ' + (err?.message || 'Lỗi hệ thống'));
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [statusFilter, searchTerm, page, toast]);

  // Initial and param change fetch
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Periodic polling for real-time monitoring
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 10000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  const handleStatusCardClick = (status: string) => {
    setPage(1);
    setStatusFilter(prev => prev === status ? 'ALL' : status);
  };

  const handleForceDisconnect = async (log: ConnectionLog) => {
    const ok = await confirm(
      'Xác nhận ngắt kết nối phiên',
      `Bạn có chắc chắn muốn ngắt phiên kết nối của "${log.userName}" (${log.hrmId || 'Không có mã HRM'})? Người dùng sẽ bị ngắt kết nối WebSocket ngay lập tức.`,
      {
        confirmText: 'Ngắt kết nối',
        cancelText: 'Hủy',
        type: 'danger',
      }
    );

    if (!ok) return;

    setDisconnectingId(log.id);
    try {
      await api.forceDisconnectUserSession(log.id);
      toast.success(`Đã ngắt phiên kết nối của ${log.userName}`);
      fetchLogs(true);
    } catch (err: any) {
      toast.error('Lỗi khi ngắt phiên kết nối: ' + (err?.message || 'Thao tác thất bại'));
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
            Lịch sử kết nối & Phiên làm việc
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Giám sát thời gian thực các phiên đăng nhập, thiết bị truy cập và trạng thái trực tuyến.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ accentColor: 'var(--accent-blue, #2563eb)' }}
            />
            Tự động làm mới (10s)
          </label>

          <button
            onClick={() => fetchLogs(false)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Connected */}
        <div 
          onClick={() => handleStatusCardClick('CONNECTED')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            backgroundColor: statusFilter === 'CONNECTED' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-primary, #ffffff)',
            borderRadius: '10px',
            border: statusFilter === 'CONNECTED' ? '2px solid #10b981' : '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', fontWeight: 500 }}>
              Đang kết nối
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', lineHeight: 1.1 }}>
              {stats.connected.toLocaleString('vi-VN')}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Activity size={22} />
          </div>
        </div>

        {/* Card 2: Reconnecting */}
        <div 
          onClick={() => handleStatusCardClick('RECONNECTING')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            backgroundColor: statusFilter === 'RECONNECTING' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-primary, #ffffff)',
            borderRadius: '10px',
            border: statusFilter === 'RECONNECTING' ? '2px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', fontWeight: 500 }}>
              Chờ kết nối lại
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', lineHeight: 1.1 }}>
              {stats.reconnecting.toLocaleString('vi-VN')}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#fffbeb',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={22} />
          </div>
        </div>

        {/* Card 3: Disconnected */}
        <div 
          onClick={() => handleStatusCardClick('DISCONNECTED')}
          style={{
            cursor: 'pointer',
            padding: '16px 20px',
            backgroundColor: statusFilter === 'DISCONNECTED' ? 'rgba(100, 116, 139, 0.08)' : 'var(--bg-primary, #ffffff)',
            borderRadius: '10px',
            border: statusFilter === 'DISCONNECTED' ? '2px solid #64748b' : '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginBottom: '4px', fontWeight: 500 }}>
              Đã kết thúc
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', lineHeight: 1.1 }}>
              {stats.disconnected.toLocaleString('vi-VN')}
            </div>
          </div>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <PowerOff size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên người dùng, mã HRM, IP..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="input-field"
            style={{ width: '100%', paddingLeft: '36px', height: '38px', fontSize: '13.5px' }}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setPage(1); }}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input-field"
          style={{ width: '180px', height: '38px', fontSize: '13px' }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="CONNECTED">Đang kết nối</option>
          <option value="RECONNECTING">Chờ kết nối lại</option>
          <option value="DISCONNECTED">Đã kết thúc</option>
        </select>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', backgroundColor: 'var(--bg-primary, #ffffff)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-table-header, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phiên / Người dùng</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mở phiên lúc</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Lần cuối kết nối</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ngắt / Kết thúc lúc</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Thời lượng phiên</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng thái</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Số lần kết nối</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Địa chỉ IP</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Thiết bị / Trình duyệt</th>
              <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                  <div>Đang tải dữ liệu phiên làm việc...</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Không tìm thấy phiên kết nối nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const deviceInfo = getDeviceInfo(log.userAgent);
                const shortId = log.id.length > 8 ? log.id.slice(-6) : log.id;
                const isOnline = log.status === 'CONNECTED';
                const isReconnecting = log.status === 'RECONNECTING';

                return (
                  <tr 
                    key={log.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                      backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.015)' : 'transparent',
                    }}
                  >
                    {/* Phiên / Người dùng */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                        {log.userName || 'Chưa định danh'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                        #{shortId} - {log.hrmId || 'Không có mã'}
                      </div>
                    </td>

                    {/* Mở phiên lúc */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {formatDateTime(log.connectedAt)}
                    </td>

                    {/* Lần cuối kết nối */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {formatDateTime(log.lastSeenAt)}
                    </td>

                    {/* Ngắt / Kết thúc lúc */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', color: log.disconnectedAt ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {log.disconnectedAt ? formatDateTime(log.disconnectedAt) : '—'}
                    </td>

                    {/* Thời lượng phiên */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {formatDuration(log.connectedAt, log.disconnectedAt)}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {isOnline ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          Đang kết nối
                        </span>
                      ) : isReconnecting ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#fffbeb',
                          color: '#d97706',
                          border: '1px solid #fde68a',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                          Chờ kết nối
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #e2e8f0',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></span>
                          Đã kết thúc
                        </span>
                      )}
                    </td>

                    {/* Số lần kết nối */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.reconnectCount || 1}
                    </td>

                    {/* Địa chỉ IP */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                      {log.ipAddress || '—'}
                    </td>

                    {/* Thiết bị / Trình duyệt */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', maxWidth: '240px' }}>
                      <div 
                        title={log.userAgent || 'Không có thông tin'}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          cursor: 'default',
                        }}
                      >
                        {deviceInfo.browser} ({deviceInfo.os}) - {log.userAgent || '—'}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isOnline && can('settings:users') ? (
                        <button
                          onClick={() => handleForceDisconnect(log)}
                          disabled={disconnectingId === log.id}
                          className="btn btn-sm btn-outline-danger"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#dc2626',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            borderRadius: '6px',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          title="Buộc ngắt kết nối phiên này"
                        >
                          <PowerOff size={12} />
                          Ngắt kết nối
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <div>
          Tổng số: <strong>{totalCount.toLocaleString('vi-VN')}</strong> phiên ghi nhận
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: '12.5px' }}
          >
            &lt; Trước
          </button>
          <span>
            Trang <strong>{page}</strong> / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: '12.5px' }}
          >
            Sau &gt;
          </button>
        </div>
      </div>
    </div>
  );
};
