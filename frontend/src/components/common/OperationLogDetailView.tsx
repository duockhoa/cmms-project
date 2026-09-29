import React, { useState, useEffect, useMemo } from 'react';
import '../operation-logs/detail/OperationLogDetailView.css';
import { OperationLogVoidModal } from '../operation-logs/detail/OperationLogVoidModal';
import { OperationLogDetailHeader } from '../operation-logs/detail/OperationLogDetailHeader';
import { OperationLogToolbar } from '../operation-logs/detail/OperationLogToolbar';
import { OperationLogCards } from '../operation-logs/detail/OperationLogCards';
import { OperationLogTable } from '../operation-logs/detail/OperationLogTable';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { DetailViewSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

interface EquipmentOperationDetailViewProps {
  equipmentId: string;
  onClose: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface GroupedLogSession {
  key: string;
  recordedAt: string;
  recordedByName: string;
  notes: string;
  paramValues: Record<string, {
    id: string;
    value: number;
    isOutlier: boolean;
    unit?: string;
    isVoided?: boolean;
    voidReason?: string;
    voidedByName?: string;
    voidedAt?: string;
  }>;
  outlierCount: number;
  totalRecorded: number;
  isVoided: boolean;
  voidReason?: string;
  voidedByName?: string;
  voidedAt?: string;
  logIds: string[];
}

export const EquipmentOperationDetailView: React.FC<EquipmentOperationDetailViewProps> = ({
  equipmentId,
  onClose,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUTLIER' | 'NORMAL' | 'VOIDED'>('ALL');
  const [selectedParamFilter, setSelectedParamFilter] = useState<string>('ALL');
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  
  // Void modal state
  const [voidTargetSession, setVoidTargetSession] = useState<GroupedLogSession | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  
  // Default to cards on mobile, table on desktop
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table';
  });

  const toggleSessionExpand = (sessionKey: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionKey]: !prev[sessionKey],
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, paramRes, logsRes] = await Promise.all([
        api.getEquipmentById(equipmentId),
        api.getEquipmentParameters(equipmentId),
        api.getOperationLogs(equipmentId),
      ]);
      setEquipment(eqRes);
      setParameters(Array.isArray(paramRes) ? paramRes : []);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
    } catch (err: any) {
      console.error('Error fetching operation details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (equipmentId) {
      fetchData();
    }
  }, [equipmentId]);

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTargetSession) return;
    if (!voidReason.trim() || voidReason.trim().length < 3) {
      alert('Vui lòng nhập lý do hủy kết quả sai (tối thiểu 3 ký tự).');
      return;
    }

    try {
      setVoidSubmitting(true);
      await api.voidOperationLogSession(equipmentId, {
        logIds: voidTargetSession.logIds,
        recordedAt: voidTargetSession.recordedAt,
        reason: voidReason.trim(),
      });
      await fetchData();
      setVoidTargetSession(null);
      setVoidReason('');
    } catch (error: any) {
      alert(error.message || 'Lỗi khi đánh dấu hủy kết quả.');
    } finally {
      setVoidSubmitting(false);
    }
  };

  // Group raw logs by session (Timestamp & User)
  const groupedSessions = useMemo<GroupedLogSession[]>(() => {
    const sessionMap = new Map<string, GroupedLogSession>();

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    sortedLogs.forEach((log) => {
      const dateObj = new Date(log.recordedAt);
      const timeKey = `${dateObj.toISOString().slice(0, 19)}_${log.recordedById || log.recordedBy?.name || 'unknown'}`;

      if (!sessionMap.has(timeKey)) {
        sessionMap.set(timeKey, {
          key: timeKey,
          recordedAt: log.recordedAt,
          recordedByName: log.recordedBy?.name || 'Kỹ thuật viên',
          notes: log.notes || '',
          paramValues: {},
          outlierCount: 0,
          totalRecorded: 0,
          isVoided: Boolean(log.isVoided),
          voidReason: log.voidReason || '',
          voidedByName: log.voidedBy?.name || '',
          voidedAt: log.voidedAt || '',
          logIds: [],
        });
      }

      const session = sessionMap.get(timeKey)!;
      session.logIds.push(log.id);
      session.paramValues[log.parameterId] = {
        id: log.id,
        value: log.value,
        isOutlier: log.isOutlier,
        unit: log.parameter?.unit,
        isVoided: Boolean(log.isVoided),
        voidReason: log.voidReason,
        voidedByName: log.voidedBy?.name,
        voidedAt: log.voidedAt,
      };

      if (log.isVoided) {
        session.isVoided = true;
        if (!session.voidReason && log.voidReason) session.voidReason = log.voidReason;
        if (!session.voidedByName && log.voidedBy?.name) session.voidedByName = log.voidedBy.name;
        if (!session.voidedAt && log.voidedAt) session.voidedAt = log.voidedAt;
      } else {
        if (log.isOutlier) {
          session.outlierCount += 1;
        }
      }

      session.totalRecorded += 1;
      if (log.notes && !session.notes) {
        session.notes = log.notes;
      }
    });

    return Array.from(sessionMap.values());
  }, [logs]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return groupedSessions.filter((s) => {
      if (filterStatus === 'OUTLIER' && (s.isVoided || s.outlierCount === 0)) return false;
      if (filterStatus === 'NORMAL' && (s.isVoided || s.outlierCount > 0)) return false;
      if (filterStatus === 'VOIDED' && !s.isVoided) return false;
      if (!filterSearch.trim()) return true;
      const term = filterSearch.toLowerCase();
      const matchTime = new Date(s.recordedAt).toLocaleString('vi-VN').toLowerCase().includes(term);
      const matchUser = s.recordedByName.toLowerCase().includes(term);
      const matchNotes = s.notes.toLowerCase().includes(term);
      const matchReason = (s.voidReason || '').toLowerCase().includes(term);
      return matchTime || matchUser || matchNotes || matchReason;
    });
  }, [groupedSessions, filterSearch, filterStatus]);

  // Parameters to display in Table / Cards (either all or filtered single parameter)
  const displayParameters = useMemo(() => {
    if (selectedParamFilter === 'ALL') {
      return parameters;
    }
    return parameters.filter((p) => p.id === selectedParamFilter);
  }, [parameters, selectedParamFilter]);

  if (loading || !equipment) {
    return (
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <DetailViewSkeleton />
      </div>
    );
  }

  return (
    <div className="op-detail-container">

      {/* Sleek Compact Header */}
      <OperationLogDetailHeader
        equipment={equipment}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
      />

      {/* Main Content Area */}
      <div className="op-detail-content">
        <OperationLogToolbar
          fetchData={fetchData}
          filterSearch={filterSearch}
          filterStatus={filterStatus}
          groupedSessions={groupedSessions}
          loading={loading}
          parameters={parameters}
          selectedParamFilter={selectedParamFilter}
          setFilterSearch={setFilterSearch}
          setFilterStatus={setFilterStatus}
          setSelectedParamFilter={setSelectedParamFilter}
          setViewMode={setViewMode}
          viewMode={viewMode}
        />

        {/* Main Logbook Display */}
        {filteredSessions.length === 0 ? (
          <EmptyState
            compact
            minHeight={160}
            title="Chưa có bản ghi vận hành"
            description="Người vận hành chỉ cần quét mã QR trên thiết bị để ghi số liệu."
          />
        ) : viewMode === 'cards' ? (
          /* Mobile-Optimized Card Feed */
          <OperationLogCards
            displayParameters={displayParameters}
            equipmentId={equipmentId}
            expandedSessions={expandedSessions}
            filteredSessions={filteredSessions}
            navigate={navigate}
            setVoidReason={setVoidReason}
            setVoidTargetSession={setVoidTargetSession}
            toggleSessionExpand={toggleSessionExpand}
          />
        ) : (
          /* Desktop Matrix Table View with Freeze / Sticky Columns */
          <OperationLogTable
            displayParameters={displayParameters}
            equipmentId={equipmentId}
            filteredSessions={filteredSessions}
            navigate={navigate}
            setVoidReason={setVoidReason}
            setVoidTargetSession={setVoidTargetSession}
          />
        )}
      </div>

      <OperationLogVoidModal
        handleVoidSubmit={handleVoidSubmit}
        setVoidReason={setVoidReason}
        setVoidTargetSession={setVoidTargetSession}
        voidReason={voidReason}
        voidSubmitting={voidSubmitting}
        voidTargetSession={voidTargetSession}
      />
    </div>
  );
};
