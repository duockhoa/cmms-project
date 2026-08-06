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
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}`}
            alt={`QR Code ${data.code}`}
            style={{ width: '200px', height: '200px' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.name}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>{data.code}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ flex: 1, fontSize: '12px', padding: '8px' }}
            onClick={() => {
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}`;
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
                        body { font-family: sans-serif; text-align: center; padding: 40px; }
                        .label-container { border: 2px dashed #000; padding: 20px; display: inline-block; border-radius: 8px; }
                        img { width: 200px; height: 200px; }
                        <h2> { margin: 10px 0 5px 0; }
                        p { margin: 0; font-family: monospace; font-size: 14px; font-weight: bold; }
                      </style>
                    </head>
                    <body onload="window.print(); window.close();">
                      <div class="label-container">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}" />
                        <h2>${data.name}</h2>
                        <p>${data.code}</p>
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
