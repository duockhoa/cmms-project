import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Modal } from '../../common/Modal';

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
}) => (
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

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Camera size={18} /> Chụp / Chọn ảnh đính kèm (Có thể chọn nhiều)
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="form-input" 
                onChange={(e) => setLogPhotos(e.target.files)} 
              />
              {logPhotos && logPhotos.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-success)', marginTop: '4px', fontWeight: 600 }}>
                  Đã chọn {logPhotos.length} file ảnh.
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
        <Modal isOpen={isCompleteFormOpen} onClose={() => setIsCompleteFormOpen(false)} title={wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Đề nghị bàn giao kỹ thuật" : "Xác nhận hoàn thành sửa chữa"}>
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

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Camera size={18} /> Ảnh chụp sau sửa chữa / Nghiệm thu (Tùy chọn)
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="form-input" 
                onChange={(e) => setCompletePhotos(e.target.files)} 
              />
              {completePhotos && completePhotos.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-success)', marginTop: '4px', fontWeight: 600 }}>
                  Đã chọn {completePhotos.length} file ảnh AFTER.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-success" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : (wo.handlingRoute === 'TECHNICAL_MAINTENANCE_SUPPORT' ? "Gửi đề nghị bàn giao" : "Xác nhận hoàn thành")}
              </button>
            </div>
          </form>
        </Modal>
      )}

  </>
);
