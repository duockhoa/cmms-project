import React from 'react';
import { Modal } from '../common/Modal';
import { QRScanner } from '../common/QRScanner';

interface DeviceScannerModalProps {
  isOpen: boolean;
  manualCode: string;
  onManualCodeChange: (code: string) => void;
  onClose: () => void;
  onIdentify: (code: string, method: 'QR_SCAN' | 'MANUAL_ENTRY') => void;
  onInvalidManualCode: () => void;
}

export const DeviceScannerModal: React.FC<DeviceScannerModalProps> = ({
  isOpen,
  manualCode,
  onManualCodeChange,
  onClose,
  onIdentify,
  onInvalidManualCode,
}) => {
  const identify = (code: string, method: 'QR_SCAN' | 'MANUAL_ENTRY') => {
    onClose();
    onIdentify(code, method);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quét mã thiết bị">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <QRScanner onScanSuccess={(code) => identify(code, 'QR_SCAN')} onClose={onClose} />
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <label className="form-label" style={{ fontWeight: 700 }}>Nhập mã thiết bị thủ công</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" className="form-input" placeholder="Ví dụ: EQ-001..." value={manualCode} onChange={(event) => onManualCodeChange(event.target.value)} />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => manualCode.trim() ? identify(manualCode.trim(), 'MANUAL_ENTRY') : onInvalidManualCode()}
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
