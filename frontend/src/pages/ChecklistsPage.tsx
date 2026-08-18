import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, Eye, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { useNavigate } from 'react-router-dom';

export const ChecklistsPage: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  // Runner state
  const [runnerResults, setRunnerResults] = useState<{ [key: number]: boolean }>({});

  const [formData, setFormData] = useState({
    name: '',
    code: 'CL-001',
    category: 'Cơ khí',
    description: '',
  });

  const loadTemplates = () => {
    setLoading(true);
    api.getChecklistTemplates()
      .then((res) => {
        setTemplates(res);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTpl = await api.createChecklistTemplate(formData);
      toast.success('Tạo Checklist Template thành công');
      setIsAddOpen(false);
      navigate(`/checklists/${newTpl.id}`);
    } catch (err: any) {
      toast.error('Lỗi tạo template', err.message);
    }
  };

  const totalChecklists = templates.length;
  const activeCount = templates.filter((s: any) => s.isActive).length;
  const reviewCount = templates.filter((s: any) => !s.isActive).length;

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
          <div className="kpi-card-title">Tổng mẫu Checklist</div>
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
              <th>Tên checklist (Template)</th>
              <th>Phân loại</th>
              <th>Mô tả</th>
              <th>Số hạng mục</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((tpl) => (
              <tr key={tpl.id}>
                <td style={{ fontWeight: 700 }}>{tpl.code}</td>
                <td style={{ fontWeight: 600 }}>{tpl.name}</td>
                <td>{tpl.category || 'Chưa phân loại'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{tpl.description || '-'}</td>
                <td style={{ fontWeight: 600 }}>{tpl._count?.items || 0} mục</td>
                <td>
                  <span className={`badge badge-${tpl.isActive ? 'success' : 'neutral'}`}>
                    {tpl.isActive ? 'Đang dùng' : 'Tạm dừng'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/checklists/${tpl.id}`)}>
                      <Eye size={12} /> Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>Chưa có mẫu Checklist nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo Checklist Template mới">
        <form onSubmit={handleCreateTemplate}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tên mẫu checklist *</label>
              <input type="text" className="form-input" required placeholder="VD: Mẫu kiểm tra an toàn" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mã (Code) *</label>
              <input type="text" className="form-input" required placeholder="VD: CL-001" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Phân loại</label>
              <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Cơ khí">Cơ khí</option>
                <option value="Điện">Điện & Điện tử</option>
                <option value="An toàn">An toàn</option>
                <option value="Chung">Chung</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Mô tả</label>
              <textarea className="form-input" rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
