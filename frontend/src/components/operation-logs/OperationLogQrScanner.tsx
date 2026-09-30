import React from 'react';
import { Camera, AlertTriangle, ShieldCheck } from 'lucide-react';

interface OperationLogQrScannerProps {
  equipment: {
    code: string;
    name: string;
    location?: string;
  };
  scanError: string | null;
}

export const OperationLogQrScanner: React.FC<OperationLogQrScannerProps> = ({
  equipment,
  scanError,
}) => {
  return (
    <div
      className="card"
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          padding: '14px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          marginBottom: '14px',
        }}
      >
        <Camera size={32} />
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
        QUÉT MÃ QR XÁC THỰC HIỆN TRƯỜNG
      </h2>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
        Quy định vận hành yêu cầu kỹ thuật viên phải <strong>có mặt trực tiếp tại vị trí thiết bị</strong> để ghi nhận số liệu. Vui lòng hướng camera vào tem mã QR dán trên thân máy:
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          marginBottom: '18px',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '13px', color: '#2563eb' }}>{equipment.code}</span>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>{equipment.name}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>({equipment.location || 'Chưa định vị'})</span>
      </div>

      {/* Camera Scanner Viewport */}
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          margin: '0 auto',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '2px dashed #94a3b8',
          backgroundColor: '#f8fafc',
        }}
      >
        <div id="op-log-qr-reader" />
      </div>

      {scanError && (
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{scanError}</span>
        </div>
      )}

      <div
        style={{
          marginTop: '22px',
          padding: '14px 16px',
          borderRadius: '10px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          textAlign: 'left',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <ShieldCheck size={22} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
          <strong>Yêu cầu tuân thủ kiểm tra máy:</strong> Hệ thống không cho phép nhập số liệu ca từ xa. Mã QR xác thực việc kỹ thuật viên đã trực tiếp đến kiểm tra đồng hồ và các chỉ số trên máy.
        </div>
      </div>
    </div>
  );
};
