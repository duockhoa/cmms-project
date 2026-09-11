import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { CheckCircle, XCircle, RotateCcw, Send, Ban, Loader2, XOctagon } from 'lucide-react';

interface RequestDetailViewProps {
  requestId: string;
  currentUser: any;
  users: any[];
  onActionSuccess: () => void;
  onClose: () => void;
}

export const RequestDetailView: React.FC<RequestDetailViewProps> = ({
  requestId,
  currentUser,
  users,
  onActionSuccess,
  onClose,
}) => {
  const toast = useToast();
  const [req, setReq] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for actions
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [handlerType, setHandlerType] = useState<'WORKSHOP' | 'EXTERNAL_DEPT'>('WORKSHOP');
  const [internalDepartment, setInternalDepartment] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [assignedTechnicianIds, setAssignedTechnicianIds] = useState<string[]>([]);
  const [supporterIds, setSupporterIds] = useState<string[]>([]);
  const [watcherId, setWatcherId] = useState('');
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);

  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitFields, setResubmitFields] = useState<any>({});
  const [resubmitComment, setResubmitComment] = useState('');

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, h, depts] = await Promise.all([
        api.getRequestById(requestId),
        api.getRequestHistory(requestId),
        api.getDepartments().catch(() => []),
      ]);
      setReq(data);
      setHistory(h);
      setDepartmentsList(depts);
      const reqDept = data?.department || data?.equipment?.location || '';
      if (reqDept) {
        setInternalDepartment(reqDept);
      } else if (depts.length > 0) {
        setInternalDepartment(depts[0]);
      }
      if (depts.length > 0 && !targetDepartment) {
        const preferred = depts.find((d: string) => d.toLowerCase().includes('cơ điện')) || depts[0];
        setTargetDepartment(preferred);
      }
    } catch (err: any) {
      toast.error('Lỗi tải chi tiết', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) loadData();
  }, [requestId]);

  // Bộ phận sở tại của sự cố
  const reqDepartment = req?.department || req?.equipment?.location || '';

  // Danh sách đầy đủ các phòng ban từ HRM kết hợp phòng ban sự cố
  const allDepartments = React.useMemo(() => {
    const list = [...departmentsList];
    if (reqDepartment && !list.some(d => d.toLowerCase() === reqDepartment.toLowerCase())) {
      list.unshift(reqDepartment);
    }
    return list;
  }, [departmentsList, reqDepartment]);

  // Chỉ lấy nhân sự thuộc đúng bộ phận sở tại khi xử lý nội bộ - TUYỆT ĐỐI KHÔNG LOAD TOÀN BỘ NGƯỜI
  const internalUsers = React.useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    const target = (internalDepartment || reqDepartment).trim().toLowerCase();
    if (!target) return [];
    return users.filter((u: any) => {
      if (u.isActive === false) return false;
      if (!u.department) return false;
      const uDept = u.department.trim().toLowerCase();
      return uDept === target || target.includes(uDept) || uDept.includes(target);
    });
  }, [users, internalDepartment, reqDepartment]);

  // Danh sách các bộ phận khác để chuyển giao (không hardcode)
  const externalDepartments = React.useMemo(() => {
    const current = (internalDepartment || reqDepartment).trim().toLowerCase();
    return departmentsList.filter((dept) => {
      if (!dept) return false;
      const dLower = dept.trim().toLowerCase();
      return dLower !== current && !current.includes(dLower);
    });
  }, [departmentsList, internalDepartment, reqDepartment]);

  const handleApproveConfirm = async () => {
    try {
      const firstTech = internalUsers.find((u: any) => assignedTechnicianIds.includes(u.id));
      await api.approveRequest(req.id, { 
        handlerType,
        targetDepartment: handlerType === 'EXTERNAL_DEPT' ? targetDepartment : undefined,
        assignedTechnicianIds: handlerType === 'WORKSHOP' && assignedTechnicianIds.length > 0 ? assignedTechnicianIds : undefined,
        assignedTechnicianId: handlerType === 'WORKSHOP' && assignedTechnicianIds.length > 0 ? assignedTechnicianIds[0] : undefined,
        technicianName: handlerType === 'WORKSHOP' && firstTech ? firstTech.name : undefined,
        supporterIds: handlerType === 'WORKSHOP' && supporterIds.length > 0 ? supporterIds : undefined,
        watcherId: handlerType === 'WORKSHOP' && watcherId ? watcherId : undefined,
        handlerTeam: handlerType === 'EXTERNAL_DEPT' ? targetDepartment : 'XUONG'
      });
      setApproveModalOpen(false);
      setHandlerType('WORKSHOP');
      setAssignedTechnicianIds([]);
      setSupporterIds([]);
      setWatcherId('');
      toast.success(
        'Phê duyệt thành công', 
        handlerType === 'EXTERNAL_DEPT' 
          ? `Đã tạo phiếu bảo trì chuyển ${targetDepartment} ở trạng thái Chờ phân công.`
          : 'Đã tạo phiếu bảo trì cho phân xưởng tự xử lý.'
      );
      onActionSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi phê duyệt', err.message);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Nhập lý do từ chối:');
    if (reason) {
      try {
        await api.rejectRequest(req.id, { reason });
        toast.success('Thành công', 'Đã từ chối yêu cầu.');
        onActionSuccess();
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message);
      }
    }
  };

  const handleReturn = async () => {
    const reason = prompt('Nhập lý do trả lại:');
    if (reason) {
      try {
        await api.returnRequest(req.id, {
          reason: reason.trim(),
          expectedVersion: req.version,
          actedById: getActiveUserId(),
        });
        toast.success('Thành công', 'Đã trả lại yêu cầu.');
        onActionSuccess();
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message);
      }
    }
  };

  const openResubmit = () => {
    setResubmitFields({
      title: req.title,
      description: req.description,
      priority: req.priority,
    });
    setResubmitComment('');
    setResubmitModalOpen(true);
  };

  const handleResubmitConfirm = async () => {
    try {
      await api.resubmitRequest(req.id, {
        expectedVersion: req.version,
        actedById: getActiveUserId(),
        comment: resubmitComment || 'Đã bổ sung thông tin',
        updatedFields: resubmitFields,
      });
      setResubmitModalOpen(false);
      toast.success('Thành công', 'Đã tái gửi yêu cầu.');
      onActionSuccess();
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Nhập lý do hủy:');
    if (reason) {
      try {
        await api.cancelRequest(req.id, {
          reason: reason.trim(),
          expectedVersion: req.version,
          actedById: getActiveUserId(),
        });
        toast.success('Thành công', 'Đã hủy yêu cầu.');
        onActionSuccess();
        loadData();
      } catch (err: any) {
        toast.error('Lỗi', err.message);
      }
    }
  };

  if (loading || !req) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px auto' }} size={24} />
          Đang tải chi tiết yêu cầu...
        </div>
      </div>
    );
  }

  const ActionButton = ({ onClick, disabled, icon: Icon, label, color }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', 
        background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div className="action-grid-btn" style={{ 
        borderRadius: '50%', backgroundColor: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <Icon size={24} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: '1.3' }}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="request-detail-view" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          {req.title} <span style={{ color: 'var(--text-muted)' }}>- {req.requestCode}</span>
        </h2>
        <button onClick={onClose} className="btn-icon">
          <XOctagon size={18} />
        </button>
      </div>

      <div className="request-detail-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, padding: '24px', overflowY: 'auto' }}>
        
        {/* Top Header Card - Action Grid */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
             Các thao tác
           </h3>
           
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
             
             {req.status === 'PENDING' && (
               <>
                 <ActionButton onClick={() => setApproveModalOpen(true)} icon={CheckCircle} label="Duyệt" color="#10b981" />
                 <ActionButton onClick={handleReject} icon={XCircle} label="Từ chối" color="#ef4444" />
                 <ActionButton onClick={handleReturn} icon={RotateCcw} label="Trả lại" color="#f59e0b" />
               </>
             )}

             {req.status === 'RETURNED' && (
               <>
                 <ActionButton onClick={openResubmit} icon={Send} label="Tái gửi" color="#3b82f6" />
                 <ActionButton onClick={handleCancel} icon={Ban} label="Hủy" color="#ef4444" />
               </>
             )}

             {['APPROVED', 'REJECTED', 'CANCELLED'].includes(req.status) && (
               <div style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                 Yêu cầu này đã xử lý xong. Không có hành động nào khả dụng.
               </div>
             )}

           </div>
        </div>

        {/* Metadata Table */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e3a8a' }}>Thông tin Yêu cầu</h3>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', width: '25%', color: 'var(--text-secondary)' }}>Mã yêu cầu</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.requestCode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tiêu đề</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.title}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thiết bị</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{req.equipment?.code} - {req.equipment?.name}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
                <td style={{ padding: '12px 0' }}>
                  <StatusBadge status={req.status} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</td>
                <td style={{ padding: '12px 0' }}>
                  <StatusBadge status={req.priority} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người báo</td>
                <td style={{ padding: '12px 0' }}>{req.reporterName} ({req.department})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Version</td>
                <td style={{ padding: '12px 0' }}>{req.version}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mô tả chi tiết</td>
                <td style={{ padding: '12px 0' }}>{req.description}</td>
              </tr>
              
              {/* Lý do trả/từ chối/huỷ nếu có */}
              {req.returnedReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do trả lại</td>
                  <td style={{ padding: '12px 0', color: 'var(--danger)', fontWeight: 600 }}>{req.returnedReason}</td>
                </tr>
              )}
              {req.rejectedReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do từ chối</td>
                  <td style={{ padding: '12px 0', color: 'var(--danger)', fontWeight: 600 }}>{req.rejectedReason}</td>
                </tr>
              )}
              {req.cancelledReason && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Lý do hủy</td>
                  <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{req.cancelledReason}</td>
                </tr>
              )}

            </tbody>
          </table>
        </div>

        {/* Timeline Lịch sử */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px', color: '#1e3a8a' }}>Lịch sử chuyển trạng thái</h3>
          <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
            <div style={{ position: 'absolute', left: '6px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
            
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có lịch sử trạng thái.</div>
            ) : (
              history.map((h: any) => {
                return (
                  <div key={h.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#6b7280', border: '3px solid var(--bg-card)', zIndex: 10 }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                          {h.action}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Trạng thái: <strong>{h.fromStatus || '---'}</strong> &rarr; <strong>{h.toStatus || '---'}</strong>
                      </div>
                      
                      {h.reason && <div style={{ fontSize: '13px', color: 'var(--danger)', marginTop: '4px' }}>Lý do: {h.reason}</div>}
                      {h.comment && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ghi chú: {h.comment}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Approve Modal */}
      {approveModalOpen && (
        <Modal 
          isOpen={approveModalOpen} 
          onClose={() => { setApproveModalOpen(false); setHandlerType('WORKSHOP'); setAssignedTechnicianIds([]); setSupporterIds([]); setWatcherId(''); }} 
          title={`Phê duyệt yêu cầu: ${req.requestCode}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
              <div><strong>Thiết bị:</strong> {req.equipment?.name} ({req.equipment?.code})</div>
              <div><strong>Bộ phận / Vị trí:</strong> <span className="badge badge-secondary" style={{ marginLeft: '4px' }}>{reqDepartment || 'Chưa cập nhật'}</span></div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Phương án xử lý sự cố *</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: handlerType === 'WORKSHOP' ? '2px solid #2563eb' : '1px solid var(--border-color)', backgroundColor: handlerType === 'WORKSHOP' ? '#eff6ff' : '#ffffff', flex: 1 }}>
                  <input 
                    type="radio" 
                    name="handlerType" 
                    value="WORKSHOP" 
                    checked={handlerType === 'WORKSHOP'} 
                    onChange={() => setHandlerType('WORKSHOP')} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Tự xử lý</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 14px', borderRadius: '8px', border: handlerType === 'EXTERNAL_DEPT' ? '2px solid #2563eb' : '1px solid var(--border-color)', backgroundColor: handlerType === 'EXTERNAL_DEPT' ? '#eff6ff' : '#ffffff', flex: 1 }}>
                  <input 
                    type="radio" 
                    name="handlerType" 
                    value="EXTERNAL_DEPT" 
                    checked={handlerType === 'EXTERNAL_DEPT'} 
                    onChange={() => setHandlerType('EXTERNAL_DEPT')} 
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>Yêu cầu hỗ trợ</span>
                </label>
              </div>
            </div>

            {/* Trường hợp 1: Tự xử lý */}
            {handlerType === 'WORKSHOP' && (
              <>
                {/* Người phụ trách (có thể chọn nhiều) */}
                <div className="form-group">
                  <label className="form-label">Người phụ trách</label>
                  {internalUsers.length > 0 ? (
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                      {internalUsers.map((u: any) => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <input
                            type="checkbox"
                            checked={assignedTechnicianIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignedTechnicianIds(prev => [...prev, u.id]);
                              } else {
                                setAssignedTechnicianIds(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span>{u.name} ({u.specialty || u.role || 'Nhân viên'})</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#b45309', padding: '8px 10px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                      Không có nhân sự thuộc bộ phận "{internalDepartment || reqDepartment}". WO sẽ ở trạng thái Chờ phân công.
                    </div>
                  )}
                  {assignedTechnicianIds.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Đã chọn: {assignedTechnicianIds.length} người</div>
                  )}
                </div>

                {/* Người hỗ trợ (không bắt buộc, có thể chọn nhiều) */}
                {internalUsers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Người hỗ trợ <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>(không bắt buộc)</span></label>
                    <div style={{ maxHeight: '130px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                      {internalUsers.filter((u: any) => !assignedTechnicianIds.includes(u.id)).map((u: any) => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <input
                            type="checkbox"
                            checked={supporterIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSupporterIds(prev => [...prev, u.id]);
                              } else {
                                setSupporterIds(prev => prev.filter(id => id !== u.id));
                              }
                            }}
                          />
                          <span>{u.name} ({u.specialty || u.role || 'Nhân viên'})</span>
                        </label>
                      ))}
                    </div>
                    {supporterIds.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Đã chọn: {supporterIds.length} người</div>
                    )}
                  </div>
                )}

                {/* Người theo dõi (không bắt buộc, 1 người) */}
                {internalUsers.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Người theo dõi <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px' }}>(không bắt buộc)</span></label>
                    <select
                      className="form-select"
                      value={watcherId}
                      onChange={(e) => setWatcherId(e.target.value)}
                    >
                      <option value="">-- Chưa chỉ định --</option>
                      {internalUsers.filter((u: any) => !assignedTechnicianIds.includes(u.id) && !supporterIds.includes(u.id)).map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.specialty || u.role || 'Nhân viên'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Trường hợp 2: Yêu cầu hỗ trợ */}
            {handlerType === 'EXTERNAL_DEPT' && (
              <div className="form-group">
                <label className="form-label">Chọn bộ phận tiếp nhận *</label>
                <select 
                  className="form-select" 
                  value={targetDepartment} 
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  required
                >
                  {externalDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  {externalDepartments.length === 0 && (
                    <option value="xưởng cơ điện">xưởng cơ điện</option>
                  )}
                </select>
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setApproveModalOpen(false); setHandlerType('WORKSHOP'); setAssignedTechnicianIds([]); setSupporterIds([]); setWatcherId(''); }}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleApproveConfirm}
                style={{ fontWeight: 700 }}
              >
                Xác nhận Duyệt & Tạo Phiếu WO
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resubmit Modal */}
      {resubmitModalOpen && (
        <Modal isOpen={resubmitModalOpen} onClose={() => setResubmitModalOpen(false)} title={`Tái gửi yêu cầu ${req.requestCode}`}>
          <div>
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
              <button className="btn btn-secondary" onClick={() => setResubmitModalOpen(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleResubmitConfirm}>
                <Send size={14} /> Tái gửi Yêu cầu
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
