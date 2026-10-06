import React, { useState, useEffect } from 'react';
import { Printer, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { printSingleQRTag } from '../../utils/qrPrintHelper';

interface QRCodeTabProps {
  data: any;
}

export const QRCodeTab: React.FC<QRCodeTabProps> = ({ data }) => {
  const code = (data.code || data.id || '').trim();
  const nameFormatted = (data.name || '').trim().replace(/\s+/g, '_');
  const qrPayload = nameFormatted ? `${code}$${nameFormatted}` : code;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (isMounted) setQrDataUrl(url);
    }).catch((err) => {
      console.error('Lỗi tạo mã QR offline:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  const handlePrint = () => {
    printSingleQRTag({
      name: data.name,
      code,
      oldCode: data.oldCode,
      location: data.location,
      qrPayload,
    });
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR_${code}_${(data.name || 'device').trim().replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ 
        width: '320px', 
        padding: '20px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--text-primary)' }}>
          Mã QR nhận diện thiết bị
        </h3>

        {/* Khung Tem QR chuẩn in tinh gọn giống bên tiện ích */}
        <div style={{ 
          border: '2px solid #0f172a',
          borderRadius: '8px',
          padding: '14px',
          backgroundColor: '#ffffff',
          width: '240px',
          boxSizing: 'border-box',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', letterSpacing: '1px', marginBottom: '4px' }}>
            DK PHARMA CMMS
          </div>
          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
            {data.name}
          </div>
          {qrDataUrl ? (
            <img 
              src={qrDataUrl}
              alt={`QR ${code}`}
              style={{ width: '140px', height: '140px', margin: '0 auto 6px auto', display: 'block' }}
            />
          ) : (
            <div style={{ width: '140px', height: '140px', margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>
              Đang tạo QR...
            </div>
          )}
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
            [ {code} ]
          </div>
          {data.location && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              📍 {data.location}
            </div>
          )}
        </div>

        {/* Nút hành động tinh gọn: Tải ảnh & In Tem Ngay */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm" 
            style={{ flex: 1, fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            <Download size={14} />
            <span>Tải ảnh</span>
          </button>
          <button 
            type="button"
            className="btn btn-primary btn-sm" 
            style={{ flex: 1, fontSize: '12px', padding: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span>In Tem Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
