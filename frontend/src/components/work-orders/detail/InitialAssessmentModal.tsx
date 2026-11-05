import React, { useState } from 'react';
import { AlertTriangle, Clock, Wrench, CheckCircle2, X, Camera, Package } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../common/Toast';

interface InitialAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
  onSuccess: (updatedWo: any) => void;
}

const PRELIMINARY_CAUSES = [
  'Cơ khí (kẹt cơ, gãy chi tiết, mòn cơ cấu)',
  'Điện & Điều khiển (mất nguồn, lỗi biến tần, PLC)',
  'Cảm biến & Khí nén (hỏng sensor, rò rỉ khí nén)',
  'Kẹt phôi, bao bì, nguyên liệu',
  'Thao tác vận hành chưa đúng',
  'Nhiệt độ / Áp suất / Môi trường không đạt',
  'Khác',
];

export const InitialAssessmentModal: React.FC<InitialAssessmentModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [actualCondition, setActualCondition] = useState('');
  const [preliminaryCause, setPreliminaryCause] = useState(PRELIMINARY_CAUSES[0]);
  const [preliminaryCauseDetail, setPreliminaryCauseDetail] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [estimatedCompletionMinutes, setEstimatedCompletionMinutes] = useState(60);
  const [requireSpareParts, setRequireSpareParts] = useState(false);
  const [sparePartsNeeded, setSparePartsNeeded] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCondition.trim()) {
      showToast('error', 'Vui lòng mô tả hiện trạng thực tế của thiết bị');
      return;
    }
    if (!proposedSolution.trim()) {
      showToast('error', 'Vui lòng nhập phương án xử lý sơ bộ');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        expectedVersion: workOrder.version,
        actualCondition: actualCondition.trim(),
        preliminaryCause,
        preliminaryCauseDetail: preliminaryCauseDetail.trim() || undefined,
        proposedSolution: proposedSolution.trim(),
        estimatedCompletionMinutes: Number(estimatedCompletionMinutes) || 60,
        requireSpareParts,
        sparePartsNeeded: requireSpareParts ? sparePartsNeeded.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      const res = await api.startWorkOrderWithAssessment(workOrder.id, payload);
      showToast('success', 'Đã lưu đánh giá sơ bộ & chốt mốc thời gian phản hồi sự cố!');
      onSuccess(res);
      onClose();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu đánh giá sơ bộ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Wrench size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Khảo sát & Đánh giá sơ bộ sự cố
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                Xác nhận có mặt tại hiện trường để chốt SLA KPI phản hồi ≤ 4h
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Thông tin thiết bị & sự cố */}
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Mã Work Order:</span>
            <strong style={{ color: '#2563eb' }}>{workOrder.orderCode}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Thiết bị:</span>
            <strong style={{ color: '#0f172a' }}>{workOrder.equipment?.code} — {workOrder.equipment?.name}</strong>
          </div>
          {workOrder.request?.createdAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Thời điểm xưởng báo:</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>
                {new Date(workOrder.request.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. Hiện trạng thực tế */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              1. Hiện trạng thực tế tại máy *
            </label>
            <textarea
              className="form-input"
              rows={2}
              required
              placeholder="VD: Cụm dao cắt bị kẹt phôi, motor phát tiếng kêu rít..."
              value={actualCondition}
              onChange={(e) => setActualCondition(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* 2. Nguyên nhân sơ bộ */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              2. Nguyên nhân sơ bộ *
            </label>
            <select
              className="form-input"
              value={preliminaryCause}
              onChange={(e) => setPreliminaryCause(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            >
              {PRELIMINARY_CAUSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {preliminaryCause === 'Khác' && (
              <input
                type="text"
                className="form-input"
                placeholder="Ghi rõ nguyên nhân khác..."
                value={preliminaryCauseDetail}
                onChange={(e) => setPreliminaryCauseDetail(e.target.value)}
                style={{ width: '100%', marginTop: '6px', fontSize: '13px' }}
              />
            )}
          </div>

          {/* 3. Phương án xử lý */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              3. Phương án xử lý sơ bộ *
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Vệ sinh bôi trơn ray trượt, căn chỉnh lại khe hở dao..."
              value={proposedSolution}
              onChange={(e) => setProposedSolution(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* 4. Thời gian dự kiến & Phụ tùng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Dự kiến sửa xong (phút)
              </label>
              <select
                className="form-input"
                value={estimatedCompletionMinutes}
                onChange={(e) => setEstimatedCompletionMinutes(Number(e.target.value))}
                style={{ width: '100%', fontSize: '13px' }}
              >
                <option value={30}>30 phút (Nhanh)</option>
                <option value={60}>60 phút (1 giờ)</option>
                <option value={120}>120 phút (2 giờ)</option>
                <option value={240}>240 phút (4 giờ)</option>
                <option value={480}>480 phút (Cả ca)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                <Package size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Cần phụ tùng thay thế?
              </label>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', height: '38px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="requireSpareParts"
                    checked={!requireSpareParts}
                    onChange={() => setRequireSpareParts(false)}
                  />
                  Không cần
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="requireSpareParts"
                    checked={requireSpareParts}
                    onChange={() => setRequireSpareParts(true)}
                  />
                  Có cần
                </label>
              </div>
            </div>
          </div>

          {requireSpareParts && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#b45309', marginBottom: '4px' }}>
                Tên hoặc mã linh kiện cần lấy:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Vòng bi 6204, Cảm biến quang OMRON..."
                value={sparePartsNeeded}
                onChange={(e) => setSparePartsNeeded(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          )}

          {/* Ghi chú */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Ghi chú thêm (nếu có)
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Đã báo Tổ trưởng xưởng chờ kiểm tra..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', borderColor: '#059669', fontWeight: 700 }}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá & Bắt đầu sửa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
