import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useExportExcel, ExportCsvOptions } from '../../hooks/useExportExcel';

export interface ExportButtonProps {
  onExport: () => Promise<ExportCsvOptions | Blob | string | void> | ExportCsvOptions | Blob | string | void;
  label?: string;
  filename?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  label = 'Xuất CSV / Excel',
  filename,
  variant = 'secondary',
  disabled = false,
  className = '',
  icon,
  style,
}) => {
  const { isExporting, exportData } = useExportExcel();

  const handleClick = () => {
    exportData(onExport, filename);
  };

  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`.trim()}
      onClick={handleClick}
      disabled={disabled || isExporting}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
      title={label}
    >
      {isExporting ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        icon || <Download size={14} />
      )}
      <span>{isExporting ? 'Đang xuất...' : label}</span>
    </button>
  );
};
