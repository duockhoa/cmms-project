import React from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../common/Modal';

export const WorkOrderAcceptanceModals: React.FC<any> = ({
  actionLoading, cleanlinessResult, gmpImpactAssessment, handleQaRejectSubmit,
  handleQaVerifySubmit, handleRejectHandoverSubmit, handleWorkshopAcceptSubmit,
  isQaAcceptOpen, isQaRejectOpen, isRejectHandoverOpen, isWorkshopAcceptOpen,
  lineClearanceResult, qaComment, qaRejectReason, rejectHandoverReason,
  setCleanlinessResult, setGmpImpactAssessment, setIsQaAcceptOpen,
  setIsQaRejectOpen, setIsRejectHandoverOpen, setIsWorkshopAcceptOpen,
  setLineClearanceResult, setQaComment, setQaRejectReason,
  setRejectHandoverReason, setTestRunResult, setWorkshopComment,
  testRunResult, workshopComment,
}) => (
  <>
      {/* 7. Modal Từ chối nhận bàn giao */}
      {isRejectHandoverOpen && (
        <Modal isOpen={isRejectHandoverOpen} onClose={() => setIsRejectHandoverOpen(false)} title="Yêu cầu xử lý lại (Từ chối nghiệm thu)">
          <form onSubmit={handleRejectHandoverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Lý do yêu cầu xử lý lại *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Ví dụ: Thiết bị chạy thử vẫn bị rung động mạnh, nhiệt độ chưa đạt mức cài đặt..."
                value={rejectHandoverReason}
                onChange={(e) => setRejectHandoverReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRejectHandoverOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận gửi yêu cầu"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 8. Modal Nghiệm thu Phân xưởng */}
      {isWorkshopAcceptOpen && (
        <Modal isOpen={isWorkshopAcceptOpen} onClose={() => setIsWorkshopAcceptOpen(false)} title="Biên bản Nghiệm thu Bàn giao (Phân xưởng)">
          <form onSubmit={handleWorkshopAcceptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '13px', color: '#065f46' }}>
              <strong>Lưu ý GMP:</strong> Sau khi phân xưởng nghiệm thu đạt, phiếu sẽ được chuyển tiếp sang <strong>Bộ phận Đảm bảo chất lượng (QA)</strong> để thẩm định hồ sơ và cấp phép giải phóng chuyền (Line Clearance).
            </div>

            <div className="form-group">
              <label className="form-label">Tình trạng chạy thử & kiểm tra vận hành *</label>
              <select
                className="form-select"
                value={testRunResult}
                onChange={(e) => setTestRunResult(e.target.value)}
              >
                <option value="Đạt yêu cầu vận hành, máy hoạt động ổn định, đủ thông số kỹ thuật">Đạt yêu cầu vận hành, máy hoạt động ổn định, đủ thông số kỹ thuật</option>
                <option value="Đạt mức cơ bản, cần tiếp tục theo dõi thêm trong ca sản xuất">Đạt mức cơ bản, cần tiếp tục theo dõi thêm trong ca sản xuất</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tình trạng vệ sinh 5S khu vực máy *</label>
              <select
                className="form-select"
                value={cleanlinessResult}
                onChange={(e) => setCleanlinessResult(e.target.value)}
              >
                <option value="Đạt tiêu chuẩn vệ sinh 5S / xưởng sạch sẽ, không rơi vãi đồ nghề">Đạt tiêu chuẩn vệ sinh 5S / xưởng sạch sẽ, không rơi vãi đồ nghề</option>
                <option value="Đã vệ sinh sơ bộ, đang tiếp tục lau dọn khử trùng">Đã vệ sinh sơ bộ, đang tiếp tục lau dọn khử trùng</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ý kiến / Nhận xét của Phân xưởng *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Nhập nhận xét cụ thể từ đại diện xưởng (ví dụ: Đã cho chạy thử 30 phút, máy chạy êm, áp suất đạt chuẩn...)"
                value={workshopComment}
                onChange={(e) => setWorkshopComment(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => {
                  setIsWorkshopAcceptOpen(false);
                  setIsRejectHandoverOpen(true);
                }}
              >
                Yêu cầu xử lý lại
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkshopAcceptOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận Nghiệm thu & Chuyển QA"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 9. Modal QA Thẩm định & Nghiệm thu */}
      {isQaAcceptOpen && (
        <Modal isOpen={isQaAcceptOpen} onClose={() => setIsQaAcceptOpen(false)} title="Biên bản Thẩm định & Nghiệm thu (Đảm bảo chất lượng - QA)">
          <form onSubmit={handleQaVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(124, 58, 237, 0.08)', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)', fontSize: '13px', color: '#5b21b6' }}>
              <strong>Phê duyệt QA (Cấp cuối):</strong> Sau khi QA phê duyệt, phiếu sửa chữa chính thức hoàn tất (VERIFIED). Hệ thống sẽ tự động đóng và khóa yêu cầu sự cố liên kết để bảo toàn hồ sơ bảo trì GMP.
            </div>

            <div className="form-group">
              <label className="form-label">Đánh giá tác động chất lượng sản phẩm (GMP Impact) *</label>
              <select
                className="form-select"
                value={gmpImpactAssessment}
                onChange={(e) => setGmpImpactAssessment(e.target.value)}
              >
                <option value="Không ảnh hưởng đến chất lượng sản phẩm / Đạt tiêu chuẩn GMP">Không ảnh hưởng đến chất lượng sản phẩm / Đạt tiêu chuẩn GMP</option>
                <option value="Ảnh hưởng thấp, đã lấy mẫu kiểm nghiệm theo dõi lô tiếp theo">Ảnh hưởng thấp, đã lấy mẫu kiểm nghiệm theo dõi lô tiếp theo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Giải phóng chuyền & Cấp phép sản xuất (Line Clearance) *</label>
              <select
                className="form-select"
                value={lineClearanceResult}
                onChange={(e) => setLineClearanceResult(e.target.value)}
              >
                <option value="Đồng ý giải phóng chuyền, cho phép đưa thiết bị vào sản xuất trở lại">Đồng ý giải phóng chuyền, cho phép đưa thiết bị vào sản xuất trở lại</option>
                <option value="Cho phép vận hành thử nghiệm có giám sát QA">Cho phép vận hành thử nghiệm có giám sát QA</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kết luận / Đánh giá của QA *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Nhập kết luận thẩm định từ QA (ví dụ: Hồ sơ bảo trì đầy đủ, vật tư thay thế chính hãng có CO/CoA, máy móc đạt tiêu chuẩn GMP đưa vào sản xuất)..."
                value={qaComment}
                onChange={(e) => setQaComment(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => {
                  setIsQaAcceptOpen(false);
                  setIsQaRejectOpen(true);
                }}
              >
                QA Yêu cầu xử lý lại
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsQaAcceptOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "QA Phê duyệt Nghiệm thu"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 10. Modal QA Yêu cầu xử lý lại */}
      {isQaRejectOpen && (
        <Modal isOpen={isQaRejectOpen} onClose={() => setIsQaRejectOpen(false)} title="QA Yêu cầu xử lý lại">
          <form onSubmit={handleQaRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Lý do QA yêu cầu xử lý lại *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Nhập lý do chi tiết từ QA (ví dụ: Nhật ký chưa đầy đủ thông số chạy thử, phụ tùng thay thế chưa cập nhật số lô/CoA, vệ sinh chưa đạt chuẩn GMP...)"
                value={qaRejectReason}
                onChange={(e) => setQaRejectReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsQaRejectOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận gửi yêu cầu xử lý lại"}
              </button>
            </div>
          </form>
        </Modal>
      )}
  </>
);
