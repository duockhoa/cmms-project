import React, { useState, useEffect } from 'react';
import { XOctagon, FileText, AlertTriangle, Plus, Activity, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface EquipmentOperationDetailViewProps {
  equipmentId: string;
  onClose: () => void;
}

export const EquipmentOperationDetailView: React.FC<EquipmentOperationDetailViewProps> = ({
  equipmentId,
  onClose,
}) => {
  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, paramRes, logsRes] = await Promise.all([
        api.getEquipmentById(equipmentId),
        api.getEquipmentParameters(equipmentId),
        api.getOperationLogs(equipmentId)
      ]);
      setEquipment(eqRes);
      setParameters(paramRes);
      setLogs(logsRes);
    } catch (err) {
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

  const handleInputChange = (paramId: string, value: string) => {
    setFormData(prev => ({ ...prev, [paramId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const submitLogs = Object.keys(formData).map(paramId => ({
        parameterId: paramId,
        value: Number(formData[paramId]),
      })).filter(log => !isNaN(log.value));

      if (submitLogs.length === 0) {
        toast.warning('Thiếu dữ liệu', 'Vui lòng nhập ít nhất một thông số hợp lệ.');
        setSubmitting(false);
        return;
      }

      await api.submitOperationLogs(equipmentId, submitLogs);
      toast.success('Thành công', 'Đã lưu thông số vận hành thành công!');
      
      setFormData({});
      setIsFormOpen(false);
      fetchData(); // reload
    } catch (error: any) {
      toast.error('Lỗi', error.message || 'Lỗi khi lưu thông số vận hành.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !equipment) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
      Đang tải dữ liệu...
    </div>
  );

  const ActionButton = ({ onClick, disabled, icon: Icon, label, color }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', 
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, width: '100px'
      }}
    >
      <div style={{ 
        width: '50px', height: '50px', borderRadius: '50%', backgroundColor: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Icon size={24} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.3' }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="request-detail-view" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          Chi tiết Bản ghi Vận hành
        </h2>
        <button onClick={onClose} className="btn-icon">
          <XOctagon size={18} />
        </button>
      </div>

      <div className="request-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Top Header Card - Action Grid */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
             Các thao tác
           </h3>
           
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
             <ActionButton onClick={() => setIsFormOpen(true)} icon={Plus} label="Nhập thông số" color="#3b82f6" />
           </div>
        </div>

        {/* Metadata Table */}
        <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} /> Thông tin Thiết bị
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Mã thiết bị:</span> <strong>{equipment.code}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Tên thiết bị:</span> <strong>{equipment.name}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Khu vực:</span> <strong>{equipment.location}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Trạng thái:</span> <strong>{equipment.status === 'ACTIVE' ? 'Hoạt động' : 'Ngưng hoạt động'}</strong></div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Các thông số cần đo lường
          </h3>
          {parameters.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có cấu hình thông số đo lường nào cho thiết bị này.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {parameters.map(p => (
                <div key={p.id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Tiêu chuẩn: {p.minSpec ?? '-'} ~ {p.maxSpec ?? '-'} {p.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline (History) */}
        <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} /> Lịch sử Ghi nhận
          </h3>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có bản ghi vận hành nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.map(log => (
                <div key={log.id} style={{ 
                  padding: '12px', 
                  border: '1px solid', 
                  borderColor: log.isOutlier ? '#fca5a5' : 'var(--border-color)', 
                  borderRadius: '8px', 
                  backgroundColor: log.isOutlier ? '#fef2f2' : 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: log.isOutlier ? '#dc2626' : 'var(--text-primary)' }}>
                      {log.parameter?.name}: {log.value} {log.parameter?.unit}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {new Date(log.recordedAt).toLocaleString('vi-VN')} - Bởi {log.recordedBy?.name}
                    </div>
                  </div>
                  {log.isOutlier && (
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      Vượt ngưỡng
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Form Modal */}
      {isFormOpen && (
        <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`Nhập Thông số Vận hành - ${equipment.code}`}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Vui lòng điền các giá trị thực tế đo được cho <strong>{equipment.name}</strong>. Bỏ trống nếu không đo.
            </div>

            {parameters.map(param => (
              <div key={param.id} className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{param.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({param.minSpec ?? '-'} ~ {param.maxSpec ?? '-'} {param.unit})</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Nhập giá trị đo..."
                    value={formData[param.id] || ''}
                    onChange={(e) => handleInputChange(param.id, e.target.value)}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px', width: '40px' }}>{param.unit}</span>
                </div>
              </div>
            ))}

            <div className="modal-footer" style={{ padding: 0, marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu bản ghi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
