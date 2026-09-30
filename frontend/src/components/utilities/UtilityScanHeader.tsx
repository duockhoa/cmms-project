import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';

interface UtilityScanHeaderProps {
  hasSelectedPoint: boolean;
  onScanOther: () => void;
}

export const UtilityScanHeader: React.FC<UtilityScanHeaderProps> = ({
  hasSelectedPoint,
  onScanOther,
}) => {
  const navigate = useNavigate();

  return (
    <div className="utility-scan-header">
      <button onClick={() => navigate('/utilities')} className="scan-back-btn">
        <ArrowLeft size={18} />
        <span>Bảng Quản Lý Tiện Ích</span>
      </button>

      {hasSelectedPoint && (
        <button onClick={onScanOther} className="scan-other-btn">
          <Camera size={16} />
          <span>Quét Mã Khác</span>
        </button>
      )}
    </div>
  );
};
