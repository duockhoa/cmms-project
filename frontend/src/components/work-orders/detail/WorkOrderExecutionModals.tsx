import React, { useState, useRef, useMemo } from 'react';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { CameraCaptureModal } from '../../common/CameraCaptureModal';

export const WorkOrderExecutionModals: React.FC<any> = ({
  actionLoading, completeConclusion, completeEquipmentStatus, completePhotos,
  completeRecommendation, completeTestResult, completeWorkDone, customPauseReason,
  handleCompleteSubmit, handleLogSubmit, handlePauseSubmit, isCompleteFormOpen,
  isLogFormOpen, isPauseFormOpen, logAdjustReason, logAdjustTargetId, logContent,
  logNotes, logPhotoCategory, logPhotos, logResult, pauseReason,
  setCompleteConclusion, setCompleteEquipmentStatus, setCompletePhotos,
  setCompleteRecommendation, setCompleteTestResult, setCompleteWorkDone,
  setCustomPauseReason, setIsCompleteFormOpen, setIsLogFormOpen, setIsPauseFormOpen,
  setLogAdjustReason, setLogContent, setLogNotes, setLogPhotoCategory, setLogPhotos,
  setLogResult, setPauseReason, wo,
}) => {
  const [isLogCameraOpen, setIsLogCameraOpen] = useState(false);
  const [isCompleteCameraOpen, setIsCompleteCameraOpen] = useState(false);
  const logFileInputRef = useRef<HTMLInputElement>(null);
  const completeFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert logPhotos to array
  const currentLogPhotosArray: File[] = useMemo(() => {
    if (!logPhotos) return [];
    if (Array.isArray(logPhotos)) return logPhotos;
    return Array.from(logPhotos);
  }, [logPhotos]);

  const handleAddLogPhotos = (newFiles: File[]) => {
    setLogPhotos([...currentLogPhotosArray, ...newFiles]);
  };

  const handleRemoveLogPhoto = (idx: number) => {
    const updated = currentLogPhotosArray.filter((_, i) => i !== idx);
    setLogPhotos(updated.length > 0 ? updated : null);
  };

  // Helper to convert completePhotos to array
  const currentCompletePhotosArray: File[] = useMemo(() => {
    if (!completePhotos) return [];
    if (Array.isArray(completePhotos)) return completePhotos;
    return Array.from(completePhotos);
  }, [completePhotos]);

  const handleAddCompletePhotos = (newFiles: File[]) => {
    setCompletePhotos([...currentCompletePhotosArray, ...newFiles]);
  };

  const handleRemoveCompletePhoto = (idx: number) => {
    const updated = currentCompletePhotosArray.filter((_, i) => i !== idx);
    setCompletePhotos(updated.length > 0 ? updated : null);
  };

  return (
    <>
      {/* 1. Modal Thêm ghi nhận sửa chữa */}
      {isLogFormOpen && (
        <Modal isOpen={isLogFormOpen} onClose={() => setIsLogFormOpen(false)} title={logAdjustTargetId ? "Điều chỉnh ghi nhận sửa chữa" : "Ghi nhận thao tác xử lý & Ảnh chụp"}>
          <form onSubmit={handleLogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {logAdjustTargetId && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#ef4444', fontWeight: 700 }}>Lý do điều chỉnh *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Ghi sai số đo, nhầm lẫn linh kiện..." 
                  value={logAdjustReason} 
                  onChange={(e) => setLogAdjustReason(e.target.value)} 
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nội dung thao tác xử lý *</label>
              <textarea 
                className="form-input" 
                rows={3} 
                required 
                placeholder="Ví dụ: Kiểm tra điện áp và đo đạc thông số dòng..." 
                value={logContent} 
                onChange={(e) => setLogContent(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết quả sau thao tác (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ví dụ: Điện áp ổn định ở mức 220V..." 
                value={logResult} 
                onChange={(e) => setLogResult(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú thêm (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Các lưu ý hoặc thông số kỹ thuật khác..." 
                value={logNotes} 
                onChange={(e) => setLogNotes(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Chọn phân loại ảnh đính kèm</label>
              <select className="form-select" value={logPhotoCategory} onChange={(e) => setLogPhotoCategory(e.target.value as any)}>
                <option value="BEFORE">Ảnh trước sửa chữa (BEFORE)</option>
                <option value="DURING">Ảnh trong quá trình (DURING)</option>
                <option value="AFTER">Ảnh sau sửa chữa (AFTER)</option>
                <option value="OTHER">Ảnh khác (OTHER)</option>
              </select>
            </div>

            {/* Chụp ảnh và tải ảnh lên */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} /> Ảnh đính kèm (Tùy chọn)
              </label>

              {/* Hidden file input */}
              <input 
                ref={logFileInputRef}
                type="file" 
                multiple 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddLogPhotos(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }} 
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsLogCameraOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: '#2563eb',
                    color: '#2563eb',
                    fontWeight: 600,
                    backgroundColor: '#eff6ff',
                    padding: '7px 14px',
                    fontSize: '13px',
                  }}
                >
                  <Camera size={16} /> Chụp ảnh trực tiếp
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => logFileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                  }}
                >
                  <Upload size={16} /> Tải tệp lên
                </button>

                {currentLogPhotosArray.length > 0 && (
                  <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                    Đã chọn {currentLogPhotosArray.length} ảnh
                  </span>
                )}
              </div>

              {/* Thumbnail preview strip */}
              {currentLogPhotosArray.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {currentLogPhotosArray.map((file, idx) => {
                    const previewUrl = URL.createObjectURL(file);
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '64px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <img
                          src={previewUrl}
                          alt={`log-photo-${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLogPhoto(idx)}
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
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          title="Xóa ảnh"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsLogFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Lưu ghi nhận"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Modal Tạm dừng sửa chữa */}
      {isPauseFormOpen && (
        <Modal isOpen={isPauseFormOpen} onClose={() => setIsPauseFormOpen(false)} title="Xác nhận Tạm dừng sửa chữa">
          <form onSubmit={handlePauseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Chọn lý do tạm dừng sửa chữa *</label>
              <select className="form-select" value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}>
                <option value="Chờ phụ tùng">Chờ phụ tùng</option>
                <option value="Chờ sản xuất bàn giao thiết bị">Chờ sản xuất bàn giao thiết bị</option>
                <option value="Chờ hỗ trợ kỹ thuật">Chờ hỗ trợ kỹ thuật</option>
                <option value="Chờ phê duyệt">Chờ phê duyệt</option>
                <option value="Hết ca">Hết ca</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            {pauseReason === 'Lý do khác' && (
              <div className="form-group">
                <label className="form-label">Nhập chi tiết lý do khác *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  placeholder="Nhập lý do tạm dừng chi tiết..." 
                  value={customPauseReason} 
                  onChange={(e) => setCustomPauseReason(e.target.value)} 
                />
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPauseFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận tạm dừng"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Modal Hoàn thành sửa chữa / Đề nghị bàn giao */}
      {isCompleteFormOpen && (
        <Modal isOpen={isCompleteFormOpen} onClose={() => setIsCompleteFormOpen(false)} title={wo?.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Đề nghị bàn giao kỹ thuật" : "Xác nhận hoàn thành sửa chữa"}>
          <form onSubmit={handleCompleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
            
            <div className="form-group">
              <label className="form-label">Nội dung công việc sửa chữa đã thực hiện *</label>
              <textarea 
                className="form-input" 
                rows={3} 
                required 
                placeholder="Ví dụ: Đã thay thế cầu chì nguồn và hiệu chỉnh cảm biến tiệm cận..." 
                value={completeWorkDone} 
                onChange={(e) => setCompleteWorkDone(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tình trạng thiết bị sau sửa chữa *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="Ví dụ: Thiết bị hoạt động ổn định, đủ áp lực khí..." 
                value={completeEquipmentStatus} 
                onChange={(e) => setCompleteEquipmentStatus(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết quả chạy thử / Kiểm tra test tải *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="Ví dụ: Chạy thử liên tục 15 phút, không phát sinh nhiệt cao hay lỗi báo động..." 
                value={completeTestResult} 
                onChange={(e) => setCompleteTestResult(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kết luận nghiệm thu kỹ thuật *</label>
              <select className="form-select" value={completeConclusion} onChange={(e) => setCompleteConclusion(e.target.value)}>
                <option value="Hoạt động bình thường">Hoạt động bình thường</option>
                <option value="Hoạt động có điều kiện">Hoạt động có điều kiện</option>
                <option value="Chưa khắc phục hoàn toàn">Chưa khắc phục hoàn toàn</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Khuyến nghị hoặc các công việc tiếp theo (Tùy chọn)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ví dụ: Cần theo dõi thêm bộ phận motor sau 1 tuần chạy..." 
                value={completeRecommendation} 
                onChange={(e) => setCompleteRecommendation(e.target.value)} 
              />
            </div>

            {/* Chụp ảnh và tải ảnh hoàn thành */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} /> Ảnh chụp sau sửa chữa / Nghiệm thu (Tùy chọn)
              </label>

              {/* Hidden file input */}
              <input 
                ref={completeFileInputRef}
                type="file" 
                multiple 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddCompletePhotos(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }} 
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsCompleteCameraOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: '#2563eb',
                    color: '#2563eb',
                    fontWeight: 600,
                    backgroundColor: '#eff6ff',
                    padding: '7px 14px',
                    fontSize: '13px',
                  }}
                >
                  <Camera size={16} /> Chụp ảnh trực tiếp
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => completeFileInputRef.current?.click()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    fontSize: '13px',
                  }}
                >
                  <Upload size={16} /> Tải tệp lên
                </button>

                {currentCompletePhotosArray.length > 0 && (
                  <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600 }}>
                    Đã chọn {currentCompletePhotosArray.length} ảnh AFTER
                  </span>
                )}
              </div>

              {/* Thumbnail preview strip */}
              {currentCompletePhotosArray.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {currentCompletePhotosArray.map((file, idx) => {
                    const previewUrl = URL.createObjectURL(file);
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '64px',
                          height: '64px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <img
                          src={previewUrl}
                          alt={`complete-photo-${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCompletePhoto(idx)}
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
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          title="Xóa ảnh"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-success" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : (wo?.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Gửi đề nghị bàn giao" : "Xác nhận hoàn thành")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Camera Capture Modals */}
      <CameraCaptureModal
        isOpen={isLogCameraOpen}
        onClose={() => setIsLogCameraOpen(false)}
        onCapture={handleAddLogPhotos}
        title="Chụp ảnh thao tác sửa chữa"
      />

      <CameraCaptureModal
        isOpen={isCompleteCameraOpen}
        onClose={() => setIsCompleteCameraOpen(false)}
        onCapture={handleAddCompletePhotos}
        title="Chụp ảnh hoàn thành / nghiệm thu"
      />
    </>
  );
};
