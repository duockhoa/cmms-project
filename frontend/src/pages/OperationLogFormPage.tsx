import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function OperationLogFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch equipment details (Using standard endpoint)
        const eqRes = await api.getEquipmentById(id);
        setEquipment(eqRes);

        // Fetch parameters
        const paramRes = await api.getEquipmentParameters(id);
        setParameters(paramRes);
      } catch (error) {
        alert('Không thể tải thông tin thiết bị hoặc thông số vận hành.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const logs = Object.keys(formData).map(paramId => ({
        parameterId: paramId,
        value: Number(formData[paramId]),
      })).filter(log => !isNaN(log.value));

      if (logs.length === 0) {
        alert('Vui lòng nhập ít nhất một thông số hợp lệ.');
        setSubmitting(false);
        return;
      }

      await api.submitOperationLogs(id, logs);
      alert('Đã lưu thông số vận hành thành công!');
      
      setFormData({});
    } catch (error) {
      alert('Lỗi khi lưu thông số vận hành.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (paramId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 50, color: 'var(--text-secondary)' }}>Đang tải...</div>;
  }

  if (!equipment) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
          Không tìm thấy thiết bị.
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Nhập thông số vận hành
        </h2>
        
        <div style={{ marginBottom: 24, padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thiết bị</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {equipment.name} ({equipment.code})
          </div>
        </div>

        {parameters.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '8px' }}>
            Thiết bị này chưa được cấu hình thông số vận hành.
          </div>
        ) : (
          <form onSubmit={onFinish} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {parameters.map(param => (
              <div key={param.id}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {param.name} {param.unit ? `(${param.unit})` : ''}
                </label>
                {(param.minSpec !== null || param.maxSpec !== null) && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Tiêu chuẩn: {param.minSpec !== null ? `Min ${param.minSpec}` : ''} 
                    {param.minSpec !== null && param.maxSpec !== null ? ' - ' : ''}
                    {param.maxSpec !== null ? `Max ${param.maxSpec}` : ''}
                  </div>
                )}
                <input 
                  type="number" 
                  step="any"
                  className="form-control" 
                  placeholder="Nhập giá trị..." 
                  value={formData[param.id] || ''}
                  onChange={(e) => handleInputChange(param.id, e.target.value)}
                  style={{ padding: '10px 14px', fontSize: '15px' }}
                />
              </div>
            ))}

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
              style={{ padding: '12px', fontSize: '15px', marginTop: '10px' }}
            >
              {submitting ? 'Đang lưu...' : 'Lưu thông số'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
