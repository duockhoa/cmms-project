import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/common/Toast';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-color)',
      padding: '40px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header Block */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/dkpharmalogo.png" alt="DKPharma Logo" style={{ height: '54px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>DK.QLTB</h1>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>Phiên bản 1.0</span>
          </div>
        </div>
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#475569',
          backgroundColor: '#f8fafc'
        }}>
          16+
        </div>
      </div>

      {/* Divider line */}
      <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%' }}></div>

      {/* Main Content Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
        <p style={{ margin: 0 }}>
          Ứng dụng được phát triển bởi <strong>Tổ Chuyển đổi số Công ty Cổ phần Dược Khoa</strong>. Hỗ trợ kỹ thuật: <strong>Lê Hoàng Cương - 0898729669</strong>.
        </p>
        <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
          Bản quyền ứng dụng thuộc <strong>Công ty Cổ phần Dược Khoa</strong>. Mọi hành vi sao chép, khai thác hoặc sử dụng lại khi chưa được cho phép đều được xem là vi phạm quyền sở hữu trí tuệ.
        </p>
      </div>

      {/* Action Buttons Block */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
        <button
          onClick={() => toast.success('Đóng góp ý kiến', 'Cảm ơn ý kiến đóng góp của bạn!')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: '1px solid #2563eb',
            backgroundColor: '#ffffff',
            color: '#2563eb',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '100px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
          }}
        >
          Góp ý
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 28px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '100px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1d4ed8';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2563eb';
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};
