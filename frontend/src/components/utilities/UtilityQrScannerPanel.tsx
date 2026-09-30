import React from 'react';
import { Camera, ShieldCheck } from 'lucide-react';

export const UtilityQrScannerPanel: React.FC = () => (
  <div className="card scan-card">
    <div className="scan-icon-circle">
      <Camera size={30} />
    </div>
    <h2 className="scan-title">QUÉT MÃ QR TIỆN ÍCH / NĂNG LƯỢNG</h2>
    <p className="scan-subtitle">
      Hướng camera vào tem mã QR dán trên mặt đồng hồ điện, nước hoặc tủ máy.
    </p>

    <div className="scanner-viewport-wrapper">
      <div id="utility-qr-reader" />
    </div>

    <div className="scan-compliance-notice">
      <div className="scan-compliance-icon">
        <ShieldCheck size={22} />
      </div>
      <div className="scan-compliance-body">
        <div className="scan-compliance-title">
          Yêu cầu bắt buộc quét mã QR tại vị trí đồng hồ
        </div>
        <div className="scan-compliance-desc">
          Nhân viên vận hành bắt buộc phải <strong>có mặt trực tiếp tại vị trí đồng hồ đo hoặc tủ điện / máy</strong> và hướng camera vào tem mã QR để ghi số liệu. Hệ thống không cho phép chọn thủ công từ xa nhằm đảm bảo tính trung thực và trách nhiệm kiểm tra hiện trường.
        </div>
      </div>
    </div>
  </div>
);
