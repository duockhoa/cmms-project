import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  Calendar,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  History,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useToast, useConfirmDialog } from '../components/common/Toast';

export const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  // Action Modals
  const [pauseTarget, setPauseTarget] = useState<any | null>(null);
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');

  // History Modal
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [historyTimeline, setHistoryTimeline] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: '',
    frequencyType: 'MONTHLY',
    frequencyInterval: 1,
    startDate: new Date().toISOString().split('T')[0],
    estimatedDurationMinutes: 120,
    defaultPriority: 'MEDIUM',
    assignedTechnicianId: '',
    autoGenerate: true,
    leadTimeDays: 3,
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [schRes, eqRes, techRes, userRes] = await Promise.all([
        api.getSchedules({ search, status: statusFilter, frequencyType: freqFilter, overdue: overdueFilter }),
        api.getEquipment(),
        api.getUsers({ role: 'TECHNICIAN' }),
        api.getUsers().catch(() => []),
      ]);
      setSchedules(schRes.data || schRes || []);
      setEquipmentList(eqRes);
      setTechnicians(techRes);
      setUsers(userRes);
      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, freqFilter, overdueFilter]);

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSchedule({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        frequencyInterval: Number(formData.frequencyInterval),
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes),
        leadTimeDays: Number(formData.leadTimeDays),
        createdById: getActiveUserId(),
      });
      setIsAddOpen(false);
      toast.success('Thành công', 'Tạo kế hoạch bảo trì định kỳ thành công!');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi tạo lịch bảo trì', err.message || 'Không thể thực hiện');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await api.updateSchedule(editTarget.id, {
        title: formData.title,
        description: formData.description,
        frequencyType: formData.frequencyType,
        frequencyInterval: Number(formData.frequencyInterval),
        startDate: new Date(formData.startDate).toISOString(),
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes),
        defaultPriority: formData.defaultPriority,
        assignedTechnicianId: formData.assignedTechnicianId || null,
        autoGenerate: formData.autoGenerate,
        leadTimeDays: Number(formData.leadTimeDays),
        notes: formData.notes,
        expectedVersion: editTarget.version,
        actedById: getActiveUserId(),
      });
      setEditTarget(null);
      toast.success('Thành công', 'Cập nhật kế hoạch bảo trì thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Dữ liệu lịch bảo trì đã bị người khác cập nhật! Vui lòng tải lại dữ liệu.');
        setEditTarget(null);
        loadData();
      } else {
        toast.error('Lỗi cập nhật', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handleActivate = async (sch: any) => {
    try {
      await api.activateSchedule(sch.id, {
        expectedVersion: sch.version,
        actedById: getActiveUserId(),
      });
      toast.success('Thành công', 'Đã kích hoạt kế hoạch bảo trì thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Có xung đột dữ liệu! Vui lòng tải lại trang.');
        loadData();
      } else {
        toast.error('Lỗi kích hoạt', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseTarget) return;
    try {
      await api.pauseSchedule(pauseTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: pauseTarget.version,
        actedById: getActiveUserId(),
      });
      setPauseTarget(null);
      toast.success('Thành công', 'Đã tạm dừng kế hoạch bảo trì thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Có xung đột dữ liệu! Vui lòng tải lại trang.');
        setPauseTarget(null);
        loadData();
      } else {
        toast.error('Lỗi tạm dừng', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    try {
      await api.completeSchedule(completeTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: completeTarget.version,
        actedById: getActiveUserId(),
      });
      setCompleteTarget(null);
      toast.success('Thành công', 'Đã hoàn thành kế hoạch bảo trì thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Work Order mở')) {
        toast.error('Lỗi hoàn thành', err.message);
        setCompleteTarget(null);
        loadData();
      } else {
        toast.error('Lỗi hoàn thành', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    try {
      await api.cancelSchedule(cancelTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: cancelTarget.version,
        actedById: getActiveUserId(),
      });
      setCancelTarget(null);
      toast.success('Thành công', 'Đã hủy kế hoạch bảo trì thành công!');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Work Order mở')) {
        toast.error('Lỗi hủy', err.message);
        setCancelTarget(null);
        loadData();
      } else {
        toast.error('Lỗi hủy kế hoạch', err.message || 'Không thể thực hiện');
      }
    }
  };
  const handleGenerateWO = async (sch: any) => {
    const ok = await confirm('Phát sinh Work Order', `Phát sinh ngay 1 Work Order từ lịch [${sch.scheduleCode}]?`, { confirmText: 'Phát sinh', type: 'info' });
    if (ok) {
      try {
        const res = await api.generateWorkOrderFromSchedule(sch.id, {
          expectedVersion: sch.version,
          actedById: getActiveUserId(),
        });
        toast.success('Thành công', `Đã sinh Work Order ${res.orderCode}.`);
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message || 'Không thể thực hiện');
      }
    }
  };

  const openHistory = async (sch: any) => {
    setHistoryTarget(sch);
    setHistoryLoading(true);
    try {
      const res = await api.getScheduleHistory(sch.id);
      setHistoryTimeline(res || []);
    } catch (err) {
      console.error(err);
      setHistoryTimeline([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEditModal = (sch: any) => {
    setEditTarget(sch);
    setFormData({
      title: sch.title || '',
      description: sch.description || '',
      equipmentId: sch.equipmentId,
      frequencyType: sch.frequencyType,
      frequencyInterval: sch.frequencyInterval,
      startDate: sch.startDate ? sch.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      estimatedDurationMinutes: sch.estimatedDurationMinutes || 120,
      defaultPriority: sch.defaultPriority || 'MEDIUM',
      assignedTechnicianId: sch.assignedTechnicianId || '',
      autoGenerate: sch.autoGenerate !== undefined ? sch.autoGenerate : true,
      leadTimeDays: sch.leadTimeDays || 3,
      notes: sch.notes || '',
    });
  };

  const getFrequencyLabel = (type: string, interval: number) => {
    switch (type) {
      case 'DAILY':
        return interval === 1 ? 'Hàng ngày' : `Mỗi ${interval} ngày`;
      case 'WEEKLY':
        return interval === 1 ? 'Hàng tuần' : `Mỗi ${interval} tuần`;
      case 'MONTHLY':
        return interval === 1 ? 'Hàng tháng' : `Mỗi ${interval} tháng`;
      case 'QUARTERLY':
        return interval === 1 ? 'Hàng quý' : `Mỗi ${interval} quý`;
      case 'YEARLY':
        return interval === 1 ? 'Hàng năm' : `Mỗi ${interval} năm`;
      case 'OPERATING_HOURS':
        return `Mỗi ${interval} giờ vận hành`;
      default:
        return `${type} (${interval})`;
    }
  };

  // Summary Metrics
  const activeCount = schedules.filter((s) => s.status === 'ACTIVE').length;
  const pausedCount = schedules.filter((s) => s.status === 'PAUSED').length;
  const draftCount = schedules.filter((s) => s.status === 'DRAFT').length;
  const overdueCount = schedules.filter((s) => {
    if (s.status !== 'ACTIVE' || !s.nextDueDate) return false;
    return new Date(s.nextDueDate) < new Date();
  }).length;

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Kế hoạch Bảo trì Định kỳ (Preventive Maintenance)</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Lập lịch bảo trì định kỳ, tự động tính hạn bảo trì và phát sinh phiếu Work Order.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData({
              title: '',
              description: '',
              equipmentId: equipmentList[0]?.id || '',
              frequencyType: 'MONTHLY',
              frequencyInterval: 1,
              startDate: new Date().toISOString().split('T')[0],
              estimatedDurationMinutes: 120,
              defaultPriority: 'MEDIUM',
              assignedTechnicianId: '',
              autoGenerate: true,
              leadTimeDays: 3,
              notes: '',
            });
            setIsAddOpen(true);
          }}
        >
          <Plus size={16} /> Tạo Kế hoạch mới
        </button>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid-4 mb-4">
        <div className="card flex-between">
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tổng số Kế hoạch</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{schedules.length}</div>
          </div>
          <Calendar size={28} color="var(--primary)" />
        </div>

        <div className="card flex-between">
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang hoạt động (ACTIVE)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{activeCount}</div>
          </div>
          <CheckCircle size={28} color="var(--success)" />
        </div>

        <div className="card flex-between">
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đang tạm dừng (PAUSED)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>{pausedCount}</div>
          </div>
          <PauseCircle size={28} color="var(--warning)" />
        </div>

        <div className="card flex-between">
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cảnh báo Quá hạn</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)' }}>{overdueCount}</div>
          </div>
          <AlertCircle size={28} color="var(--danger)" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4 flex-between" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            style={{ maxWidth: '240px' }}
            placeholder="Tìm mã lịch, tiêu đề, thiết bị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="form-select" style={{ maxWidth: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">-- Tất cả trạng thái --</option>
            <option value="DRAFT">DRAFT (Nháp)</option>
            <option value="ACTIVE">ACTIVE (Đang chạy)</option>
            <option value="PAUSED">PAUSED (Tạm dừng)</option>
            <option value="COMPLETED">COMPLETED (Hoàn thành)</option>
            <option value="CANCELLED">CANCELLED (Đã hủy)</option>
          </select>

          <select className="form-select" style={{ maxWidth: '180px' }} value={freqFilter} onChange={(e) => setFreqFilter(e.target.value)}>
            <option value="">-- Tất cả chu kỳ --</option>
            <option value="DAILY">Hàng ngày</option>
            <option value="WEEKLY">Hàng tuần</option>
            <option value="MONTHLY">Hàng tháng</option>
            <option value="OPERATING_HOURS">Giờ vận hành</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={overdueFilter} onChange={(e) => setOverdueFilter(e.target.checked)} />
            Chỉ xem Quá hạn (Overdue)
          </label>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách kế hoạch bảo trì...</div>
      ) : schedules.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có kế hoạch bảo trì nào.</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Lịch</th>
                <th>Tên Kế hoạch</th>
                <th>Thiết bị</th>
                <th>Chu kỳ</th>
                <th>Ngày đến hạn kế tiếp</th>
                <th>Kỹ thuật viên</th>
                <th>Trạng thái</th>
                <th>Cảnh báo</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((sch) => {
                const now = new Date();
                const nextDate = sch.nextDueDate ? new Date(sch.nextDueDate) : null;
                const leadMs = (sch.leadTimeDays || 0) * 24 * 60 * 60 * 1000;
                const isOverdue = sch.status === 'ACTIVE' && nextDate && nextDate < now;
                const isDueSoon = sch.status === 'ACTIVE' && nextDate && nextDate >= now && nextDate.getTime() <= now.getTime() + leadMs;

                return (
                  <tr key={sch.id}>
                    <td style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{sch.scheduleCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sch.title}</div>
                      {sch.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sch.description}</div>}
                    </td>
                    <td>{sch.equipment?.name || sch.equipmentId}</td>
                    <td>
                      <span className="badge badge-info">{getFrequencyLabel(sch.frequencyType, sch.frequencyInterval)}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {sch.frequencyType === 'OPERATING_HOURS'
                        ? `${sch.nextDueMeter} giờ (Hiện tại: ${sch.equipment?.currentOperatingHours || 0})`
                        : sch.nextDueDate
                        ? new Date(sch.nextDueDate).toLocaleDateString('vi-VN')
                        : '---'}
                    </td>
                    <td>{sch.assignedTechnician?.name || '---'}</td>
                    <td>
                      <span
                        className={`badge ${
                          sch.status === 'ACTIVE'
                            ? 'badge-success'
                            : sch.status === 'PAUSED'
                            ? 'badge-warning'
                            : sch.status === 'DRAFT'
                            ? 'badge-secondary'
                            : 'badge-danger'
                        }`}
                      >
                        {sch.status}
                      </span>
                    </td>
                    <td>
                      {isOverdue ? (
                        <span className="badge badge-danger">
                          <AlertCircle size={12} /> Quá hạn
                        </span>
                      ) : isDueSoon ? (
                        <span className="badge badge-warning">
                          <Clock size={12} /> Sắp đến hạn
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bình thường</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {sch.status === 'DRAFT' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(sch)}>
                              <Edit2 size={13} /> Sửa
                            </button>
                            <button className="btn btn-success btn-sm" onClick={() => handleActivate(sch)}>
                              <PlayCircle size={13} /> Kích hoạt
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                setCancelTarget(sch);
                                setActionReason('');
                              }}
                            >
                              Hủy
                            </button>
                          </>
                        )}

                        {sch.status === 'ACTIVE' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleGenerateWO(sch)}>
                              <PlayCircle size={13} /> Sinh WO
                            </button>
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => {
                                setPauseTarget(sch);
                                setActionReason('');
                              }}
                            >
                              Tạm dừng
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                setCompleteTarget(sch);
                                setActionReason('');
                              }}
                            >
                              Hoàn thành
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                setCancelTarget(sch);
                                setActionReason('');
                              }}
                            >
                              Hủy
                            </button>
                          </>
                        )}

                        {sch.status === 'PAUSED' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(sch)}>
                              <Edit2 size={13} /> Sửa
                            </button>
                            <button className="btn btn-success btn-sm" onClick={() => handleActivate(sch)}>
                              <PlayCircle size={13} /> Tiếp tục (Resume)
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                setCancelTarget(sch);
                                setActionReason('');
                              }}
                            >
                              Hủy
                            </button>
                          </>
                        )}

                        <button className="btn btn-secondary btn-sm" onClick={() => openHistory(sch)}>
                          <History size={13} /> Timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add / Edit Schedule */}
      {(isAddOpen || editTarget) && (
        <Modal
          isOpen={isAddOpen || !!editTarget}
          onClose={() => {
            setIsAddOpen(false);
            setEditTarget(null);
          }}
          title={editTarget ? `Chỉnh sửa kế hoạch: ${editTarget.scheduleCode}` : 'Tạo Kế hoạch Bảo trì Định kỳ mới'}
        >
          <form onSubmit={editTarget ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label className="form-label">Tên Kế hoạch Bảo trì *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Bảo trì định kỳ máy phay Haas hàng tháng..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả công việc</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết quy trình kiểm tra..."
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Thiết bị *</label>
                <select
                  className="form-select"
                  required
                  disabled={!!editTarget && editTarget.status !== 'DRAFT'}
                  value={formData.equipmentId}
                  onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                >
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Loại Chu kỳ *</label>
                <select
                  className="form-select"
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value })}
                >
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                  <option value="QUARTERLY">Hàng quý</option>
                  <option value="YEARLY">Hàng năm</option>
                  <option value="OPERATING_HOURS">Số giờ vận hành</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Khoảng lặp (Interval) *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  value={formData.frequencyInterval}
                  onChange={(e) => setFormData({ ...formData, frequencyInterval: Math.max(1, Number(e.target.value)) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày bắt đầu *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mức ưu tiên mặc định</label>
                <select
                  className="form-select"
                  value={formData.defaultPriority}
                  onChange={(e) => setFormData({ ...formData, defaultPriority: e.target.value })}
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kỹ thuật viên phụ trách</label>
                <select
                  className="form-select"
                  value={formData.assignedTechnicianId}
                  onChange={(e) => setFormData({ ...formData, assignedTechnicianId: e.target.value })}
                >
                  <option value="">-- Chưa phân công --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.specialty || 'Chưa cập nhật'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tự động sinh phiếu (Auto Generate)</label>
                <select
                  className="form-select"
                  value={formData.autoGenerate ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, autoGenerate: e.target.value === 'true' })}
                >
                  <option value="true">Có (Tự động sinh WO khi đến hạn)</option>
                  <option value="false">Không (Chỉ sinh WO thủ công)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian báo trước (Lead Time - ngày)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: Math.max(0, Number(e.target.value)) })}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditTarget(null);
                }}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                {editTarget ? 'Lưu thay đổi' : 'Tạo Kế hoạch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Pause Schedule */}
      {pauseTarget && (
        <Modal isOpen={!!pauseTarget} onClose={() => setPauseTarget(null)} title={`Tạm dừng kế hoạch: ${pauseTarget.scheduleCode}`}>
          <form onSubmit={handlePauseSubmit}>
            <div className="form-group">
              <label className="form-label">Lý do tạm dừng *</label>
              <input
                type="text"
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Nhập lý do tạm dừng..."
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPauseTarget(null)}>Hủy</button>
              <button type="submit" className="btn btn-warning">Xác nhận Tạm Dừng</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Complete Schedule */}
      {completeTarget && (
        <Modal isOpen={!!completeTarget} onClose={() => setCompleteTarget(null)} title={`Hoàn thành kế hoạch: ${completeTarget.scheduleCode}`}>
          <form onSubmit={handleCompleteSubmit}>
            <div className="form-group">
              <label className="form-label">Lý do hoàn thành *</label>
              <input
                type="text"
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Kết thúc vòng đời máy, chuyển giao..."
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCompleteTarget(null)}>Hủy</button>
              <button type="submit" className="btn btn-success">Xác nhận HOÀN THÀNH</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cancel Schedule */}
      {cancelTarget && (
        <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title={`Hủy kế hoạch: ${cancelTarget.scheduleCode}`}>
          <form onSubmit={handleCancelSubmit}>
            <div className="form-group">
              <label className="form-label">Lý do hủy *</label>
              <input
                type="text"
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Nhập lý do hủy..."
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCancelTarget(null)}>Hủy</button>
              <button type="submit" className="btn btn-danger">Xác nhận HỦY KẾ HOẠCH</button>
            </div>
          </form>
        </Modal>
      )}

      {/* History Timeline Modal */}
      {historyTarget && (
        <Modal isOpen={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Lịch sử dòng thời gian: ${historyTarget.scheduleCode}`}>
          <div>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <RefreshCw size={18} className="animate-spin" style={{ color: 'var(--primary)' }} /> Đang tải dòng thời gian...
              </div>
            ) : historyTimeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Chưa có lịch sử giao dịch nào.</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Hành động</th>
                      <th>Chuyển trạng thái</th>
                      <th>Lý do</th>
                      <th>Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTimeline.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <span className="badge badge-info">{item.action}</span>
                        </td>
                        <td>
                          {item.fromStatus ? `${item.fromStatus} → ` : ''}
                          <strong>{item.toStatus}</strong>
                        </td>
                        <td>{item.reason || '---'}</td>
                        <td>{item.actedBy?.name || item.actedById || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
