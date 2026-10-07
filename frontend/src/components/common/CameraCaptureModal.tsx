import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void;
  title?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Chụp ảnh từ Camera',
}) => {
  const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
  const [capturedPreviews, setCapturedPreviews] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (mode: 'environment' | 'user') => {
    stopStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      console.error('Camera capture error:', err);
      let msg = 'Không thể truy cập camera. Vui lòng kiểm tra quyền thiết bị.';
      if (err.name === 'NotAllowedError') {
        msg = 'Bạn đã chặn quyền sử dụng camera trong trình duyệt.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Không tìm thấy thiết bị camera trên máy.';
      }
      setCameraError(msg);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedFiles([]);
      setCapturedPreviews([]);
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Flash animation
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}_${capturedFiles.length + 1}.jpg`, {
          type: 'image/jpeg',
        });
        const previewUrl = URL.createObjectURL(blob);

        setCapturedFiles((prev) => [...prev, file]);
        setCapturedPreviews((prev) => [...prev, previewUrl]);
      }
    }, 'image/jpeg', 0.88);
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedFiles((prev) => prev.filter((_, i) => i !== index));
    setCapturedPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDone = () => {
    stopStream();
    onCapture(capturedFiles);
    onClose();
  };

  const handleCancel = () => {
    stopStream();
    capturedPreviews.forEach((url) => URL.revokeObjectURL(url));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {cameraError ? (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#b91c1c' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{cameraError}</p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>
              Hãy kiểm tra cài đặt quyền truy cập Camera của trình duyệt.
            </p>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '320px',
              backgroundColor: '#000',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Flash Effect */}
            {flashEffect && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#ffffff',
                  opacity: 0.7,
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* Switch Camera Button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              title="Đổi camera"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={18} />
            </button>

            {/* Live Indicator */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '4px 10px',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }}></span>
              Live Camera
            </div>

            {/* Snap Button inside viewfinder bottom */}
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <button
                type="button"
                onClick={handleSnap}
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  border: '4px solid rgba(255,255,255,0.7)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  transition: 'transform 0.1s',
                }}
                title="Bấm chụp"
              >
                <Camera size={26} />
              </button>
            </div>
          </div>
        )}

        {/* Thumbnail Preview strip */}
        {capturedPreviews.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Ảnh đã chụp ({capturedPreviews.length}):
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto' }}>
              {capturedPreviews.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: '64px',
                    height: '64px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '2px solid #2563eb',
                  }}
                >
                  <img src={url} alt={`Snap ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ padding: 0, marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDone}
            disabled={capturedFiles.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} /> Sử dụng {capturedFiles.length > 0 ? `(${capturedFiles.length})` : ''} ảnh
          </button>
        </div>
      </div>
    </Modal>
  );
};
