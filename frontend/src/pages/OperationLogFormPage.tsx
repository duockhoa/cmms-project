import React from 'react';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { useOperationLogForm } from '../hooks/useOperationLogForm';
import { OperationLogQrScanner } from '../components/operation-logs/OperationLogQrScanner';
import { OperationLogInputForm } from '../components/operation-logs/OperationLogInputForm';

export function OperationLogFormPage() {
  const {
    navigate,
    isVerified,
    verifiedTime,
    scanError,
    equipment,
    parameters,
    loading,
    submitting,
    formData,
    notes,
    setNotes,
    outlierCount,
    handleInputChange,
    onFinish,
  } = useOperationLogForm();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div style={{ fontSize: '14px' }}>Đang nạp thông số thiết bị từ hệ thống...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--danger, #dc2626)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Không tìm thấy thiết bị
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Mã QR hoặc đường dẫn thiết bị không tồn tại trong hệ thống.
          </p>
          <button className="btn btn-secondary" onClick={() => navigate('/operation-logs')}>
            <ArrowLeft size={15} /> Quay lại Sổ vận hành
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '30px auto', padding: '0 16px' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary, #64748b)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {!isVerified ? (
        <OperationLogQrScanner
          equipment={equipment}
          scanError={scanError}
        />
      ) : (
        <OperationLogInputForm
          equipment={equipment}
          parameters={parameters}
          verifiedTime={verifiedTime}
          formData={formData}
          notes={notes}
          setNotes={setNotes}
          outlierCount={outlierCount}
          submitting={submitting}
          handleInputChange={handleInputChange}
          onFinish={onFinish}
          onCancel={() => navigate('/operation-logs')}
        />
      )}
    </div>
  );
}
export default OperationLogFormPage;
