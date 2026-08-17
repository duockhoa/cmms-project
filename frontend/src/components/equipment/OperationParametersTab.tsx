import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link as LinkIcon, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

interface OperationParametersTabProps {
  equipmentId: string;
}

export const OperationParametersTab: React.FC<OperationParametersTabProps> = ({ equipmentId }) => {
  const [parameters, setParameters] = useState<any[]>([]);
  const [standardParameters, setStandardParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Config Modal
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [editingParam, setEditingParam] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    minSpec: '',
    maxSpec: '',
    isActive: true
  });

  const fetchParameters = async () => {
    try {
      setLoading(true);
      const [resParams, resStandard] = await Promise.all([
        api.getEquipmentParameters(equipmentId),
        api.getStandardParameters().catch(() => []) // Fallback to empty if error
      ]);
      setParameters(resParams);
      setStandardParameters(resStandard);
    } catch (err) {
      console.error('Lỗi khi tải cấu hình thông số');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
  }, [equipmentId]);

  const handleOpenConfigModal = (param: any = null) => {
    setEditingParam(param);
    if (param) {
      setFormData({
        name: param.name || '',
        unit: param.unit || '',
        minSpec: param.minSpec !== null ? String(param.minSpec) : '',
        maxSpec: param.maxSpec !== null ? String(param.maxSpec) : '',
        isActive: param.isActive
      });
    } else {
      setFormData({ name: '', unit: '', minSpec: '', maxSpec: '', isActive: true });
    }
    setIsConfigModalVisible(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        minSpec: formData.minSpec ? Number(formData.minSpec) : null,
        maxSpec: formData.maxSpec ? Number(formData.maxSpec) : null,
        isActive: formData.isActive
      };

      if (editingParam) {
        await api.updateEquipmentParameter(equipmentId, editingParam.id, payload);
        alert('Cập nhật thông số thành công');
      } else {
        await api.createEquipmentParameter(equipmentId, payload);
        alert('Thêm thông số thành công');
      }
      setIsConfigModalVisible(false);
      fetchParameters();
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu thông số');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!window.confirm("Xóa thông số này?")) return;
    try {
      await api.deleteEquipmentParameter(equipmentId, id);
      alert('Đã xóa thông số');
      fetchParameters();
    } catch (error) {
      alert('Lỗi khi xóa thông số');
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Danh sách thông số</h3>
          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>Cấu hình các thông số vận hành cần theo dõi cho thiết bị này</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenConfigModal()}>
          <Plus size={16} /> Thêm thông số
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper card" style={{ padding: '0' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tên thông số</th>
                <th>Đơn vị</th>
                <th>Min Spec</th>
                <th>Max Spec</th>
                <th>Trạng thái</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map(param => (
                <tr 
                  key={param.id}
                  style={{ transition: 'background-color 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ fontWeight: 600 }}>{param.name}</td>
                  <td>{param.unit || '---'}</td>
                  <td>{param.minSpec !== null ? param.minSpec : '---'}</td>
                  <td>{param.maxSpec !== null ? param.maxSpec : '---'}</td>
                  <td>
                    <span style={{ 
                      backgroundColor: param.isActive ? '#dcfce7' : '#f3f4f6', 
                      color: param.isActive ? '#16a34a' : '#6b7280', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {param.isActive ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleOpenConfigModal(param)} 
                        title="Chỉnh sửa"
                        style={{ padding: '6px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleDeleteConfig(param.id)} 
                        title="Xóa"
                        style={{ padding: '6px', backgroundColor: 'transparent', border: '1px solid #fee2e2', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {parameters.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chưa có cấu hình thông số nào. Hãy bấm "Thêm thông số" để bắt đầu.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal - Cấu hình */}
      <Modal 
        isOpen={isConfigModalVisible} 
        onClose={() => setIsConfigModalVisible(false)} 
        title={editingParam ? "Sửa thông số vận hành" : "Thêm thông số vận hành mới"}
      >
        <form onSubmit={handleSaveConfig}>
          {!editingParam && standardParameters.length > 0 && (
            <div className="form-group" style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-color)' }}>
              <label className="form-label" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>🌟 Chọn nhanh từ thư viện chuẩn</label>
              <select 
                className="form-select"
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) return;
                  const std = standardParameters.find(p => p.id === selectedId);
                  if (std) {
                    setFormData({
                      name: std.name,
                      unit: std.unit || '',
                      minSpec: std.minSpec !== null ? String(std.minSpec) : '',
                      maxSpec: std.maxSpec !== null ? String(std.maxSpec) : '',
                      isActive: true
                    });
                  }
                }}
              >
                <option value="">-- Tự nhập thủ công hoặc chọn từ danh sách --</option>
                {standardParameters.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.name} {sp.unit ? `(${sp.unit})` : ''}</option>
                ))}
              </select>
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Chọn một thông số chuẩn để hệ thống tự động điền các ô bên dưới.</small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tên thông số *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="VD: Nhiệt độ, Áp suất..."
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Đơn vị</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="VD: °C, Bar, RPM..."
              value={formData.unit} 
              onChange={e => setFormData({...formData, unit: e.target.value})} 
            />
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn dưới (Min)</label>
              <input 
                type="number" 
                step="any"
                className="form-input" 
                placeholder="Ngưỡng cảnh báo min"
                value={formData.minSpec} 
                onChange={e => setFormData({...formData, minSpec: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn trên (Max)</label>
              <input 
                type="number" 
                step="any"
                className="form-input" 
                placeholder="Ngưỡng cảnh báo max"
                value={formData.maxSpec} 
                onChange={e => setFormData({...formData, maxSpec: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox" 
              id="isActive" 
              checked={formData.isActive} 
              onChange={e => setFormData({...formData, isActive: e.target.checked})} 
            />
            <label htmlFor="isActive" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Đang hoạt động</label>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsConfigModalVisible(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {editingParam ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
