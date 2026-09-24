import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, CheckCircle, XCircle, RotateCcw, Send, Ban, Clock, AlertCircle, RefreshCw, QrCode, Cpu, Edit2, Trash2, Eye, AlertTriangle, Lock } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { QRScanner } from '../components/common/QRScanner';
import { RequestDetailView } from '../components/common/RequestDetailView';
import { usePermissions } from '../hooks/usePermissions';

export const RequestsPage: React.FC = () => {
  const { can, isAdmin } = usePermissions();
  const canEdit = isAdmin || can('requests:edit');
  const canDelete = isAdmin || can('requests:delete') || can('requests:cancel');

  const [requests, setRequests] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [functionalUnits, setFunctionalUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Detail state for Split Pane layout
  const [selectedDetailReqId, setSelectedDetailReqId] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    equipmentId: '',
    functionalUnitId: '',
    title: '',
    description: '',
    priority: 'HIGH',
  });
  const [editFunctionalUnits, setEditFunctionalUnits] = useState<any[]>([]);
  const [loadingEditUnits, setLoadingEditUnits] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modal State
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleQRScan = (decodedText: string) => {
    const rawCode = (decodedText || '')
      .replace(/^cmms-equipment:/i, '')
      .replace(/^equipment:/i, '')
      .trim();

    const matched = equipmentList.find(
      (e) =>
        e.code?.toLowerCase() === rawCode.toLowerCase() ||
        e.id === rawCode ||
        e.accountingCode?.toLowerCase() === rawCode.toLowerCase()
    );

    if (matched) {
      setFormData((prev) => ({ ...prev, equipmentId: matched.id, functionalUnitId: '' }));
      toast.success('Nhận diện thiết bị thành công', `Thiết bị: ${matched.name} (${matched.code})`);
      setShowScanner(false);
    } else {
      toast.error('Thiết bị không tồn tại', `Mã quét [${rawCode}] không tồn tại trong danh mục thiết bị.`);
    }
  };
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    equipmentId: '',
    functionalUnitId: '',
    title: '',
    description: '',
    priority: 'HIGH',
    reporterName: '',
    department: '',
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
          department: meRes.user.department || '',
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

  // Tải danh sách cụm chức năng theo thiết bị được chọn
  useEffect(() => {
    if (!formData.equipmentId) {
      setFunctionalUnits([]);
      return;
    }
    let isMounted = true;
    const fetchUnits = async () => {
      try {
        setLoadingUnits(true);
        const res = await api.getEquipmentFunctionalUnits(formData.equipmentId);
        if (isMounted) {
          setFunctionalUnits(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (isMounted) setFunctionalUnits([]);
      } finally {
        if (isMounted) setLoadingUnits(false);
      }
    };
    fetchUnits();
    return () => {
      isMounted = false;
    };
  }, [formData.equipmentId]);

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId) {
      toast.warning('Cảnh báo', 'Vui lòng chọn thiết bị gặp sự cố!');
      return;
    }
    const cleanTitle = (formData.title || '').trim();
    const cleanDesc = (formData.description || '').trim();
    if (!cleanTitle) {
      toast.warning('Cảnh báo', 'Tiêu đề sự cố không được để trống!');
      return;
    }
    if (!cleanDesc) {
      toast.warning('Cảnh báo', 'Mô tả hiện trạng hư hỏng không được để trống!');
      return;
    }

    try {
      await api.createRequest({
        equipmentId: formData.equipmentId,
        title: cleanTitle,
        description: cleanDesc,
        priority: formData.priority || 'HIGH',
        reporterId: currentUser?.id || undefined,
        reporterName: currentUser?.name || undefined,
        department: currentUser?.department || undefined,
        functionalUnitId: formData.functionalUnitId?.trim() || undefined,
      });
      setIsAddOpen(false);
      setFormData({
        equipmentId: equipmentList[0]?.id || '',
        functionalUnitId: '',
        title: '',
        description: '',
        priority: 'HIGH',
        reporterName: currentUser?.name || '',
        department: currentUser?.department || '',
      });
      toast.success('Thành công', 'Đã gửi báo cáo sự cố!');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err?.message || 'Không thể tạo yêu cầu bảo trì!');
    }
  };

  // Tải danh sách cụm chức năng theo thiết bị được chọn trong Edit modal
  useEffect(() => {
    if (!editFormData.equipmentId) {
      setEditFunctionalUnits([]);
      return;
    }
    let isMounted = true;
    const fetchUnits = async () => {
      try {
        setLoadingEditUnits(true);
        const res = await api.getEquipmentFunctionalUnits(editFormData.equipmentId);
        if (isMounted) {
          setEditFunctionalUnits(Array.isArray(res) ? res : []);
        }
      } catch (err) {
        if (isMounted) setEditFunctionalUnits([]);
      } finally {
        if (isMounted) setLoadingEditUnits(false);
      }
    };
    fetchUnits();
    return () => {
      isMounted = false;
    };
  }, [editFormData.equipmentId]);

  const openEditModal = (req: any) => {
    setEditingReq(req);
    setEditFormData({
      equipmentId: req.equipmentId || '',
      functionalUnitId: req.functionalUnitId || '',
      title: req.title || '',
      description: req.description || '',
      priority: req.priority || 'HIGH',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;
    try {
      setIsSubmittingEdit(true);
      await api.updateRequest(editingReq.id, {
        equipmentId: editFormData.equipmentId,
        functionalUnitId: editFormData.functionalUnitId || null,
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        priority: editFormData.priority,
      });
      setIsEditOpen(false);
      setEditingReq(null);
      toast.success('Thành công', `Đã cập nhật yêu cầu sự cố ${editingReq.requestCode}`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err?.message || 'Không thể cập nhật yêu cầu sự cố!');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const openDeleteConfirm = (req: any) => {
    setDeleteConfirmReq(req);
  };

  const handleDelete = async () => {
    if (!deleteConfirmReq) return;
    try {
      setIsDeleting(true);
      await api.deleteRequest(deleteConfirmReq.id);
      toast.success('Thành công', `Đã xóa yêu cầu sự cố ${deleteConfirmReq.requestCode}`);
      if (selectedDetailReqId === deleteConfirmReq.id) {
        setSelectedDetailReqId(null);
      }
      setDeleteConfirmReq(null);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi khi xóa', err?.message || 'Không thể xóa yêu cầu sự cố!');
    } finally {
      setIsDeleting(false);
    }
  };

  const isReqLocked = (req: any) => {
    if (!req) return false;
    return req.status === 'CLOSED' || (req.workOrders && req.workOrders.length > 0);
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
        <select className="form-select" style={{ width: '250px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">-- Tất cả Trạng thái --</option>
          <option value="PENDING">Chờ xử lý (Phê duyệt)</option>
          <option value="APPROVED">Đã duyệt (Đang sửa chữa)</option>
          <option value="CLOSED">Đã đóng (Đã nghiệm thu xong)</option>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{req.requestCode}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={req.status} />
                      {isReqLocked(req) ? (
                        <span 
                          title={req.status === 'CLOSED' ? 'Sự cố đã nghiệm thu hoàn tất và đóng' : 'Đã chuyển thành phiếu sửa chữa, đã khóa'} 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}
                        >
                          <Lock size={11} /> Đã khóa
                        </span>
                      ) : (
                        <>
                          {canEdit && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Chỉnh sửa"
                              onClick={(e) => { e.stopPropagation(); openEditModal(req); }}
                              style={{ padding: '4px', borderRadius: '4px', color: '#d97706', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="Xóa"
                              onClick={(e) => { e.stopPropagation(); openDeleteConfirm(req); }}
                              style={{ padding: '4px', borderRadius: '4px', color: '#dc2626', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{req.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Thiết bị: {req.equipment?.code || '---'}
                    {req.functionalUnit && (
                      <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 500 }}>
                        • Cụm: {req.functionalUnit.name}
                      </span>
                    )}
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
                    <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
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
                      <td style={{ fontWeight: 600 }}>
                        <div>{req.equipment?.name || '---'}</div>
                        {req.functionalUnit ? (
                          <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Cpu size={12} />
                            <span>Cụm: {req.functionalUnit.name} {req.functionalUnit.code ? `(${req.functionalUnit.code})` : ''}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Toàn bộ thiết bị
                          </div>
                        )}
                      </td>
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
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Xem chi tiết"
                            onClick={() => setSelectedDetailReqId(req.id)}
                            style={{ padding: '6px', borderRadius: '6px', color: '#2563eb', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                          >
                            <Eye size={15} />
                          </button>
                          {isReqLocked(req) ? (
                            <span 
                              title={req.status === 'CLOSED' ? 'Yêu cầu đã đóng sau khi hoàn thành nghiệm thu' : 'Đã chuyển thành phiếu sửa chữa, đã khóa'}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)', padding: '4px 8px', borderRadius: '6px' }}
                            >
                              <Lock size={13} /> Đã khóa
                            </span>
                          ) : (
                            <>
                              {canEdit && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Chỉnh sửa yêu cầu"
                                  onClick={() => openEditModal(req)}
                                  style={{ padding: '6px', borderRadius: '6px', color: '#d97706', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Xóa yêu cầu sự cố"
                                  onClick={() => openDeleteConfirm(req)}
                                  style={{ padding: '6px', borderRadius: '6px', color: '#dc2626', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
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
              onEdit={canEdit && !isReqLocked(requests.find(r => r.id === selectedDetailReqId)) ? openEditModal : undefined}
              onDelete={canDelete && !isReqLocked(requests.find(r => r.id === selectedDetailReqId)) ? openDeleteConfirm : undefined}
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
              <select 
                className="form-select" 
                required 
                value={formData.equipmentId} 
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value, functionalUnitId: '' })}
              >
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name} - {eq.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cụm chức năng gặp lỗi (Load theo thiết bị đã chọn) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={15} style={{ color: '#2563eb' }} />
                <span>Cụm chức năng lỗi (Tùy chọn)</span>
              </label>
              {loadingUnits && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Đang tải danh sách cụm...
                </span>
              )}
            </div>
            <select
              className="form-select"
              value={formData.functionalUnitId}
              onChange={(e) => setFormData({ ...formData, functionalUnitId: e.target.value })}
              disabled={loadingUnits}
            >
              <option value="">-- Toàn bộ thiết bị / Chưa phân loại cụm --</option>
              {functionalUnits.map((fu) => (
                <option key={fu.id} value={fu.id}>
                  {fu.code ? `[${fu.code}] ` : ''}{fu.name} {fu.libraryItem?.category ? `(${fu.libraryItem.category})` : ''}
                </option>
              ))}
            </select>
            {formData.equipmentId && functionalUnits.length === 0 && !loadingUnits && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                💡 Thiết bị này chưa được cấu hình cụm chức năng riêng lẻ (sự cố sẽ áp dụng cho toàn bộ máy).
              </div>
            )}
            {formData.functionalUnitId && (
              <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✓ Đã chọn cụm sự cố: <strong>{functionalUnits.find(u => u.id === formData.functionalUnitId)?.name}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tên sự cố / Tiêu đề ngắn *</label>
            <input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Băng tải kêu rít, Máy dừng đột ngột..." />
          </div>

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
            <label className="form-label">Mô tả chi tiết hiện trạng hư hỏng *</label>
            <textarea className="form-textarea" required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Hiện tượng, thời điểm xảy ra..." />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Gửi Yêu cầu</button>
          </div>
        </form>
      </Modal>

      {/* Edit Request Modal */}
      {isEditOpen && (
        <Modal 
          isOpen={isEditOpen} 
          onClose={() => { setIsEditOpen(false); setEditingReq(null); }} 
          title={`Chỉnh sửa Yêu cầu: ${editingReq?.requestCode || ''}`}
        >
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Thiết bị gặp sự cố *</label>
              <select 
                className="form-select" 
                required 
                value={editFormData.equipmentId} 
                onChange={(e) => setEditFormData({ ...editFormData, equipmentId: e.target.value, functionalUnitId: '' })}
              >
                {equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name} - {eq.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Cụm chức năng gặp lỗi */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} style={{ color: '#2563eb' }} />
                  <span>Cụm chức năng lỗi (Tùy chọn)</span>
                </label>
                {loadingEditUnits && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách cụm...
                  </span>
                )}
              </div>
              <select
                className="form-select"
                value={editFormData.functionalUnitId}
                onChange={(e) => setEditFormData({ ...editFormData, functionalUnitId: e.target.value })}
                disabled={loadingEditUnits}
              >
                <option value="">-- Toàn bộ thiết bị / Chưa phân loại cụm --</option>
                {editFunctionalUnits.map((fu) => (
                  <option key={fu.id} value={fu.id}>
                    {fu.code ? `[${fu.code}] ` : ''}{fu.name} {fu.libraryItem?.category ? `(${fu.libraryItem.category})` : ''}
                  </option>
                ))}
              </select>
              {editFormData.functionalUnitId && (
                <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✓ Cụm đã chọn: <strong>{editFunctionalUnits.find(u => u.id === editFormData.functionalUnitId)?.name || 'Cụm chức năng'}</strong>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Tên sự cố / Tiêu đề ngắn *</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                value={editFormData.title} 
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} 
                placeholder="Băng tải kêu rít, Máy dừng đột ngột..." 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mức độ ưu tiên</label>
              <select 
                className="form-select" 
                value={editFormData.priority} 
                onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
              >
                <option value="URGENT">Khẩn cấp (Dừng sản xuất)</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chi tiết hiện trạng hư hỏng</label>
              <textarea 
                className="form-textarea" 
                rows={3} 
                value={editFormData.description} 
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} 
                placeholder="Hiện tượng, thời điểm xảy ra..." 
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setIsEditOpen(false); setEditingReq(null); }}
                disabled={isSubmittingEdit}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReq && (
        <Modal 
          isOpen={Boolean(deleteConfirmReq)} 
          onClose={() => setDeleteConfirmReq(null)} 
          title="Xác nhận xóa Yêu cầu sự cố"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: '#991b1b' }}>
                <strong>Cảnh báo:</strong> Hành động này sẽ xóa vĩnh viễn yêu cầu sự cố và lịch sử liên quan khỏi hệ thống. Hành động này không thể hoàn tác!
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
              <div><strong>Mã yêu cầu:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{deleteConfirmReq.requestCode}</span></div>
              <div style={{ marginTop: '4px' }}><strong>Tiêu đề:</strong> {deleteConfirmReq.title}</div>
              <div style={{ marginTop: '4px' }}><strong>Thiết bị:</strong> {deleteConfirmReq.equipment?.name} ({deleteConfirmReq.equipment?.code})</div>
              <div style={{ marginTop: '4px' }}><strong>Người báo:</strong> {deleteConfirmReq.reporterName}</div>
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setDeleteConfirmReq(null)} 
                disabled={isDeleting}
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleDelete} 
                disabled={isDeleting} 
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
