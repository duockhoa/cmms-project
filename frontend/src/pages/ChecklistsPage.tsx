import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, CheckSquare, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const ChecklistsPage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [runnerItem, setRunnerItem] = useState<any>(null);
  const toast = useToast();

  // Runner state
  const [runnerResults, setRunnerResults] = useState<{ [key: number]: boolean }>({});

  const [formData, setFormData] = useState({
    title: '',
    code: 'CL-MEC-001',
    maintenanceType: 'Kiểm tra an toàn',
    group: 'Cơ khí',
    frequency: 'MONTHLY',
    description: '',
  });

  useEffect(() => {
    api.getSchedules()
      .then((res) => {
        if (res && Array.isArray(res)) {
          setSchedules(res);
        } else if (res && Array.isArray(res.data)) {
          setSchedules(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpenRunner = (sch: any) => {
    let items = [];
    try {
      items = typeof sch.checklistJson === 'string' ? JSON.parse(sch.checklistJson) : sch.checklistJson;
    } catch (e) {}
    setRunnerItem({ ...sch, items });

    // Initialize all as passed (true)
    const initial: any = {};
    (items || []).forEach((_: any, idx: number) => { initial[idx] = true; });
    setRunnerResults(initial);
  };

  const handleCompleteChecklist = () => {
    const total = (runnerItem.items || []).length;
    const passed = Object.values(runnerResults).filter(Boolean).length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;
    toast.success('Hoàn tất Checklist', `Kiểm tra "${runnerItem.title}" hoàn thành. Kết quả: ${passed}/${total} mục ĐẠT (${score}%).`);
    setRunnerItem(null);
  };

  const totalChecklists = schedules.length;
  const activeCount = schedules.filter((s: any) => s.status === 'ACTIVE').length;
  const reviewCount = schedules.filter((s: any) => s.status === 'DRAFT' || s.status === 'PAUSED').length;
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dueSoonCount = schedules.filter((s: any) => s.status === 'ACTIVE' && s.nextDueDate && new Date(s.nextDueDate) <= sevenDaysFromNow).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Checklist bảo trì</h1>
          <p className="page-subtitle">Quản lý checklist kiểm tra và bảo trì thiết bị</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Tạo checklist
        </button>
      </div>

      {/* KPI Summary Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng checklist</div>
          <div className="kpi-card-value">{totalChecklists}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Đang áp dụng</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{activeCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Cần rà soát</div>
          <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{reviewCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Sắp đến hạn</div>
          <div className="kpi-card-value">{dueSoonCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Tỷ lệ đạt TB</div>
          <div className="kpi-card-value" style={{ color: 'var(--info)' }}>100%</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" className="form-input" style={{ paddingLeft: '34px' }} placeholder="Tìm theo tên, mã checklist..." />
        </div>
        <select className="form-select" style={{ width: '160px' }}><option>Tất cả trạng thái</option></select>
        <select className="form-select" style={{ width: '160px' }}><option>Tất cả nhóm</option></select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên checklist</th>
              <th>Loại bảo trì</th>
              <th>Nhóm thiết bị</th>
              <th>Trạng thái</th>
              <th>Tỷ lệ đạt</th>
              <th>Hạn tiếp theo</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((sch) => (
              <tr key={sch.id}>
                <td style={{ fontWeight: 700 }}>{sch.scheduleCode}</td>
                <td style={{ fontWeight: 600 }}>{sch.title}</td>
                <td>{sch.frequencyType}</td>
                <td>{sch.equipment?.category || 'Chưa phân loại'}</td>
                <td>
                  <span className={`badge badge-${sch.status === 'ACTIVE' ? 'success' : sch.status === 'PAUSED' ? 'warning' : 'neutral'}`}>
                    {sch.status === 'ACTIVE' ? 'Áp dụng' : sch.status === 'PAUSED' ? 'Tạm dừng' : sch.status}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>100%</td>
                <td>
                  {sch.nextDueDate 
                    ? new Date(sch.nextDueDate).toLocaleDateString('vi-VN') 
                    : (sch.nextDueMeter ? `${sch.nextDueMeter} giờ` : '---')}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleOpenRunner(sch)}>
                      <PlayCircle size={12} /> Thực hiện
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Runner Modal */}
      {runnerItem && (
        <Modal isOpen={!!runnerItem} onClose={() => setRunnerItem(null)} title={`Thực hiện Kiểm tra Checklist: ${runnerItem.title}`}>
          <div>
            <p className="mb-4" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Thiết bị: <strong>{runnerItem.equipment?.name}</strong> | Tần suất: <strong>{runnerItem.frequency}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {(runnerItem.items || []).map((item: string, idx: number) => {
                const isPassed = runnerResults[idx] ?? true;
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      <strong>{idx + 1}.</strong> {item}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className={`btn btn-sm ${isPassed ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => setRunnerResults({ ...runnerResults, [idx]: true })}
                      >
                        <CheckCircle2 size={14} /> ĐẠT
                      </button>
                      <button
                        className={`btn btn-sm ${!isPassed ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => setRunnerResults({ ...runnerResults, [idx]: false })}
                      >
                        <XCircle size={14} /> KHÔNG ĐẠT
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer" style={{ padding: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRunnerItem(null)}>Đóng</button>
              <button type="button" className="btn btn-primary" onClick={handleCompleteChecklist}>
                Xác nhận Hoàn thành Checklist
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo checklist mới">
        <form onSubmit={(e) => { e.preventDefault(); setIsAddOpen(false); }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tên checklist *</label>
              <input type="text" className="form-input" required placeholder="VD: Kiểm tra an toàn cần trục" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mã checklist *</label>
              <input type="text" className="form-input" required placeholder="VD: CL-MEC-003" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Tạo checklist</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
