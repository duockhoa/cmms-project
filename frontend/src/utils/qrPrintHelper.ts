export interface QRPrintItem {
  name: string;
  code: string;
  location?: string;
  qrPayload?: string;
}

/**
 * In 1 tem QR duy nhất (khổ chuẩn dán decal / 1 trang)
 */
export function printSingleQRTag(item: QRPrintItem) {
  const printWindow = window.open('', '_blank', 'width=600,height=650');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ pop-up để in tem!');
    return;
  }

  const code = (item.code || '').trim();
  const payload = item.qrPayload || code;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;

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
    <img id="qr-img" class="qr" src="${qrUrl}" alt="QR" />
    <div class="code">[ ${code} ]</div>
    ${item.location ? `<div class="loc">📍 ${item.location}</div>` : ''}
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
}

/**
 * In hàng loạt tem QR trên các tờ A4 (Lưới 2 cột, có đường kẻ đứt phân tách dễ cắt dán)
 */
export function printBatchQRTags(options: {
  title: string;
  items: QRPrintItem[];
}) {
  const { title, items } = options;
  if (!items || items.length === 0) {
    alert('Không có mục nào để in tem!');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) {
    alert('Vui lòng cho phép trình duyệt mở cửa sổ pop-up để in tem hàng loạt!');
    return;
  }

  const tagsHtml = items.map((item) => {
    const code = (item.code || '').trim();
    const payload = item.qrPayload || code;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;

    return `
      <div class="qr-batch-card">
        <div class="brand">DK PHARMA CMMS</div>
        <div class="name">${item.name || ''}</div>
        <img class="qr-batch-img" src="${qrUrl}" alt="QR ${code}" />
        <div class="code">[ ${code} ]</div>
        ${item.location ? `<div class="loc">📍 ${item.location}</div>` : '<div class="loc">&nbsp;</div>'}
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
      margin: 8mm;
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
      color: #0f172a;
    }
    .sheet-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 5mm;
      width: 100%;
    }
    .qr-batch-card {
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
      min-height: 220px;
    }
    .brand {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #b91c1c;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 3px;
      margin-bottom: 5px;
      text-transform: uppercase;
      width: 100%;
    }
    .name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
      margin-bottom: 4px;
      word-break: break-word;
      max-height: 2.4em;
      overflow: hidden;
    }
    .qr-batch-img {
      width: 115px;
      height: 115px;
      display: block;
      margin: 0 auto 5px auto;
    }
    .code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      font-size: 12.5px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .loc {
      font-size: 10.5px;
      color: #475569;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
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
  <div class="sheet-container">
    ${tagsHtml}
  </div>
  <script>
    const images = Array.from(document.querySelectorAll('img.qr-batch-img'));
    let loaded = 0;
    const total = images.length;
    let finished = false;

    const doPrint = () => {
      if (finished) return;
      finished = true;
      window.focus();
      window.print();
      setTimeout(() => { window.close(); }, 500);
    };

    if (total === 0) {
      doPrint();
    } else {
      const onImgDone = () => {
        loaded++;
        if (loaded >= total) doPrint();
      };
      images.forEach(img => {
        if (img.complete && img.naturalWidth > 0) onImgDone();
        else {
          img.onload = onImgDone;
          img.onerror = onImgDone;
        }
      });
      // Dự phòng nếu mạng chậm sau 2.5s vẫn kích hoạt in
      setTimeout(doPrint, 2500);
    }
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
