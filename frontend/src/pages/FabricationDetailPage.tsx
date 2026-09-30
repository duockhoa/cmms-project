import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, Clock, Calendar, User, MapPin, Cpu, Building2, 
  CheckCircle2, AlertCircle, Plus, Trash2, Printer, Save, Award, 
  ChevronRight, Wrench, Package, FileText, Check, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { StatusBadge } from '../components/common/Badge';

export const FabricationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Available staff for assignment
  const [staffList, setStaffList] = useState<any[]>([]);

  // Editable work progress states
  const [status, setStatus] = useState<string>('ASSIGNED');
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [actualHours, setActualHours] = useState<number>(0);
  const [resultNotes, setResultNotes] = useState<string>('');
  const [acceptanceRating, setAcceptanceRating] = useState<string>('GOOD');
  const [acceptedByName, setAcceptedByName] = useState<string>('');
  const [materials, setMaterials] = useState<any[]>([]);

  const loadJob = async (jobId: string) => {
    try {
      setLoading(true);
      const [jobData, usersData] = await Promise.all([
        api.getFabricationOrder(jobId),
        api.getUsers({ department: 'xưởng cơ điện' }),
      ]);

      if (!jobData) {
        toast.error('Không tìm thấy', 'Công việc gia công không tồn tại');
        navigate('/fabrication');
        return;
      }

      setJob(jobData);
      setStaffList(Array.isArray(usersData) ? usersData : []);

      // Populate local state
      setStatus(jobData.status || 'ASSIGNED');
      setActualHours(jobData.actualHours || jobData.estimatedHours || 0);
      setResultNotes(jobData.resultNotes || '');
      setAcceptanceRating(jobData.acceptanceRating || 'GOOD');
      setAcceptedByName(jobData.acceptedByName || '');
      setMaterials(jobData.materials || []);

      // Initialize technicians
      let initialTechs: string[] = [];
      if (jobData.assignedTechnicianId) initialTechs.push(jobData.assignedTechnicianId);
      if (jobData.supporterIds) {
        try {
          const parsed = typeof jobData.supporterIds === 'string' ? JSON.parse(jobData.supporterIds) : jobData.supporterIds;
          if (Array.isArray(parsed)) {
            parsed.forEach((tId: string) => {
              if (tId && !initialTechs.includes(tId)) initialTechs.push(tId);
            });
          }
        } catch (e) {}
      }
      setSelectedTechIds(initialTechs);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải thông tin công việc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  const handleToggleTech = (techId: string) => {
    if (selectedTechIds.includes(techId)) {
      setSelectedTechIds(selectedTechIds.filter((t) => t !== techId));
    } else {
      setSelectedTechIds([...selectedTechIds, techId]);
    }
  };

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

  const totalMaterialCost = useMemo(() => {
    return materials.reduce((sum, m) => sum + (Number(m.totalPrice) || (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)), 0);
  }, [materials]);

  const handleSave = async (targetStatus?: string) => {
    if (!job) return;
    setSaving(true);
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

      setJob(updated);
      setStatus(updated.status);
      toast.success('Đã lưu', 'Cập nhật tiến độ và ghi nhận công việc thành công');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi lưu', err.message || 'Không thể lưu thông tin công việc');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FABRICATION': return 'Gia công cơ khí';
      case 'NEW_MAKING': return 'Chế tạo mới';
      case 'MODIFICATION': return 'Cải tiến kỹ thuật';
      case 'INSTALLATION': return 'Lắp đặt / Di dời';
      case 'INFRASTRUCTURE': return 'Cơ sở hạ tầng';
      default: return 'Khác';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ marginTop: '10px', fontSize: '13.5px' }}>Đang tải thông tin công việc...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h3>Không tìm thấy dữ liệu công việc</h3>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/fabrication')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="fabrication-detail-page" style={{ paddingBottom: '40px' }}>
      {/* Top Navigation & Actions Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/fabrication')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#64748b',
            padding: '6px 0',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={16} /> Quay lại danh sách gia công & chế tạo
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Printer size={15} /> In phiếu báo cáo
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSave()}
            disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu ghi nhận'}
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div
        className="card no-print"
        style={{
          padding: '20px 24px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb', letterSpacing: '0.02em' }}>
                {job.orderCode}
              </span>
              <StatusBadge status={job.status} />
              <StatusBadge status={job.priority} />
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {getCategoryLabel(job.category)}
              </span>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {job.title}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: '#64748b' }}>
              {job.targetDepartment && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={13} color="#2563eb" /> Đơn vị yêu cầu: <strong style={{ color: '#1e293b' }}>{job.targetDepartment}</strong>
                </span>
              )}
              {job.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#2563eb" /> Vị trí: <strong style={{ color: '#1e293b' }}>{job.location}</strong>
                </span>
              )}
              {job.equipment && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={13} color="#2563eb" /> Thiết bị: <strong style={{ color: '#1e293b' }}>[{job.equipment.code}] {job.equipment.name}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick status progression buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Chuyển nhanh trạng thái:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {status === 'ASSIGNED' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleSave('IN_PROGRESS')}
                  disabled={saving}
                  style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600 }}
                >
                  Bắt đầu làm việc
                </button>
              )}
              {status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleSave('COMPLETED')}
                  disabled={saving}
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 600 }}
                >
                  Báo cáo hoàn thành
                </button>
              )}
              {status === 'COMPLETED' && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleSave('CLOSED')}
                  disabled={saving}
                  style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontWeight: 600 }}
                >
                  Nghiệm thu bàn giao
                </button>
              )}
              {status === 'CLOSED' && (
                <span style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={16} /> Đã hoàn tất & nghiệm thu
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
          gap: '20px',
        }}
      >
        {/* LEFT COLUMN: GHI NHẬN CÔNG VIỆC, QUY CÁCH, VẬT TƯ & KẾT QUẢ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Yêu cầu & Quy cách kỹ thuật */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <FileText size={15} /> 1. Yêu cầu & Quy cách kỹ thuật
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Mô tả công việc:
                </span>
                <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {job.description || 'Chưa ghi nhận'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Quy cách / Kích thước / Vật liệu:
                </span>
                <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {job.specifications || 'Chưa có thông số chi tiết'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ghi nhận quá trình làm việc & Kết quả thực tế (Dành cho thợ ghi nhận) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <Wrench size={15} /> 2. Nhật ký thực hiện & Kết quả gia công
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ghi chú kết quả thực hiện / Báo cáo quá trình:
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Ghi nhận các bước đã thực hiện, phương án gia công, tình trạng sau khi lắp đặt, lưu ý vận hành..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '8px 12px', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Clock size={13} color="#2563eb" /> Giờ công thực tế đã làm (giờ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="form-input"
                    value={actualHours}
                    onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', fontSize: '13px', fontWeight: 600 }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    Ước tính ban đầu: {job.estimatedHours || 0} giờ
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Trạng thái công việc hiện tại
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
              </div>
            </div>
          </div>

          {/* 3. Vật tư phôi thô sử dụng thực tế */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e40af',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Package size={15} /> 3. Vật tư phôi thô sử dụng thực tế
              </div>

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
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: 600 }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tên vật tư / Phôi thô</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>SL</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Đơn giá (đ)</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '8px 6px', width: '36px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => {
                    const lineTotal = (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: idx < materials.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="VD: Inox 304 tấm 1.5mm"
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
                            placeholder="cái"
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
                            value={m.unitPrice}
                            onChange={(e) => handleMaterialChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '12.5px' }}>
                          {lineTotal > 0 ? `${lineTotal.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            title="Xóa dòng"
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
                        Chưa có vật tư nào được ghi nhận. Bấm "+ Thêm vật tư" để cập nhật.
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

          {/* 4. Nghiệm thu & Bàn giao sản phẩm */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <Award size={15} /> 4. Nghiệm thu & Đánh giá bàn giao
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Đánh giá chất lượng thành phẩm
                </label>
                <select
                  className="form-input"
                  value={acceptanceRating}
                  onChange={(e) => setAcceptanceRating(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                >
                  <option value="EXCELLENT">Xuất sắc</option>
                  <option value="GOOD">Tốt (Đạt yêu cầu kỹ thuật)</option>
                  <option value="ACCEPTABLE">Chấp nhận được</option>
                  <option value="POOR">Chưa đạt yêu cầu</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Người nhận bàn giao / Nghiệm thu
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Họ tên người nhận bàn giao sản phẩm"
                  value={acceptedByName}
                  onChange={(e) => setAcceptedByName(e.target.value)}
                  style={{ width: '100%', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUẢN LÝ TIẾN TRÌNH, NHÂN SỰ & THỜI HẠN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* A. Nhân sự cơ điện phụ trách (Cho phép chọn nhiều người) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '10px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <User size={15} /> Nhân sự cơ điện phụ trách
            </div>

            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Bấm để gán hoặc bỏ người tham gia ({selectedTechIds.length} người):
              </span>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {staffList.map((st) => {
                  const isSelected = selectedTechIds.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleTech(st.id)}
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
                        backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                        color: isSelected ? '#1d4ed8' : '#475569',
                      }}
                    >
                      {isSelected ? <Check size={12} color="#2563eb" /> : <Plus size={12} color="#94a3b8" />}
                      <span>{st.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {job.creator && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                Người giao việc: <strong style={{ color: '#1e293b' }}>{job.creator.name}</strong>
              </div>
            )}
          </div>

          {/* B. Tiến độ & Dòng thời gian */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <Calendar size={15} /> Kế hoạch & Tiến độ
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Ngày bắt đầu:</span>
                <strong>{job.plannedStartDate ? new Date(job.plannedStartDate).toLocaleDateString('vi-VN') : '---'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Hạn hoàn thành:</span>
                <strong style={{ color: '#0f172a' }}>
                  {job.plannedEndDate ? new Date(job.plannedEndDate).toLocaleDateString('vi-VN') : '---'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Giờ công dự kiến:</span>
                <strong>{job.estimatedHours || 0} giờ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px dashed #f1f5f9' }}>
                <span style={{ color: '#64748b' }}>Giờ công thực tế:</span>
                <strong style={{ color: '#2563eb' }}>{actualHours || 0} giờ</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Tổng chi phí vật tư:</span>
                <strong style={{ color: '#0f766e' }}>{totalMaterialCost.toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>

          {/* C. Trạng thái tiến trình */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <CheckCircle2 size={15} /> Các giai đoạn thực hiện
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'ASSIGNED', label: '1. Đã phân công' },
                { key: 'IN_PROGRESS', label: '2. Đang thực hiện' },
                { key: 'COMPLETED', label: '3. Hoàn thành chế tạo' },
                { key: 'CLOSED', label: '4. Đã nghiệm thu bàn giao' },
              ].map((step, idx) => {
                const isCurrent = status === step.key;
                const isDone = (
                  (step.key === 'ASSIGNED') ||
                  (step.key === 'IN_PROGRESS' && ['IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status)) ||
                  (step.key === 'COMPLETED' && ['COMPLETED', 'CLOSED'].includes(status)) ||
                  (step.key === 'CLOSED' && status === 'CLOSED')
                );

                return (
                  <div
                    key={step.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isCurrent ? '#eff6ff' : isDone ? '#f8fafc' : '#ffffff',
                      border: isCurrent ? '1px solid #3b82f6' : '1px solid #f1f5f9',
                      fontSize: '12.5px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#1d4ed8' : isDone ? '#1e293b' : '#94a3b8',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDone ? '#2563eb' : '#e2e8f0',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* D. PRINTABLE REPORT SHEET (Chỉ xuất hiện khi bấm In phiếu) */}
      <div
        className="print-only"
        style={{
          display: 'none',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#000000',
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>
            CÔNG TY CỔ PHẦN DƯỢC KHOA
          </h2>
          <p style={{ margin: '4px 0', fontSize: '13px' }}>PHÒNG KỸ THUẬT & CƠ ĐIỆN</p>
          <h1 style={{ margin: '14px 0 6px 0', fontSize: '20px', textTransform: 'uppercase', fontWeight: 800 }}>
            PHIẾU GIA CÔNG & CHẾ TẠO THIẾT BỊ
          </h1>
          <p style={{ margin: 0, fontSize: '12.5px' }}>Mã phiếu: <strong>{job.orderCode}</strong> | Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <table style={{ width: '100%', marginBottom: '16px', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', width: '20%' }}><strong>Tên công việc:</strong></td>
              <td style={{ padding: '4px 0', width: '80%' }}>{job.title}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Hình thức:</strong></td>
              <td>{getCategoryLabel(job.category)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Bộ phận yêu cầu:</strong></td>
              <td>{job.targetDepartment || 'Toàn xưởng'} (Vị trí: {job.location || '---'})</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Mô tả / Yêu cầu:</strong></td>
              <td>{job.description}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Quy cách kỹ thuật:</strong></td>
              <td>{job.specifications || '---'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Kết quả thực hiện:</strong></td>
              <td>{resultNotes || 'Đã hoàn thành'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Giờ công thực tế:</strong></td>
              <td>{actualHours} giờ</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
          Vật tư phôi thô sử dụng thực tế
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }} border={1}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '6px' }}>STT</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Tên vật tư / Phôi thô</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>Số lượng</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>ĐVT</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Đơn giá (đ)</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, idx) => (
              <tr key={idx}>
                <td style={{ padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '6px' }}>{m.materialName}</td>
                <td style={{ padding: '6px', textAlign: 'center' }}>{m.quantity}</td>
                <td style={{ padding: '6px', textAlign: 'center' }}>{m.unit}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{Number(m.unitPrice || 0).toLocaleString('vi-VN')}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>
                  {((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>Tổng cộng chi phí vật tư:</td>
              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{totalMaterialCost.toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>

        {/* Chữ ký xác nhận */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '40px', pageBreakInside: 'avoid' }}>
          <div>
            <strong>NGƯỜI GIAO VIỆC</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{job.creator?.name || ''}</p>
          </div>
          <div>
            <strong>NGƯỜI THỰC HIỆN</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{selectedTechIds.map(id => staffList.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</p>
          </div>
          <div>
            <strong>NGHIỆM THU BÀN GIAO</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{acceptedByName || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FabricationDetailPage;
