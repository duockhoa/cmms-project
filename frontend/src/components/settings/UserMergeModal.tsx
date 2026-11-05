import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';

export function UserMergeModal({ users, initialSourceId = '', onClose, onMerged }: {
  users: any[]; initialSourceId?: string; onClose: () => void; onMerged: (result: any) => void;
}) {
  const [sourceId, setSourceId] = useState(initialSourceId);
  const [targetId, setTargetId] = useState('');
  const [search, setSearch] = useState('');
  const [review, setReview] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);
  const invalidate = () => { generation.current++; setReview(null); setConfirmed(false); setError(''); };
  const options = users.filter(user => !user.mergedIntoId && (
    user.id === sourceId || user.id === targetId ||
    `${user.name} ${user.email} ${user.hrmId || ''} ${user.id}`.toLowerCase().includes(search.toLowerCase())
  ));
  const preview = async () => {
    const current = ++generation.current;
    setBusy(true); setError(''); setReview(null); setConfirmed(false);
    try {
      const result = await api.previewUserMerge(sourceId, targetId);
      if (current === generation.current) setReview(result);
    } catch (failure: any) { if (current === generation.current) setError(failure.message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const merge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review?.previewId || !confirmed || busy) return;
    setBusy(true); setError('');
    try { onMerged(await api.confirmUserMerge({ previewId: review.previewId, reason, evidence, confirmed })); }
    catch (failure: any) { setError(failure.message); setReview(null); setConfirmed(false); }
    finally { setBusy(false); }
  };
  return <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Gộp tài khoản thủ công" maxWidth="900px">
    <form onSubmit={merge} style={{ display: 'grid', gap: 16 }}>
      <p>Chỉ gộp khi đã xác minh hai tài khoản thuộc cùng một người. Tài khoản nguồn sẽ bị khóa; tài khoản đích giữ nguyên quyền và ID HRM.</p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, display: 'grid', gap: 12 }}>
        <label>Tìm nhân sự theo tên, email, ID HRM hoặc ID nội bộ
          <input className="form-input" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <label>Tài khoản nguồn — ngừng sử dụng
            <select className="form-input" value={sourceId} onChange={event => { invalidate(); setSourceId(event.target.value); }}>
              <option value="">Chọn tài khoản nguồn</option>
              {options.map(user => <option key={user.id} value={user.id}>{user.name} — {user.email} — HRM: {user.hrmId || 'chưa liên kết'} — ID: {user.id}</option>)}
            </select>
          </label>
          <label>Tài khoản đích — tiếp tục sử dụng
            <select className="form-input" value={targetId} onChange={event => { invalidate(); setTargetId(event.target.value); }}>
              <option value="">Chọn tài khoản đích</option>
              {options.filter(user => user.id !== sourceId && user.isActive !== false).map(user => <option key={user.id} value={user.id}>{user.name} — {user.email} — HRM: {user.hrmId || 'chưa liên kết'} — ID: {user.id}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="btn btn-secondary" disabled={!sourceId || !targetId || sourceId === targetId} onClick={preview}>
          {busy ? 'Đang xử lý...' : 'Xem trước tác động'}
        </button>
      </fieldset>
      {error && <div role="alert" style={{ color: 'var(--danger)' }}>{error}</div>}
      {review && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[['Nguồn', review.source], ['Đích', review.target]].map(([label, user]: any) => <div className="card" style={{ padding: 12 }} key={label}>
            <strong>{label}: {user.name}</strong>
            <div>{user.email}</div><div>ID: {user.id}</div><div>HRM: {user.hrmId || 'chưa liên kết'}</div>
            <div>Bộ phận: {user.department || 'chưa có'} · Vai trò: {user.role}</div>
            <div>Quyền riêng: {user.customPermissions || 'không có'}</div>
          </div>)}
        </div>
        {review.blockers.length > 0 ? <div role="alert" style={{ color: 'var(--danger)' }}>
          <strong>Chưa thể gộp</strong><ul>{review.blockers.map((message: string) => <li key={message}>{message}</li>)}</ul>
        </div> : <>
          <p>Ảnh hưởng <strong>{review.totalRecords} bản ghi / {review.totalReferences} liên kết</strong>. Bản xem trước hết hạn lúc {new Date(review.expiresAt).toLocaleTimeString('vi-VN')}.</p>
          <div className="table-wrapper"><table className="custom-table">
            <thead><tr><th>Nhóm dữ liệu</th><th>Liên kết</th><th>Số lượng</th><th>ID mẫu</th></tr></thead>
            <tbody>{review.impact.map((item: any) => <tr key={`${item.model}.${item.field}`}><td>{item.model}</td><td>{item.field}</td><td>{item.count}</td><td style={{ overflowWrap: 'anywhere' }}>{item.sampleIds.join(', ')}</td></tr>)}</tbody>
          </table></div>
          <p>{review.policy}</p>
          <p>Email nguồn được lưu trong hồ sơ gộp, rồi đổi thành <strong>{review.archivedEmail}</strong> để giải phóng email cũ. Họ tên snapshot trong lịch sử giữ nguyên; ID liên kết được chuyển sang đích và từng thay đổi có dấu vết.</p>
          <label>Lý do gộp (ít nhất 10 ký tự)
            <textarea className="form-input" value={reason} required minLength={10} maxLength={2000} disabled={busy} onChange={event => setReason(event.target.value)} />
          </label>
          <label>Bằng chứng xác nhận cùng người (mã nhân viên, hồ sơ hoặc mã phiếu đối soát)
            <textarea className="form-input" value={evidence} required minLength={10} maxLength={2000} disabled={busy} onChange={event => setEvidence(event.target.value)} />
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />
            Tôi đã đối soát cùng một người và đồng ý chuyển các liên kết trên sang {review.target.name} ({review.target.email}). Quyền nguồn không được cộng sang đích.
          </label>
        </>}
      </>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Đóng</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !review?.previewId || !confirmed || reason.trim().length < 10 || evidence.trim().length < 10}>
          {busy ? 'Đang xử lý...' : 'Xác nhận gộp tài khoản'}
        </button>
      </div>
    </form>
  </Modal>;
}

export function UserMergeHistoryModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [history, setHistory] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getUserMergeHistory(user.id).then(result => { if (active) setHistory(result); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [user.id]);
  return <Modal isOpen onClose={onClose} title={`Lịch sử gộp: ${user.name}`} maxWidth="850px">
    {error && <p role="alert">{error}</p>}
    {!history && !error && <p>Đang tải lịch sử...</p>}
    {history?.length === 0 && <p>Chưa có lần gộp nào.</p>}
    {history?.map(audit => <div className="card" key={audit.id} style={{ padding: 14, marginBottom: 12 }}>
      <strong>{audit.sourceSnapshot.name} ({audit.sourceUserId}) → {audit.targetSnapshot.name} ({audit.targetUserId})</strong>
      <p>Thời điểm: {new Date(audit.createdAt).toLocaleString('vi-VN')} · Người thực hiện: {audit.actorUserId}</p>
      <p>Lý do: {audit.reason}</p><p>Bằng chứng: {audit.evidence}</p>
      <p>Email nguồn trước gộp: {audit.sourceSnapshot.email} · Mã thao tác: {audit.id}</p>
      <MergeAuditChanges auditId={audit.id} />
    </div>)}
  </Modal>;
}

function MergeAuditChanges({ auditId }: { auditId: string }) {
  const [changes, setChanges] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true); setError('');
    try { setChanges((await api.getUserMergeAudit(auditId)).changes); }
    catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div>
    {!changes && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={load}>{busy ? 'Đang tải...' : 'Xem các liên kết đã chuyển'}</button>}
    {error && <p role="alert">{error}</p>}
    {changes && <details open><summary>{changes.length} liên kết</summary>
      <pre style={{ maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(changes, null, 2)}</pre>
    </details>}
  </div>;
}
