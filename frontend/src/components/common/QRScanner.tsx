import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  useEffect(() => {
    // Initialize html5-qrcode
    const html5QrCode = new Html5Qrcode(scannerId);
    qrCodeInstanceRef.current = html5QrCode;

    // Start scanner
    html5QrCode.start(
      { facingMode: "environment" }, // Prioritize back camera
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        // Success
        onScanSuccess(decodedText);
        stopScanner();
      },
      () => {
        // Quietly fail or log verbose scanning
      }
    )
    .then(() => {
      setCameraPermission(true);
      setError(null);
    })
    .catch((err) => {
      console.error("Lỗi khởi tạo camera:", err);
      setCameraPermission(false);
      setError("Không thể truy cập camera. Vui lòng cấp quyền camera cho trang web này.");
    });

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.error("Lỗi khi tắt camera:", err);
      }
    }
  };

  return (
    <div style={{
      position: 'relative',
      backgroundColor: '#111827',
      borderRadius: '12px',
      overflow: 'hidden',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      color: '#ffffff',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="#3b82f6" />
          <span style={{ fontWeight: 600, fontSize: '15px' }}>Quét mã QR thiết bị</span>
        </div>
        <button 
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Camera Video Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '300px',
        aspectRatio: '1',
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div id={scannerId} style={{ width: '100%', height: '100%' }}></div>

        {/* Custom HUD overlay if running */}
        {cameraPermission && !error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            border: '4px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Green corners */}
            <div style={{
              position: 'absolute',
              width: '70%',
              height: '70%',
              border: '2px dashed #10b981',
              borderRadius: '8px',
              animation: 'pulse 2s infinite'
            }}></div>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            gap: '8px'
          }}>
            <AlertCircle size={32} color="#ef4444" />
            <span style={{ fontSize: '13px', color: '#fca5a5' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Guide text */}
      <div style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
        Đặt mã QR của thiết bị vào khung ngắm để tự động nhận diện.
      </div>
    </div>
  );
};
