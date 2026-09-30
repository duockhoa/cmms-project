import React, { useCallback, useState } from 'react';
import { useUtilityPointScanner } from '../hooks/useUtilityPointScanner';
import { useUtilityScanForm } from '../hooks/useUtilityScanForm';
import { UtilityScanHeader } from '../components/utilities/UtilityScanHeader';
import { UtilityQrScannerPanel } from '../components/utilities/UtilityQrScannerPanel';
import { UtilityScanFormPanel } from '../components/utilities/UtilityScanFormPanel';
import './UtilityScanPage.css';

export const UtilityScanPage: React.FC = () => {
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const handleSelectPoint = useCallback((point: any) => {
    setSelectedPoint(point);
  }, []);

  const { scanning, setScanning } = useUtilityPointScanner({
    selectedPoint,
    onSelectPoint: handleSelectPoint,
  });

  const scanForm = useUtilityScanForm({
    selectedPoint,
    setSelectedPoint,
    resumeScanning: () => setScanning(true),
  });

  return (
    <div className="utility-scan-container">
      <UtilityScanHeader
        hasSelectedPoint={Boolean(selectedPoint)}
        onScanOther={() => {
          setSelectedPoint(null);
          setScanning(true);
        }}
      />

      {scanning && !selectedPoint && <UtilityQrScannerPanel />}

      <UtilityScanFormPanel selectedPoint={selectedPoint} form={scanForm} />
    </div>
  );
};
