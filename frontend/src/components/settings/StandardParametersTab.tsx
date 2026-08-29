import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, Search, RefreshCw, Gauge, CheckCircle2, XCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

interface StandardParamItem {
  id: string;
  name: string;
  unit?: string | null;
  minSpec?: number | null;
  maxSpec?: number | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const StandardParametersTab: React.FC = () => {
  const [params, setParams] = useState<StandardParamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StandardParamItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    minSpec: '',
    maxSpec: '',
    description: '',
    isActive: true,
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    setLoading(true);
    try {
      const data = await api.getStandardParameters();
      setParams(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message || 'Không thể tải danh sách thông số chuẩn.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParams = useMemo(() => {
    return params.filter((p) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.unit && p.unit.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
      );
    });
  }, [params, searchTerm]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      unit: '',
      minSpec: '',
      maxSpec: '',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StandardParamItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit || '',
      minSpec: item.minSpec !== null && item.minSpec !== undefined ? String(item.minSpec) : '',
      maxSpec: item.maxSpec !== null && item.maxSpec !== undefined ? String(item.maxSpec) : '',
      description: item.description || '',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập Tên thông số.');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: formData.name.trim(),
      unit: formData.unit.trim() || null,
      minSpec: formData.minSpec !== '' ? parseFloat(formData.minSpec) : null,
      maxSpec: formData.maxSpec !== '' ? parseFloat(formData.maxSpec) : null,
      description: formData.description.trim() || null,
      isActive: formData.isActive,
    };

    try {
      if (editingItem) {
        await api.updateStandardParameter(editingItem.id, payload);
        toast.success('Thành công', 'Đã cập nhật thông số chuẩn.');
      } else {
        await api.createStandardParameter(payload);
        toast.success('Thành công', 'Đã thêm thông số chuẩn mới.');
      }
      setIsModalOpen(false);
      loadParams();
    } catch (err: any) {
      toast.error('Lỗi lưu dữ liệu', err.message || 'Không thể lưu thông số chuẩn.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: StandardParamItem) => {
    const ok = await confirm(
      'Xác nhận xóa thông số',
      `Bạn có chắc chắn muốn xóa thông số chuẩn "${item.name}" không?`
    );
    if (ok) {
      try {
        await api.deleteStandardParameter(item.id);
        toast.success('Đã xóa', 'Thông số chuẩn đã được xóa.');
        loadParams();
      } catch (err: any) {
        toast.error('Lỗi xóa', err.message || 'Không thể xóa thông số chuẩn.');
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Thư viện thông số kỹ thuật chuẩn
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Định nghĩa sẵn các thông số máy móc (Nhiệt độ, Áp suất, Độ rung, Dòng điện...) và ngưỡng tiêu chuẩn Min/Max.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadParams}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Plus size={15} /> Thêm thông số
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary, #f8fafc)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tên thông số, đơn vị, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
          />
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
            }}
          />
        </div>

        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            marginLeft: 'auto',
          }}
        >
          Tổng số: <strong style={{ color: 'var(--text-primary)' }}>{filteredParams.length}</strong> / {params.length} thông số
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '13.5px' }}>Đang tải thông số chuẩn...</div>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ minWidth: '180px' }}>Tên thông số</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Đơn vị</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Ngưỡng tiêu chuẩn</th>
                  <th style={{ minWidth: '220px' }}>Mô tả / Hướng dẫn</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredParams.length > 0 ? (
                  filteredParams.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {index + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.unit ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: 'var(--bg-hover, #f1f5f9)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color, #e2e8f0)',
                            }}
                          >
                            {item.unit}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                        {item.minSpec !== null && item.maxSpec !== null
                          ? `${item.minSpec} ~ ${item.maxSpec}`
                          : item.minSpec !== null
                          ? `≥ ${item.minSpec}`
                          : item.maxSpec !== null
                          ? `≤ ${item.maxSpec}`
                          : '—'}
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {item.description || '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            backgroundColor: item.isActive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                            color: item.isActive ? '#16a34a' : '#64748b',
                          }}
                        >
                          {item.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {item.isActive ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Sửa"
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'transparent',
                              color: 'var(--accent-blue, #2563eb)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(item)}
                            title="Xóa"
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'transparent',
                              color: 'var(--danger, #dc2626)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '48px 24px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <Gauge size={26} />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          Chưa có thông số chuẩn nào
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          Khai báo các thông số vận hành tiêu chuẩn để áp dụng cho thiết bị trong sổ vận hành.
                        </p>
                        <button className="btn btn-primary" onClick={handleOpenAdd}>
                          <Plus size={15} /> Thêm thông số đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa thông số chuẩn' : 'Thêm thông số chuẩn mới'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Tên thông số <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Nhiệt độ tiệt trùng, Áp suất buồng, Độ rung..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Đơn vị đo (Unit)</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: °C, Bar, RPM, mm/s, V, A..."
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Ngưỡng dưới (Min Spec)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="VD: 120"
                value={formData.minSpec}
                onChange={(e) => setFormData({ ...formData, minSpec: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ngưỡng trên (Max Spec)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="VD: 125"
                value={formData.maxSpec}
                onChange={(e) => setFormData({ ...formData, maxSpec: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả / Hướng dẫn đo</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Ghi chú về vị trí gắn cảm biến, cách thức đo hoặc thiết bị đo chuẩn..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Kích hoạt sử dụng thông số này
            </label>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '16px 0 0 0',
              marginTop: '20px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting && <RefreshCw size={14} className="animate-spin" />}
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
