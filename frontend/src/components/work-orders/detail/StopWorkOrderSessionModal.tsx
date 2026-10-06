import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, VideoOff } from 'lucide-react';
import { Modal } from '../../common/Modal';

interface StopWorkOrderSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    taskContent?: string;
    resultNotes?: string;
    photos?: string[];
    materialsUsed?: any[];
  }) => Promise<void>;
  activeSession: any;
  loading?: boolean;
}

export const StopWorkOrderSessionModal: React.FC<StopWorkOrderSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activeSession,
  loading = false,
}) => {
  const [taskContent, setTaskContent] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [elapsedText, setElapsedText] = useState('');

  // Web Camera Live Stream States
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks helper
  const stopWebcamTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    if (isOpen && activeSession?.startedAt) {
      setTaskContent(activeSession.taskContent || '');
      setResultNotes('');
      setPhotos([]);
      setIsWebcamActive(false);
      setCameraError(null);

      const start = new Date(activeSession.startedAt).getTime();
      const now = Date.now();
      const diffMinutes = Math.max(1, Math.round((now - start) / (1000 * 60)));
      const diffHours = (diffMinutes / 60).toFixed(2);
      setElapsedText(`${diffMinutes} phút (~${diffHours} giờ)`);
    } else {
      stopWebcamTracks();
    }

    return () => {
      stopWebcamTracks();
    };
  }, [isOpen, activeSession]);

  // Khởi động Camera trực tiếp (Webcam)
  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsWebcamActive(true);

      // Timeout nhẹ để đảm bảo thẻ video đã được mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errMsg = 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập.';
      if (err.name === 'NotAllowedError') {
        errMsg = 'Bạn đã từ chối cấp quyền camera trên trình duyệt.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'Không tìm thấy thiết bị camera trên máy.';
      }
      setCameraError(errMsg);
      setIsWebcamActive(false);
    }
  };

  // Chụp khung hình từ webcam stream
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotos((prev) => [...prev, dataUrl]);
  };

  // Tải file từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModalClose = () => {
    stopWebcamTracks();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    stopWebcamTracks();
    await onSubmit({
      taskContent: taskContent.trim(),
      resultNotes: resultNotes.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Kết thúc phiên #${activeSession?.sessionIndex || 1} • Thời lượng: ${elapsedText}`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Nội dung công việc đã làm *</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Mô tả công việc đã thực hiện..."
            value={taskContent}
            onChange={(e) => setTaskContent(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Kết quả / Tình trạng máy</label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Kết quả sau xử lý (tùy chọn)..."
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
          />
        </div>

        {/* Chụp ảnh / Tải ảnh */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Ảnh hiện trường (Tùy chọn)</label>

          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          {/* Thanh công cụ mở camera / chọn file */}
          {!isWebcamActive && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
                onClick={handleStartCamera}
              >
                <Camera size={15} /> Chụp ảnh trực tiếp
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} /> Chọn tệp
              </button>
            </div>
          )}

          {cameraError && (
            <div style={{ fontSize: '12px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
              {cameraError}
            </div>
          )}

          {/* Khung ngắm Camera trực tiếp (Live Viewfinder) */}
          {isWebcamActive && (
            <div style={{ border: '2px solid #2563eb', borderRadius: '8px', padding: '10px', backgroundColor: '#0f172a', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: '#fff', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite' }}></span>
                  Camera trực tiếp
                </span>
                <button
                  type="button"
                  onClick={stopWebcamTracks}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <VideoOff size={14} /> Tắt camera
                </button>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '7px 18px', fontSize: '13px' }}
                  onClick={handleCaptureFrame}
                >
                  <Camera size={16} /> Bấm chụp ảnh ({photos.length} đã chụp)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={stopWebcamTracks}
                >
                  Xong
                </button>
              </div>
            </div>
          )}

          {/* Danh sách ảnh đã chụp/chọn */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {photos.map((p, idx) => (
                <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={p} alt={`Photo ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleModalClose} disabled={loading}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !taskContent.trim()}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 className="animate-spin" size={15} /> Đang lưu...
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} /> Xác nhận chốt phiên
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
