import React from 'react';
import { Printer, Download } from 'lucide-react';

interface QRCodeTabProps {
  data: any;
}

export const QRCodeTab: React.FC<QRCodeTabProps> = ({ data }) => {
  const code = (data.code || data.id || '').trim();
  const nameFormatted = (data.name || '').trim().replace(/\s+/g, '_');
  const qrPayload = nameFormatted ? `${code}$${nameFormatted}` : code;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=650');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để in tem!');
      return;
    }
    const printQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>In tem QR - ${code}</title>
  <style>
    @page { size: auto; margin: 0mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      margin: 0 !important; padding: 0 !important;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden !important;
      display: flex; align-items: center; justify-content: center;
    }
    .print-box {
      border: 2px solid #000; border-radius: 8px;
      padding: 12px 16px; width: 250px; text-align: center;
      page-break-inside: avoid; break-inside: avoid;
    }
    .brand { font-size: 10px; font-weight: 800; letter-spacing: 1px; color: #b91c1c; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
    .name { font-size: 13px; font-weight: 800; color: #000; margin-bottom: 6px; word-break: break-word; }
    .qr { width: 140px; height: 140px; display: block; margin: 0 auto 6px auto; }
    .code { font-family: monospace; font-size: 14px; font-weight: 900; color: #000; margin-bottom: 2px; }
    .loc { font-size: 11px; color: #475569; font-weight: 600; }
    @media print { html, body { height: 100% !important; overflow: hidden !important; } }
  </style>
</head>
<body>
  <div class="print-box">
    <div class="brand">DK PHARMA CMMS</div>
    <div class="name">${data.name || ''}</div>
    <img id="qr-img" class="qr" src="${printQrUrl}" alt="QR" />
    <div class="code">[ ${code} ]</div>
    ${data.location ? `<div class="loc">📍 ${data.location}</div>` : ''}
  </div>
  <script>
    const img = document.getElementById('qr-img');
    const doPrint = () => { window.focus(); window.print(); setTimeout(() => { window.close(); }, 500); };
    if (img.complete && img.naturalWidth > 0) doPrint();
    else { img.onload = doPrint; img.onerror = doPrint; }
  </script>
</body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
          <img 
            src={qrUrl}
            alt={`QR ${code}`}
            style={{ width: '140px', height: '140px', margin: '0 auto 6px auto', display: 'block' }}
          />
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
            onClick={() => {
              const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrPayload)}`;
              window.open(downloadUrl, '_blank');
            }}
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
