import React, { useState, useEffect } from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { printSingleQRTag } from '../../utils/qrPrintHelper';

interface UtilityModalProps {
  model: UtilitiesPageViewModel;
}

export const UtilityQrPrintModal: React.FC<UtilityModalProps> = ({ model }) => {
  const { printPoint, setPrintPoint } = model;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (printPoint?.code) {
      QRCode.toDataURL(printPoint.code, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M',
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [printPoint?.code]);

  return (
        <div className="util-modal-overlay">
          <div className="card util-modal-card print-preview-card">
            <h3 className="modal-title">
              IN TEM MÃ QR DÁN ĐỒNG HỒ / TỦ ĐIỆN
            </h3>

            {/* Khung Tem QR chuẩn in */}
            <div id="printable-utility-qr-tag" className="qr-printable-tag">
              <div className="qr-tag-brand">DK PHARMA CMMS</div>
              <div className="qr-tag-name">{printPoint.name}</div>

              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${printPoint.code}`}
                  className="qr-tag-img"
                />
              ) : (
                <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tạo QR...</div>
              )}

              <div className="qr-tag-code">{printPoint.code}</div>
              <div className="qr-tag-loc">{printPoint.location}</div>
            </div>

            <div className="modal-actions-row" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => setPrintPoint(null)}
                className="btn-modal-cancel"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  if (!printPoint) return;
                  printSingleQRTag({
                    name: printPoint.name,
                    code: printPoint.code,
                    location: printPoint.location,
                    qrPayload: printPoint.code,
                  });
                }}
                className="btn-modal-submit print-btn"
              >
                <Printer size={16} />
                <span>In Tem Ngay</span>
              </button>
            </div>
          </div>
        </div>
  );
};
