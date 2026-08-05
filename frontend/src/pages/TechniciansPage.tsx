import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Phone, Mail, CheckCircle, Clock, UserCheck, Search, Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const TechniciansPage: React.FC = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Edit Modal State
  const [editingTech, setEditingTech] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    specialty: '',
    isActive: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers({ role: 'TECHNICIAN', includeInactive: true });
      setTechnicians(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách kỹ thuật viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string, expectedVersion: number) => {
    try {
      await api.updateUserAvailability(id, { status: newStatus, expectedVersion });
      loadData();
    } catch (err: any) {
      if (err.message && (err.message.includes('Xung đột') || err.message.includes('Conflict'))) {
        alert('Xung đột đồng thời: Thông tin kỹ thuật viên đã được cập nhật bởi người khác. Vui lòng tải lại.');
      } else {
        alert(`Lỗi cập nhật trạng thái: ${err.message || 'Yêu cầu không hợp lệ'}`);
      }
    }
  };

  const handleOpenEdit = (tech: any) => {
    setEditingTech(tech);
    setFormData({
      specialty: tech.specialty || '',
      isActive: tech.isActive,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;

    try {
      await api.updateUserTechnicalProfile(editingTech.id, {
        specialty: formData.specialty,
        isActive: formData.isActive,
        expectedVersion: editingTech.version,
      });
      setEditingTech(null);
      loadData();
    } catch (err: any) {
      if (err.message && (err.message.includes('Xung đột') || err.message.includes('Conflict'))) {
        alert('Xung đột đồng thời: Thông tin kỹ thuật viên đã được cập nhật bởi người khác. Vui lòng tải lại.');
      } else {
        alert(`Lỗi cập nhật hồ sơ: ${err.message || 'Yêu cầu không hợp lệ'}`);
      }
    }
  };

  // Filter logic
  const filteredTechs = technicians.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialty && t.specialty.toLowerCase().includes(search.toLowerCase())) ||
      t.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    
    let matchesActive = true;
    if (activeFilter === 'ACTIVE') matchesActive = t.isActive === true;
    if (activeFilter === 'INACTIVE') matchesActive = t.isActive === false;

    return matchesSearch && matchesStatus && matchesActive;
  });

  // Calculate KPIs
  const activeCount = technicians.filter(t => t.isActive).length;
  const availableCount = technicians.filter(t => t.isActive && t.status === 'AVAILABLE').length;
  const busyCount = technicians.filter(t => t.isActive && t.status === 'BUSY').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách kỹ thuật viên...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Lỗi tải dữ liệu</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{error}</p>
        </div>
        <button className="btn btn-primary" onClick={loadData}>
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kỹ thuật viên</h1>
          <p className="page-subtitle">Quản lý đội ngũ kỹ thuật viên, chuyên môn và phân công công việc</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng kỹ thuật viên</div>
          <div className="kpi-card-value">{activeCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Sẵn sàng</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{availableCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Đang bận</div>
          <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{busyCount}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo tên, email, chuyên môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="AVAILABLE">AVAILABLE (Sẵn sàng)</option>
          <option value="BUSY">BUSY (Đang bận)</option>
          <option value="ON_LEAVE">ON_LEAVE (Nghỉ phép)</option>
        </select>

        <select
          className="form-select"
          style={{ width: '180px' }}
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="ALL">Tất cả hoạt động</option>
          <option value="ACTIVE">Chỉ đang hoạt động</option>
          <option value="INACTIVE">Chỉ ngừng hoạt động</option>
        </select>
      </div>

      {/* Cards Grid */}
      {filteredTechs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Không tìm thấy kỹ thuật viên nào khớp với điều kiện lọc.
        </div>
      ) : (
        <div className="grid-2">
          {filteredTechs.map((t) => {
            const initials = t.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'KT';
            return (
              <div key={t.id} className="card" style={{ opacity: t.isActive ? 1 : 0.6 }}>
                <div className="flex-between mb-4">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: t.isActive ? 'var(--primary)' : 'var(--text-muted)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '14px'
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t.name}</h4>
                        {!t.isActive && <span className="badge badge-secondary" style={{ fontSize: '10px' }}>Ngừng hoạt động</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.specialty || 'Chưa cập nhật chuyên môn'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <select
                      className="form-select"
                      style={{
                        padding: '2px 8px', fontSize: '11px', height: 'auto', width: '120px',
                        borderColor: t.status === 'AVAILABLE' ? 'var(--success)' : t.status === 'BUSY' ? 'var(--warning)' : 'var(--border-color)'
                      }}
                      value={t.status}
                      disabled={!t.isActive}
                      onChange={(e) => handleStatusChange(t.id, e.target.value, t.version)}
                    >
                      <option value="AVAILABLE">Sẵn sàng</option>
                      <option value="BUSY">Đang bận</option>
                      <option value="ON_LEAVE">Nghỉ phép</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {t.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>Bộ phận: {t.department || '---'}</div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {t.activeWorkOrderCount} công việc đang xử lý
                  </span>
                  <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }} onClick={() => handleOpenEdit(t)}>
                    <Edit2 size={12} /> Sửa hồ sơ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingTech && (
        <Modal isOpen={!!editingTech} onClose={() => setEditingTech(null)} title={`Sửa hồ sơ kỹ thuật: ${editingTech.name}`}>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group">
              <label className="form-label">Chuyên môn kỹ thuật *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="VD: Cơ khí CNC, Khí nén & Động lực..."
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Gợi ý: Cơ khí, Tự động hóa, Điện công nghiệp, Khí nén, Hàn laser
              </p>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                Kỹ thuật viên đang hoạt động (Active)
              </label>
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingTech(null)}>Hủy</button>
              <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
