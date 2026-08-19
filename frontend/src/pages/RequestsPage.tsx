import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, CheckCircle, XCircle, RotateCcw, Send, Ban, Clock, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { QRScanner } from '../components/common/QRScanner';
import { RequestDetailView } from '../components/common/RequestDetailView';

export const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Detail state for Split Pane layout
  const [selectedDetailReqId, setSelectedDetailReqId] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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

      {/* Main Content Area */}
      <div className="master-detail-container">
        
        {/* Master List Pane */}
        <div className={`master-pane ${selectedDetailReqId ? 'has-selection' : ''}`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải danh sách yêu cầu...</div>
          ) : selectedDetailReqId ? (
            // Cột bên trái khi đang xem chi tiết (Card List)
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px', backgroundColor: 'var(--bg-secondary)' }}>
              {requests.map(req => (
                <div 
                  key={req.id}
                  onClick={() => setSelectedDetailReqId(req.id)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    backgroundColor: selectedDetailReqId === req.id ? 'var(--bg-primary)' : 'var(--bg-card)',
                    border: selectedDetailReqId === req.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    boxShadow: selectedDetailReqId === req.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{req.requestCode}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{req.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Thiết bị: {req.equipment?.code || '---'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Full Table khi không xem chi tiết
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
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <button
                          style={{ fontWeight: 800, color: 'var(--warning)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                          onClick={() => setSelectedDetailReqId(req.id)}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail View Pane */}
        {selectedDetailReqId && (
          <div className="detail-pane">
            <RequestDetailView 
              requestId={selectedDetailReqId} 
              users={users} 
              currentUser={currentUser} 
              onActionSuccess={() => { loadData(); }} 
              onClose={() => setSelectedDetailReqId(null)} 
            />
          </div>
        )}
      </div>

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


    </div>
  );
};
