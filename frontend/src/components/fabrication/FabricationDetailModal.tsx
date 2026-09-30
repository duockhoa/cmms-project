import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, Clock, Hammer, User, 
  MapPin, Calendar, Plus, Trash2, Cpu, Award
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { StatusBadge } from '../common/Badge';

interface FabricationDetailModalProps {
  job: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated?: any) => void;
  technicians: any[];
}

export const FabricationDetailModal: React.FC<FabricationDetailModalProps> = ({
  job,
  isOpen,
  onClose,
  onSuccess,
  technicians,
}) => {
  const [status, setStatus] = useState<string>('ASSIGNED');
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [actualHours, setActualHours] = useState<number>(0);
  const [resultNotes, setResultNotes] = useState<string>('');
  const [acceptanceRating, setAcceptanceRating] = useState<string>('GOOD');
  const [acceptedByName, setAcceptedByName] = useState<string>('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    if (job) {
      setStatus(job.status || 'ASSIGNED');
      let initialTechs: string[] = [];
      if (job.assignedTechnicianId) initialTechs.push(job.assignedTechnicianId);
      if (job.supporterIds) {
        try {
          const parsed = typeof job.supporterIds === 'string' ? JSON.parse(job.supporterIds) : job.supporterIds;
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => {
              if (id && !initialTechs.includes(id)) initialTechs.push(id);
            });
          }
        } catch (e) {}
      }
      setSelectedTechIds(initialTechs);
      setActualHours(job.actualHours || job.estimatedHours || 0);
      setResultNotes(job.resultNotes || '');
      setAcceptanceRating(job.acceptanceRating || 'GOOD');
      setAcceptedByName(job.acceptedByName || '');
      setMaterials(job.materials || []);
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const handleAddMaterial = () => {
    setMaterials([...materials, { materialName: '', quantity: 1, unit: 'cái', unitPrice: 0, totalPrice: 0 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const updated = [...materials];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : updated[index].quantity || 0;
      const p = field === 'unitPrice' ? parseFloat(value) || 0 : updated[index].unitPrice || 0;
      updated[index].totalPrice = q * p;
    }
    setMaterials(updated);
  };

  const handleSave = async (targetStatus?: string) => {
    setSubmitting(true);
    try {
      const newStatus = targetStatus || status;

      const validMaterials = materials
        .filter((m) => m.materialName && m.materialName.trim() !== '')
        .map((m) => ({
          materialName: m.materialName.trim(),
          quantity: Number(m.quantity) || 1,
          unit: m.unit.trim() || 'cái',
          unitPrice: Number(m.unitPrice) || 0,
        }));

      const updated = await api.updateFabricationOrder(job.id, {
        status: newStatus,
        assignedTechnicianId: selectedTechIds[0] || undefined,
        supporterIds: selectedTechIds.length > 1 ? selectedTechIds.slice(1) : undefined,
        actualHours: Number(actualHours) || 0,
        resultNotes: resultNotes.trim() || undefined,
        acceptanceRating: newStatus === 'CLOSED' ? acceptanceRating : undefined,
        acceptedByName: newStatus === 'CLOSED' ? (acceptedByName.trim() || undefined) : undefined,
        materials: validMaterials,
      });

      onSuccess(updated);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể cập nhật công việc');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMaterialCost = materials.reduce((sum, m) => sum + (Number(m.totalPrice) || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: '#2563eb' }}>{job.orderCode}</span>
              <StatusBadge status={job.status} />
              <StatusBadge status={job.priority} />
            </div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {job.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '50%',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Thông tin khái quát */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '12.5px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Phân loại:</span>
              <strong style={{ color: '#1e293b' }}>
                {job.category === 'FABRICATION'
                  ? 'Gia công cơ khí'
                  : job.category === 'NEW_MAKING'
                  ? 'Chế tạo mới'
                  : job.category === 'MODIFICATION'
                  ? 'Cải tiến / Kaizen'
                  : job.category === 'INSTALLATION'
                  ? 'Lắp đặt & Di dời'
                  : job.category === 'INFRASTRUCTURE'
                  ? 'Cơ sở hạ tầng xưởng'
                  : 'Công việc khác'}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Vị trí áp dụng:</span>
              <strong>{job.location || 'Chưa ghi nhận'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Bộ phận thụ hưởng:</span>
              <strong>{job.targetDepartment || 'Cơ điện / Toàn xưởng'}</strong>
            </div>

            {job.equipment && (
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Thiết bị liên quan:</span>
                <strong>[{job.equipment.code}] {job.equipment.name}</strong>
              </div>
            )}
          </div>

          {/* Mô tả & Quy cách */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mô tả:
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {job.description}
              </div>
            </div>

            <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Quy cách / Kích thước:
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {job.specifications || 'Chưa có thông số chi tiết'}
              </div>
            </div>
          </div>

          {/* Cập nhật tiến độ & Phân công */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Tiến độ & Phân công
            </h4>

            {/* Danh sách kỹ thuật viên cơ điện */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} color="#2563eb" /> Nhân viên cơ điện phụ trách (chọn nhiều người)
                </label>
                {selectedTechIds.length > 0 && (
                  <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>
                    Đã phân công {selectedTechIds.length} người
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  minHeight: '40px',
                  alignItems: 'center',
                }}
              >
                {technicians.map((t) => {
                  const isSelected = selectedTechIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTechIds(selectedTechIds.filter((id) => id !== t.id));
                        } else {
                          setSelectedTechIds([...selectedTechIds, t.id]);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#1d4ed8' : '#475569',
                      }}
                    >
                      <span>{t.name}</span>
                      {t.specialty && (
                        <span style={{ fontSize: '10.5px', opacity: 0.75 }}>
                          ({t.specialty})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Trạng thái
                </label>
                <select
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="ASSIGNED">Chờ thực hiện</option>
                  <option value="IN_PROGRESS">Đang thực hiện</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="CLOSED">Đã nghiệm thu / Đóng</option>
                  <option value="CANCELLED">Hủy bỏ</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Giờ công thực tế
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={actualHours}
                  onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '13px', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          {/* Bảng vật tư phôi thô */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vật tư sử dụng thực tế
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddMaterial}
                style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Thêm vật tư
              </button>
            </div>

            <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '8px 12px' }}>Tên vật tư</th>
                    <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>SL</th>
                    <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Đơn giá (đ)</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '8px 6px', width: '38px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => {
                    const rowTotal = (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: idx < materials.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Tên vật tư (Inox, sắt, que hàn...)"
                            value={m.materialName}
                            onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="number"
                            step="any"
                            className="form-input"
                            value={m.quantity}
                            onChange={(e) => handleMaterialChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={m.unit}
                            onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="number"
                            step="1000"
                            className="form-input"
                            value={m.unitPrice || ''}
                            onChange={(e) => handleMaterialChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '12.5px' }}>
                          {rowTotal > 0 ? `${rowTotal.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {materials.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Chưa có vật tư nào được ghi nhận. Bấm "+ Thêm vật tư" để bổ sung.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalMaterialCost > 0 && (
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12.5px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Tổng chi phí vật tư:</span>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px' }}>
                    {totalMaterialCost.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ghi chú kết quả & Nghiệm thu */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nghiệm thu bàn giao
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '14px', marginBottom: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Ghi chú hoàn thành
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Kết quả thực hiện..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={13} color="#f59e0b" /> Đánh giá chất lượng
                </label>
                <select
                  className="form-input"
                  value={acceptanceRating}
                  onChange={(e) => setAcceptanceRating(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                >
                  <option value="EXCELLENT">Xuất sắc</option>
                  <option value="GOOD">Tốt (Đạt yêu cầu)</option>
                  <option value="ACCEPTABLE">Chấp nhận được</option>
                  <option value="POOR">Chưa đạt</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                  Người nghiệm thu
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Họ tên người nhận bàn giao"
                  value={acceptedByName}
                  onChange={(e) => setAcceptedByName(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {status === 'ASSIGNED' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSave('IN_PROGRESS')}
                disabled={submitting}
                style={{ backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
              >
                Bắt đầu làm
              </button>
            )}

            {status === 'IN_PROGRESS' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSave('COMPLETED')}
                disabled={submitting}
                style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
              >
                Báo hoàn thành
              </button>
            )}

            {status === 'COMPLETED' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSave('CLOSED')}
                disabled={submitting}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <CheckCircle2 size={14} /> Nghiệm thu & Đóng
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSave()}
              disabled={submitting}
              style={{ minWidth: '120px' }}
            >
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
