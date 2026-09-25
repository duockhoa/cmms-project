import React, { useState } from 'react';
import { Printer, Download, Copy, Check, Grid, Tag, Info } from 'lucide-react';

interface QRCodeTabProps {
  data: any;
}

export const QRCodeTab: React.FC<QRCodeTabProps> = ({ data }) => {
  const code = (data.code || data.id || '').trim();
  const nameFormatted = (data.name || '').trim().replace(/\s+/g, '_');
  const qrPayload = nameFormatted ? `${code}$${nameFormatted}` : code;
  const [copied, setCopied] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`;
    window.open(qrUrl, '_blank');
  };

  // 1. IN 1 NHÃN ĐƠN (Được tối ưu để CHẮC CHẮN chỉ in ra đúng 1 trang duy nhất)
  const handlePrintSingle = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=700');
    if (!printWindow) {
      alert('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cấp quyền cho phép mở pop-up để in nhãn!');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>In nhãn QR - ${data.code}</title>
  <style>
    /* Xóa sạch margins và header/footer mặc định của trình duyệt */
    @page {
      size: auto;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden !important; /* Tuyệt đối ngăn chặn sinh trang thứ 2 */
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .print-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .label-card {
      border: 2px solid #000000;
      border-radius: 8px;
      padding: 12px 16px;
      width: 250px;
      max-width: 90vw;
      text-align: center;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .brand-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .qr-img {
      width: 135px;
      height: 135px;
      display: block;
      margin: 0 auto 8px auto;
    }
    .equip-name {
      font-size: 13px;
      font-weight: 800;
      color: #000000;
      line-height: 1.25;
      margin-bottom: 4px;
      word-break: break-word;
    }
    .equip-code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 14px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .equip-loc {
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    @media print {
      html, body {
        height: 100% !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-wrapper {
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    <div class="label-card">
      <div class="brand-title">DK PHARMA • CMMS</div>
      <img id="qr-img" class="qr-img" src="${qrImageUrl}" alt="QR" />
      <div class="equip-name">${data.name || ''}</div>
      <div class="equip-code">[ ${data.code || ''} ]</div>
      ${data.location ? `<div class="equip-loc">📍 ${data.location}</div>` : ''}
    </div>
  </div>
  <script>
    const img = document.getElementById('qr-img');
    const startPrint = () => {
      window.focus();
      window.print();
      setTimeout(() => { window.close(); }, 500);
    };
    if (img.complete && img.naturalWidth > 0) {
      startPrint();
    } else {
      img.onload = startPrint;
      img.onerror = startPrint;
    }
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // 2. IN LƯỚI A4 (6 TEM) ĐỂ TIẾT KIỆM GIẤY & CẮT DÁN HÀNG LOẠT
  const handlePrintSheet = (count = 6) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cấp quyền cho phép mở pop-up để in nhãn!');
      return;
    }

    const itemsHtml = Array(count).fill(0).map(() => `
      <div class="grid-label-card">
        <div class="brand-title">DK PHARMA • CMMS</div>
        <img class="qr-img" src="${qrImageUrl}" alt="QR" />
        <div class="equip-name">${data.name || ''}</div>
        <div class="equip-code">[ ${data.code || ''} ]</div>
        ${data.location ? `<div class="equip-loc">📍 ${data.location}</div>` : ''}
      </div>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>In ${count} tem QR A4 - ${data.code}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sheet-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 8mm;
      width: 100%;
      height: 100%;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .grid-label-card {
      border: 1.5px dashed #64748b;
      border-radius: 6px;
      padding: 10px 12px;
      text-align: center;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .brand-title {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      margin-bottom: 6px;
      width: 100%;
    }
    .qr-img {
      width: 110px;
      height: 110px;
      display: block;
      margin: 0 auto 6px auto;
    }
    .equip-name {
      font-size: 11.5px;
      font-weight: 800;
      color: #000000;
      line-height: 1.2;
      margin-bottom: 3px;
      word-break: break-word;
    }
    .equip-code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 12px;
      font-weight: 900;
      color: #1e3a8a;
      margin-bottom: 2px;
    }
    .equip-loc {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }
    @media print {
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-grid">
    ${itemsHtml}
  </div>
  <script>
    window.onload = () => {
      setTimeout(() => {
        window.focus();
        window.print();
        setTimeout(() => { window.close(); }, 500);
      }, 400);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div className="card" style={{ 
        width: '380px', 
        maxWidth: '100%',
        padding: '24px', 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Mã QR nhận diện thiết bị
          </h3>
        </div>

        {/* Khung xem trước nhãn in */}
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          border: '2px solid #0f172a',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
          width: '240px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ 
            fontSize: '9.5px', 
            fontWeight: 800, 
            letterSpacing: '0.8px', 
            color: '#0f172a', 
            borderBottom: '1px solid #0f172a', 
            paddingBottom: '3px', 
            marginBottom: '6px', 
            width: '100%' 
          }}>
            DK PHARMA • CMMS
          </div>
          <img 
            src={qrImageUrl}
            alt={`QR Code ${qrPayload}`}
            style={{ width: '150px', height: '150px', margin: '4px 0' }}
          />
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '4px', lineHeight: 1.25 }}>
            {data.name}
          </div>
          <div style={{ fontSize: '13px', color: '#1e3a8a', fontFamily: 'monospace', fontWeight: 800, marginTop: '2px' }}>
            [ {data.code} ]
          </div>
          {data.location && (
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
              📍 {data.location}
            </div>
          )}
        </div>

        {/* Chuỗi mã quét payload */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          backgroundColor: 'var(--bg-primary)', 
          padding: '8px 12px', 
          borderRadius: '6px', 
          width: '100%',
          border: '1px solid var(--border-color)',
          fontSize: '11.5px',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ flex: 1, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'left' }}>
            {qrPayload}
          </span>
          <button 
            type="button" 
            onClick={handleCopy}
            className="btn btn-secondary btn-xs"
            title="Sao chép nội dung mã QR"
            style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
            <span>{copied ? 'Đã chép' : 'Chép'}</span>
          </button>
        </div>

        {/* Các nút hành động in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
          <button 
            type="button"
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '13px'
            }}
            onClick={handlePrintSingle}
          >
            <Printer size={16} />
            <span>In 1 nhãn đơn (Chuẩn dán - 1 trang duy nhất)</span>
          </button>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                fontSize: '12px', 
                padding: '8px' 
              }}
              onClick={() => handlePrintSheet(6)}
              title="In 6 tem trên 1 tờ giấy A4 có vạch kẻ để cắt dán hàng loạt"
            >
              <Grid size={15} />
              <span>In trang A4 (6 tem)</span>
            </button>

            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                fontSize: '12px', 
                padding: '8px' 
              }}
              onClick={handleDownload}
              title="Tải ảnh QR dạng PNG về máy"
            >
              <Download size={15} />
              <span>Tải ảnh QR</span>
            </button>
          </div>
        </div>

        {/* Hướng dẫn khi in */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '8px', 
          textAlign: 'left', 
          fontSize: '11px', 
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-primary)',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px dashed var(--border-color)',
          marginTop: '4px',
          lineHeight: 1.4
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#3b82f6' }} />
          <div>
            <strong>Mẹo in tem dán đẹp:</strong> Ở hộp thoại in của trình duyệt (Ctrl+P), hãy chọn mục <em>Lề (Margins): Không có (None)</em> hoặc <em>Tối thiểu (Minimum)</em> để nhãn in nằm gọn gàng, sắc nét và không bao giờ bị nhảy trang.
          </div>
        </div>
      </div>
    </div>
  );
};
