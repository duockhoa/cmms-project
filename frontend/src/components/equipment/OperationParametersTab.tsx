import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Link as LinkIcon, X, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { EmptyState } from '../common';
import { usePermissions } from '../../hooks/usePermissions';

interface OperationParametersTabProps {
  equipmentId: string;
}

export const OperationParametersTab: React.FC<OperationParametersTabProps> = ({ equipmentId }) => {
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const { can } = usePermissions();
  const canReorder = can('equipment:reorder_parameters');
  const [parameters, setParameters] = useState<any[]>([]);
  const [standardParameters, setStandardParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

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
        toast.success('Thành công', 'Cập nhật thông số thành công');
      } else {
        await api.createEquipmentParameter(equipmentId, payload);
        toast.success('Thành công', 'Thêm thông số thành công');
      }
      setIsConfigModalVisible(false);
      fetchParameters();
    } catch (error: any) {
      toast.error('Lỗi', error.message || 'Có lỗi xảy ra khi lưu thông số');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    const ok = await confirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa thông số vận hành này?', {
      confirmText: 'Xóa thông số',
      cancelText: 'Hủy',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await api.deleteEquipmentParameter(equipmentId, id);
      toast.success('Đã xóa', 'Đã xóa thông số vận hành');
      fetchParameters();
    } catch (error: any) {
      toast.error('Lỗi', error.message || 'Lỗi khi xóa thông số');
    }
  };

  const handleMoveParam = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= parameters.length || reordering) return;
    const reordered = [...parameters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setParameters(reordered);
    setReordering(true);
    try {
      await api.reorderEquipmentParameters(equipmentId, reordered.map(p => p.id));
      toast.success('Thành công', 'Đã lưu thứ tự thông số');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể cập nhật thứ tự');
      fetchParameters();
    } finally {
      setReordering(false);
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
                <th style={{ width: canReorder ? '85px' : '55px', textAlign: 'center' }}>Thứ tự</th>
                <th>Tên thông số</th>
                <th>Đơn vị</th>
                <th>Min Spec</th>
                <th>Max Spec</th>
                <th>Trạng thái</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => (
                <tr 
                  key={param.id}
                  style={{ transition: 'background-color 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ 
                        fontSize: '11.5px', 
                        fontWeight: 700, 
                        backgroundColor: '#f1f5f9', 
                        color: '#475569', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        #{index + 1}
                      </span>
                      {canReorder && parameters.length > 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button
                            type="button"
                            disabled={index === 0 || reordering}
                            onClick={() => handleMoveParam(index, 'up')}
                            style={{
                              border: '1px solid #cbd5e1',
                              backgroundColor: index === 0 ? '#f8fafc' : '#ffffff',
                              color: index === 0 ? '#cbd5e1' : '#1e293b',
                              borderRadius: '3px',
                              padding: '1px 4px',
                              fontSize: '9px',
                              cursor: index === 0 ? 'not-allowed' : 'pointer',
                              lineHeight: 1
                            }}
                            title="Di chuyển lên"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === parameters.length - 1 || reordering}
                            onClick={() => handleMoveParam(index, 'down')}
                            style={{
                              border: '1px solid #cbd5e1',
                              backgroundColor: index === parameters.length - 1 ? '#f8fafc' : '#ffffff',
                              color: index === parameters.length - 1 ? '#cbd5e1' : '#1e293b',
                              borderRadius: '3px',
                              padding: '1px 4px',
                              fontSize: '9px',
                              cursor: index === parameters.length - 1 ? 'not-allowed' : 'pointer',
                              lineHeight: 1
                            }}
                            title="Di chuyển xuống"
                          >
                            ▼
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
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
                <EmptyState
                  colSpan={7}
                  compact
                  minHeight={150}
                  title="Chưa có cấu hình thông số vận hành"
                  description="Thêm thông số để bắt đầu theo dõi giới hạn vận hành của thiết bị."
                  action={{ label: 'Thêm thông số', onClick: () => setIsConfigModalVisible(true), icon: Plus }}
                />
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
