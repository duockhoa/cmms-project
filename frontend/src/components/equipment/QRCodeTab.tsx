import React from 'react';

interface QRCodeTabProps {
  data: any;
}

export const QRCodeTab: React.FC<QRCodeTabProps> = ({ data }) => {
  return (
    <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ 
        width: '320px', 
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
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Mã QR nhận diện thiết bị</h3>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#ffffff', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.code || data.id)}`}
            alt={`QR Code ${data.code}`}
            style={{ width: '200px', height: '200px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.name}</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 700 }}>Mã: {data.code}</span>
          {data.location && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vị trí: {data.location}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
            onClick={() => {
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.code || data.id)}`;
              window.open(qrUrl, '_blank');
            }}
          >
            Tải ảnh QR
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            style={{ flex: 1, fontSize: '12px', padding: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>In nhãn QR - ${data.code}</title>
                      <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; margin: 0; background: #fff; }
                        .label-container { border: 2px solid #1e293b; padding: 24px; display: inline-block; border-radius: 10px; max-width: 320px; }
                        .header-tag { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #475569; text-transform: uppercase; margin-bottom: 8px; }
                        img { width: 180px; height: 180px; margin: 8px 0; }
                        h2 { margin: 8px 0 4px 0; font-size: 16px; color: #0f172a; word-break: break-word; }
                        .code { margin: 4px 0; font-family: monospace; font-size: 16px; font-weight: 900; color: #1e40af; }
                        .loc { font-size: 12px; color: #64748b; margin-top: 4px; }
                      </style>
                    </head>
                    <body onload="window.print(); window.close();">
                      <div class="label-container">
                        <div class="header-tag">CMMS - QUẢN LÝ BẢO TRÌ</div>
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.code || data.id)}" />
                        <h2>${data.name}</h2>
                        <div class="code">[ ${data.code} ]</div>
                        ${data.location ? `<div class="loc">📍 ${data.location}</div>` : ''}
                      </div>
                    </body>
                  </html>
                `);
              }
            }}
          >
            In nhãn QR
          </button>
        </div>
      </div>
    </div>
  );
};
