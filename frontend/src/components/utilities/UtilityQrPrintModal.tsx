import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Ban, Edit2, Printer, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { printSingleQRTag } from '../../utils/qrPrintHelper';

interface UtilityModalProps {
  model: UtilitiesPageViewModel;
}

export const UtilityQrPrintModal: React.FC<UtilityModalProps> = ({ model }) => {
  const { printPoint, setPrintPoint } = model;

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

              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(printPoint.code)}`}
                alt={`QR ${printPoint.code}`}
                className="qr-tag-img"
              />

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
