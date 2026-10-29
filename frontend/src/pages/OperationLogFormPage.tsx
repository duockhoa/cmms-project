import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, RefreshCw, Gauge, Sliders } from 'lucide-react';
import { useOperationLogForm } from '../hooks/useOperationLogForm';
import { OperationLogQrScanner } from '../components/operation-logs/OperationLogQrScanner';
import { OperationLogInputForm } from '../components/operation-logs/OperationLogInputForm';
import { OeeShiftInputForm } from '../components/operation-logs/OeeShiftInputForm';

export function OperationLogFormPage() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get('mode');
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
    canReorder,
    isReorderMode,
    setIsReorderMode,
    savingOrder,
    moveParamUp,
    moveParamDown,
    saveParamOrder,
    cancelReorder,
  } = useOperationLogForm();

  const [activeFormTab, setActiveFormTab] = useState<'PARAMS' | 'OEE'>(
    modeParam === 'oee' ? 'OEE' : 'PARAMS',
  );

  useEffect(() => {
    if (modeParam === 'oee') {
      setActiveFormTab('OEE');
    } else if (equipment?.isCritical && parameters.length === 0) {
      setActiveFormTab('OEE');
    }
  }, [modeParam, equipment?.isCritical, parameters.length]);

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

      {!isVerified && modeParam !== 'oee' ? (
        <OperationLogQrScanner
          equipment={equipment}
          scanError={scanError}
        />
      ) : (
        <>
          {/* Thanh chuyển đổi giữa Ghi nhận OEE Ca sản xuất và Thông số Kỹ thuật */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              padding: '6px',
              backgroundColor: '#e2e8f0',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFormTab('OEE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeFormTab === 'OEE' ? '#2563eb' : 'transparent',
                color: activeFormTab === 'OEE' ? '#ffffff' : '#475569',
                boxShadow: activeFormTab === 'OEE' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Gauge size={16} />
              <span>Ghi nhận OEE theo ca</span>
              {equipment.isCritical && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: activeFormTab === 'OEE' ? '#fde047' : '#fef08a',
                    color: '#854d0e',
                    fontWeight: 800,
                  }}
                >
                  Trọng yếu
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveFormTab('PARAMS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeFormTab === 'PARAMS' ? '#ffffff' : 'transparent',
                color: activeFormTab === 'PARAMS' ? '#0f172a' : '#475569',
                boxShadow: activeFormTab === 'PARAMS' ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={16} />
              <span>Thông số Kỹ thuật ({parameters.length})</span>
            </button>
          </div>

          {activeFormTab === 'OEE' ? (
            <OeeShiftInputForm
              equipment={equipment}
              verifiedTime={verifiedTime}
              recordedVia={isVerified ? 'QR_APP' : 'WEB_APP'}
              onSuccess={() => navigate('/operation-logs?tab=oee')}
              onCancel={() => navigate('/operation-logs?tab=oee')}
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
              canReorder={canReorder}
              isReorderMode={isReorderMode}
              setIsReorderMode={setIsReorderMode}
              savingOrder={savingOrder}
              moveParamUp={moveParamUp}
              moveParamDown={moveParamDown}
              saveParamOrder={saveParamOrder}
              cancelReorder={cancelReorder}
            />
          )}
        </>
      )}
    </div>
  );
}
export default OperationLogFormPage;
