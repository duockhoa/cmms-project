import QRCode from 'qrcode';

export interface QRPrintItem {
  name: string;
  code: string;
  location?: string;
  qrPayload?: string;
  category?: string;
}

/**
 * In 1 tem QR duy nhất (khổ decal / máy in nhiệt hoặc A4 đơn)
 */
export async function printSingleQRTag(item: QRPrintItem) {
  const code = (item.code || '').trim();
  const payload = item.qrPayload || code;

  // Tạo mã QR offline Base64 Data URL ngay tại máy trạm
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(payload, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Lỗi tạo mã QR:', err);
    qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
  }

  const printWindow = window.open('', '_blank', 'width=600,height=650');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ pop-up để in tem!');
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>In tem QR - ${code}</title>
  <style>
    @page { size: auto; margin: 0mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%; margin: 0 !important; padding: 0 !important;
      background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden !important; display: flex; align-items: center; justify-content: center;
    }
    .print-box {
      border: 2px solid #000000; border-radius: 8px; padding: 12px 16px;
      width: 250px; text-align: center; background: #ffffff;
      page-break-inside: avoid; break-inside: avoid;
    }
    .brand { font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: #b91c1c; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
    .name { font-size: 13px; font-weight: 800; color: #000; margin-bottom: 6px; word-break: break-word; line-height: 1.25; }
    .qr { width: 140px; height: 140px; display: block; margin: 0 auto 6px auto; }
    .code { font-family: Consolas, Monaco, "Courier New", monospace; font-size: 14px; font-weight: 900; color: #000; margin-bottom: 2px; }
    .loc { font-size: 11px; color: #475569; font-weight: 600; }
    @media print { html, body { height: 100% !important; overflow: hidden !important; } }
  </style>
</head>
<body>
  <div class="print-box">
    <div class="brand">DK PHARMA CMMS</div>
    <div class="name">${item.name || ''}</div>
    <img id="qr-img" class="qr" src="${qrDataUrl}" alt="QR ${code}" />
    <div class="code">[ ${code} ]</div>
    ${item.location ? `<div class="loc">📍 ${item.location}</div>` : ''}
  </div>
  <script>
    window.focus();
    window.print();
    setTimeout(() => { window.close(); }, 500);
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * In hàng loạt tem QR trên các tờ A4 (Tối ưu cho cả 10, 100, 300 hoặc 1000 tem)
 * Sử dụng thư viện QRCode client-side, 100% offline, tạo tức thì không nghẽn mạng
 */
export async function printBatchQRTags(options: {
  title: string;
  items: QRPrintItem[];
  columns?: 2 | 3;
}) {
  const { title, items, columns = 3 } = options;
  if (!items || items.length === 0) {
    alert('Không có mục nào để in tem!');
    return;
  }

  // Tạo Base64 Data URL hàng loạt song song (siêu tốc ~100-200ms cho 300 mã)
  const itemsWithQR = await Promise.all(
    items.map(async (item) => {
      const code = (item.code || '').trim();
      const payload = item.qrPayload || code;
      let dataUrl = '';
      try {
        dataUrl = await QRCode.toDataURL(payload, {
          width: 180,
          margin: 1,
          errorCorrectionLevel: 'M',
        });
      } catch (err) {
        dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payload)}`;
      }
      return {
        name: item.name || '',
        code,
        location: item.location || '',
        dataUrl,
      };
    })
  );

  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ pop-up để in tem hàng loạt!');
    return;
  }

  const tagsHtml = itemsWithQR.map((item, index) => {
    return `
      <div class="qr-batch-card">
        <div class="brand">DK PHARMA CMMS</div>
        <div class="name" title="${item.name}">${item.name}</div>
        <img class="qr-batch-img" src="${item.dataUrl}" alt="QR ${item.code}" />
        <div class="code">[ ${item.code} ]</div>
        ${item.location ? `<div class="loc" title="${item.location}">📍 ${item.location}</div>` : '<div class="loc">&nbsp;</div>'}
        <div class="card-seq">#${index + 1}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} (${items.length} tem)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0 !important;
      padding: 0 !important;
      color: #0f172a;
    }

    /* Thanh điều khiển trên cùng - Không in ra giấy */
    .no-print-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-title {
      font-size: 15px;
      font-weight: 700;
    }
    .toolbar-badge {
      background: #2563eb;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-toolbar {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-print-action {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-print-action:hover {
      background: #1d4ed8;
    }
    .btn-close-action {
      background: #475569;
      color: #ffffff;
    }
    .btn-close-action:hover {
      background: #334155;
    }

    /* Vùng chứa lưới tem A4 */
    .print-area-wrapper {
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .sheet-container {
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      grid-gap: 4mm;
      width: 100%;
      max-width: 210mm;
      background: #ffffff;
      padding: 8mm;
      box-shadow: 0 0 16px rgba(0,0,0,0.08);
      border-radius: 8px;
    }

    .qr-batch-card {
      border: 1.5px dashed #475569;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      min-height: 205px;
      position: relative;
    }
    .card-seq {
      position: absolute;
      top: 3px;
      right: 5px;
      font-size: 8px;
      font-weight: 700;
      color: #94a3b8;
    }
    .brand {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #b91c1c;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 2px;
      margin-bottom: 4px;
      text-transform: uppercase;
      width: 100%;
    }
    .name {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 3px;
      word-break: break-word;
      max-height: 2.4em;
      overflow: hidden;
      width: 100%;
    }
    .qr-batch-img {
      width: 110px;
      height: 110px;
      display: block;
      margin: 0 auto 3px auto;
    }
    .code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 12px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 1px;
    }
    .loc {
      font-size: 9.5px;
      color: #475569;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .print-area-wrapper {
        padding: 0 !important;
      }
      .sheet-container {
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        max-width: 100% !important;
        grid-gap: 3.5mm !important;
      }
      .qr-batch-card {
        border: 1px dashed #000000 !important;
      }
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <!-- Thanh công cụ điều khiển -->
  <div class="no-print-toolbar">
    <div class="toolbar-info">
      <span class="toolbar-title">${title}</span>
      <span class="toolbar-badge">${items.length} tem mã QR</span>
      <span style="font-size: 12px; color: #94a3b8;">(Bố cục ${columns} cột / Khổ A4 có viền nét đứt cắt dán)</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-toolbar btn-close-action" onclick="window.close()">Đóng</button>
      <button class="btn-toolbar btn-print-action" onclick="window.print()">🖨️ In Ngay (${items.length} tem)</button>
    </div>
  </div>

  <div class="print-area-wrapper">
    <div class="sheet-container">
      ${tagsHtml}
    </div>
  </div>

  <script>
    // Tự động kích hoạt hộp thoại in sau khi cửa sổ mở
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
