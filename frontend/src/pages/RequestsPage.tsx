import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, CheckCircle, XCircle, RotateCcw, Send, Ban, Clock, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { QRScanner } from '../components/common/QRScanner';

export const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [approveModalReq, setApproveModalReq] = useState<any>(null);
  const [technicianName, setTechnicianName] = useState('Trần Văn Kỹ Thuật');
  const [handlerTeam, setHandlerTeam] = useState('XUONG'); // 'XUONG' hoặc 'CO_DIEN'

  const handleQRScan = (decodedText: string) => {
    if (decodedText.startsWith('cmms-equipment:')) {
      const eqId = decodedText.split(':')[1];
      const matched = equipmentList.find((e) => e.id === eqId);
      if (matched) {
        setFormData((prev) => ({ ...prev, equipmentId: eqId }));
        toast.success('Nhận diện thiết bị thành công', `Thiết bị: ${matched.name} (${matched.code})`);
        setShowScanner(false);
      } else {
        toast.error('Thiết bị không tồn tại', 'ID thiết bị quét từ mã QR không tồn tại trong hệ thống.');
      }
    } else {
      toast.warning('Mã QR không đúng định dạng', 'Mã QR quét được không thuộc hệ thống CMMS thiết bị.');
    }
  };

  // Detail / History Modal
  const [detailReq, setDetailReq] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Resubmit Modal
  const [resubmitReq, setResubmitReq] = useState<any>(null);
  const [resubmitFields, setResubmitFields] = useState<any>({});
  const [resubmitComment, setResubmitComment] = useState('');

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    equipmentId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    reporterName: 'Lê Hoàng Nam (Quản đốc)',
    department: 'Bộ phận Đóng gói',
  });

  const [users, setUsers] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, eqRes, userRes, meRes] = await Promise.all([
        api.getRequests({ status: statusFilter }),
        api.getEquipment(),
        api.getUsers().catch(() => []),
        api.getMe().catch(() => null),
      ]);
      setRequests(reqRes);
      setEquipmentList(eqRes);
      setUsers(userRes);

      if (meRes && meRes.authenticated) {
        setCurrentUser(meRes.user);
        setFormData((prev) => ({
          ...prev,
          reporterName: meRes.user.name,
          department: meRes.user.department || 'Phòng ban khác',
        }));
      }

      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({
          ...prev,
          equipmentId: eqRes[0].id,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequest(formData);
      setIsAddOpen(false);
      setFormData({
        equipmentId: equipmentList[0]?.id || '',
        title: '',
        description: '',
        priority: 'HIGH',
        reporterName: currentUser ? currentUser.name : 'Lê Hoàng Nam (Quản đốc)',
        department: currentUser ? (currentUser.department || 'Phòng ban khác') : 'Bộ phận Đóng gói',
      });
      loadData();
    } catch (err) {
      toast.error('Lỗi', 'Không thể tạo yêu cầu bảo trì!');
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveModalReq) return;
    try {
      await api.approveRequest(approveModalReq.id, { 
        technicianName: handlerTeam === 'XUONG' ? technicianName : undefined, 
        handlerTeam 
      });
      setApproveModalReq(null);
      setHandlerTeam('XUONG');
      toast.success('Phê duyệt thành công', 'Đã phê duyệt yêu cầu & tự động tạo Phiếu Bảo Trì.');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Phiên làm việc đã lỗi thời. Dữ liệu sẽ được tải lại.');
        loadData();
      } else {
        toast.error('Lỗi phê duyệt', err.message || 'Không thể phê duyệt yêu cầu');
      }
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Nhập lý do từ chối yêu cầu này:');
    if (reason) {
      await api.rejectRequest(id, { reason });
      loadData();
    }
  };

  const handleReturn = async (req: any) => {
    const reason = prompt('Nhập lý do trả lại yêu cầu để bổ sung thông tin:');
    if (!reason || reason.trim() === '') return;
    try {
      await api.returnRequest(req.id, {
        reason: reason.trim(),
        expectedVersion: req.version,
        actedById: getActiveUserId(),
      });
      toast.success('Trả lại thành công', 'Đã trả lại yêu cầu để bổ sung thông tin.');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Có người khác vừa cập nhật yêu cầu này. Dữ liệu sẽ được tải lại.');
        loadData();
      } else {
        toast.error('Lỗi', err.message || 'Không thể trả lại yêu cầu');
      }
    }
  };

  const openResubmit = (req: any) => {
    setResubmitReq(req);
    setResubmitFields({
      title: req.title,
      description: req.description,
      priority: req.priority,
    });
    setResubmitComment('');
  };

  const handleResubmitConfirm = async () => {
    if (!resubmitReq) return;
    try {
      await api.resubmitRequest(resubmitReq.id, {
        expectedVersion: resubmitReq.version,
        actedById: getActiveUserId(),
        comment: resubmitComment || 'Đã bổ sung thông tin',
        updatedFields: resubmitFields,
      });
      setResubmitReq(null);
      toast.success('Tái gửi thành công', 'Đã tái gửi yêu cầu với thông tin bổ sung.');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Có người khác vừa cập nhật yêu cầu này. Dữ liệu sẽ được tải lại.');
        setResubmitReq(null);
        loadData();
      } else {
        toast.error('Lỗi', err.message || 'Không thể tái gửi yêu cầu');
      }
    }
  };

  const handleCancel = async (req: any) => {
    const reason = prompt('Nhập lý do hủy yêu cầu:');
    if (!reason || reason.trim() === '') return;
    try {
      await api.cancelRequest(req.id, {
        reason: reason.trim(),
        expectedVersion: req.version,
        actedById: getActiveUserId(),
      });
      toast.success('Hủy thành công', 'Đã hủy yêu cầu bảo trì.');
      loadData();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Có người khác vừa cập nhật yêu cầu này. Dữ liệu sẽ được tải lại.');
        loadData();
      } else {
        toast.error('Lỗi', err.message || 'Không thể hủy yêu cầu');
      }
    }
  };

  const openDetail = async (req: any) => {
    setDetailReq(req);
    setHistoryLoading(true);
    try {
      const h = await api.getRequestHistory(req.id);
      setHistory(h);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Yêu cầu Sửa chữa & Báo Sự cố</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Tiếp nhận báo hỏng từ nhân viên vận hành xưởng, phê duyệt và tự động tạo phiếu bảo trì.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Gửi yêu cầu báo sự cố mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4">
        <select className="form-select" style={{ width: '220px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">-- Tất cả Trạng thái --</option>
          <option value="PENDING">Chờ xử lý (Phê duyệt)</option>
          <option value="APPROVED">Đã duyệt (Đã chuyển thành WO)</option>
          <option value="REJECTED">Đã từ chối</option>
          <option value="RETURNED">Đã trả lại</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách yêu cầu...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Yêu cầu</th>
                <th>Thiết bị sự cố</th>
                <th>Mô tả / Tiêu đề</th>
                <th>Người báo</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center', minWidth: '250px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <button
                      style={{ fontWeight: 800, color: 'var(--warning)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      onClick={() => openDetail(req)}
                    >
                      {req.requestCode}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{req.equipment?.name || '---'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.description}</div>
                    {req.status === 'RETURNED' && req.returnedReason && (
                      <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', padding: '4px 8px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                        <strong>Lý do trả lại:</strong> {req.returnedReason}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    <div>{req.reporterName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.department}</div>
                  </td>
                  <td><StatusBadge status={req.priority} /></td>
                  <td><StatusBadge status={req.status} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {req.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                        <button className="btn btn-success btn-sm" onClick={() => setApproveModalReq(req)}>
                          <CheckCircle size={13} /> Duyệt
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(req.id)}>
                          <XCircle size={13} /> Từ chối
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleReturn(req)} style={{ color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                          <RotateCcw size={13} /> Trả lại
                        </button>
                      </div>
                    ) : req.status === 'RETURNED' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openResubmit(req)}>
                          <Send size={13} /> Tái gửi
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(req)}>
                          <Ban size={13} /> Hủy
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {req.status === 'APPROVED' ? 'Đã tạo WO' : req.status === 'REJECTED' ? 'Đã từ chối' : req.status === 'CANCELLED' ? 'Đã hủy' : 'Đã xử lý'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Request Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Tạo Yêu cầu Sửa chữa / Báo sự cố">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Chọn Thiết bị gặp sự cố *</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '12px', borderColor: 'var(--border-color)' }}
                onClick={() => setShowScanner(true)}
              >
                <QrCode size={14} /> Quét mã QR
              </button>
            </div>
            {showScanner ? (
              <div style={{ marginBottom: '12px' }}>
                <QRScanner onScanSuccess={handleQRScan} onClose={() => setShowScanner(false)} />
              </div>
            ) : (
              <select className="form-select" required value={formData.equipmentId} onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}>
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name} - {eq.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tên sự cố / Tiêu đề ngắn *</label>
            <input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Băng tải kêu rít, Máy dừng đột ngột..." />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Mức độ ưu tiên</label>
              <select className="form-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <option value="URGENT">Khẩn cấp (Dừng sản xuất)</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Người báo sự cố</label>
              <input type="text" className="form-input" value={formData.reporterName} onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả chi tiết hiện trạng hư hỏng</label>
            <textarea className="form-textarea" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Hiện tượng, thời điểm xảy ra..." />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Gửi Yêu cầu</button>
          </div>
        </form>
      </Modal>

      {/* Approve Request Modal */}
      {approveModalReq && (
        <Modal isOpen={!!approveModalReq} onClose={() => { setApproveModalReq(null); setHandlerTeam('XUONG'); }} title={`Phê duyệt & Tạo Phiếu Bảo Trì cho ${approveModalReq.requestCode}`}>
          <div>
            <p className="mb-4">
              <strong>Yêu cầu:</strong> {approveModalReq.title}<br />
              <strong>Thiết bị:</strong> {approveModalReq.equipment?.name} ({approveModalReq.equipment?.code})
            </p>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Phương án xử lý sự cố *</label>
              <select className="form-select" value={handlerTeam} onChange={(e) => setHandlerTeam(e.target.value)}>
                <option value="XUONG">Sự cố nhỏ - Xưởng tự xử lý</option>
                <option value="CO_DIEN">Sự cố nghiêm trọng - Chuyển bộ phận Cơ điện</option>
              </select>
            </div>

            {handlerTeam === 'XUONG' && (
              <div className="form-group">
                <label className="form-label">Phân công Kỹ thuật viên Phụ trách *</label>
                <input type="text" className="form-input" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder="Nhập tên kỹ thuật viên" />
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => { setApproveModalReq(null); setHandlerTeam('XUONG'); }}>Hủy</button>
              <button className="btn btn-success" onClick={handleApproveConfirm}>
                Xác nhận Duyệt & Tạo Phiếu WO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resubmit Modal */}
      {resubmitReq && (
        <Modal isOpen={!!resubmitReq} onClose={() => setResubmitReq(null)} title={`Tái gửi yêu cầu ${resubmitReq.requestCode}`}>
          <div>
            {resubmitReq.returnedReason && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', marginBottom: '4px' }}>Lý do trả lại gần nhất:</div>
                <div style={{ fontSize: '13px' }}>{resubmitReq.returnedReason}</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tiêu đề</label>
              <input type="text" className="form-input" value={resubmitFields.title || ''} onChange={(e) => setResubmitFields({ ...resubmitFields, title: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chi tiết (bổ sung thêm thông tin)</label>
              <textarea className="form-textarea" rows={3} value={resubmitFields.description || ''} onChange={(e) => setResubmitFields({ ...resubmitFields, description: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Mức độ ưu tiên</label>
              <select className="form-select" value={resubmitFields.priority || 'MEDIUM'} onChange={(e) => setResubmitFields({ ...resubmitFields, priority: e.target.value })}>
                <option value="URGENT">Khẩn cấp</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú bổ sung</label>
              <input type="text" className="form-input" value={resubmitComment} onChange={(e) => setResubmitComment(e.target.value)} placeholder="Đã bổ sung mô tả và hình ảnh..." />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setResubmitReq(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleResubmitConfirm}>
                <Send size={14} /> Tái gửi Yêu cầu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail & History Modal */}
      {detailReq && (
        <Modal isOpen={!!detailReq} onClose={() => setDetailReq(null)} title={`Chi tiết yêu cầu ${detailReq.requestCode}`}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div><strong>Tiêu đề:</strong> {detailReq.title}</div>
              <div><strong>Trạng thái:</strong> <StatusBadge status={detailReq.status} /></div>
              <div><strong>Thiết bị:</strong> {detailReq.equipment?.name}</div>
              <div><strong>Ưu tiên:</strong> <StatusBadge status={detailReq.priority} /></div>
              <div><strong>Người báo:</strong> {detailReq.reporterName}</div>
              <div><strong>Version:</strong> {detailReq.version}</div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <strong>Mô tả:</strong>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{detailReq.description}</p>
            </div>

            {detailReq.returnedReason && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px', marginBottom: '16px', borderLeft: '3px solid var(--danger)' }}>
                <strong style={{ color: 'var(--danger)', fontSize: '12px' }}>Lý do trả lại:</strong>
                <div style={{ fontSize: '13px' }}>{detailReq.returnedReason}</div>
              </div>
            )}

            {detailReq.rejectedReason && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '6px', marginBottom: '16px', borderLeft: '3px solid var(--danger)' }}>
                <strong style={{ color: 'var(--danger)', fontSize: '12px' }}>Lý do từ chối:</strong>
                <div style={{ fontSize: '13px' }}>{detailReq.rejectedReason}</div>
              </div>
            )}

            {detailReq.cancelledReason && (
              <div style={{ padding: '10px', backgroundColor: 'rgba(100,100,100,0.08)', borderRadius: '6px', marginBottom: '16px', borderLeft: '3px solid var(--text-muted)' }}>
                <strong style={{ fontSize: '12px' }}>Lý do hủy:</strong>
                <div style={{ fontSize: '13px' }}>{detailReq.cancelledReason}</div>
              </div>
            )}

            {/* Workflow History */}
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Lịch sử chuyển trạng thái
            </h4>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--primary)' }} /> Đang tải...
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Chưa có lịch sử chuyển trạng thái.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((h, idx) => (
                  <div key={h.id} style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--primary)' }}>{h.action}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {h.fromStatus || '---'} → {h.toStatus || '---'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {h.reason && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lý do: {h.reason}</div>}
                    {h.comment && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{h.comment}</div>}
                    {h.requestVersionBefore != null && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Version: {h.requestVersionBefore} → {h.requestVersionAfter}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
