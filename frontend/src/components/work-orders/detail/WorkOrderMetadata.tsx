import React from 'react';

export const WorkOrderMetadata: React.FC<any> = ({
  allUsers, getStatusColor, getStatusLabel, wo,
}) => (
  <>
    {/* Metadata Table */}
    <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', width: '25%', color: 'var(--text-secondary)' }}>Mã lệnh sửa chữa</td>
            <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo.orderCode}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mã thiết bị</td>
            <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo.equipment?.code} - {wo.equipment?.name}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
            <td style={{ padding: '12px 0' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(wo.status) }}></span>
                <span style={{ fontWeight: 700, color: getStatusColor(wo.status) }}>{getStatusLabel(wo.status)}</span>
              </div>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tuyến xử lý</td>
            <td style={{ padding: '12px 0', fontWeight: 600 }}>{wo?.handlingRoute === 'WORKSHOP_SELF_HANDLE' ? 'Xưởng tự xử lý' : 'Cơ điện sửa chữa'}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</td>
            <td style={{ padding: '12px 0' }}>
              <span className={`badge badge-${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'danger' : 'warning'}`}>
                {wo.priority}
              </span>
            </td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người yêu cầu</td>
            <td style={{ padding: '12px 0' }}>{wo.request?.reporterName || 'Hệ thống'} ({wo.request?.department || 'Cơ điện'})</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người phụ trách</td>
            <td style={{ padding: '12px 0' }}>
              {(() => {
                const ids: string[] = Array.isArray(wo.assignedTechnicianIds) ? wo.assignedTechnicianIds : [];
                if (ids.length > 0 && allUsers.length > 0) {
                  return ids.map((tid: string) => {
                    const u = allUsers.find((user: any) => user.id === tid);
                    return u ? u.name : tid;
                  }).join(', ');
                }
                return wo.technicianName || 'Chưa phân công';
              })()}
            </td>
          </tr>
          {Array.isArray(wo.supporterIds) && wo.supporterIds.length > 0 && (
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người hỗ trợ</td>
              <td style={{ padding: '12px 0' }}>
                {wo.supporterIds.map((sid: string) => {
                  const u = allUsers.find((user: any) => user.id === sid);
                  return u ? u.name : sid;
                }).join(', ')}
              </td>
            </tr>
          )}
          {wo.watcherId && (
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người theo dõi</td>
              <td style={{ padding: '12px 0' }}>
                {(() => {
                  const u = allUsers.find((user: any) => user.id === wo.watcherId);
                  return u ? u.name : wo.watcherId;
                })()}
              </td>
            </tr>
          )}
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Ngày tạo</td>
            <td style={{ padding: '12px 0' }}>{new Date(wo.createdAt).toLocaleString('vi-VN')}</td>
          </tr>
          {(() => {
            const isSchedule = Boolean(wo.scheduleId || (wo.title && wo.title.startsWith('[Định kỳ]')));
            return (
              <>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>{isSchedule ? 'Mô tả công việc' : 'Mô tả sự cố'}</td>
                  <td style={{ padding: '12px 0' }}>{wo.description}</td>
                </tr>
                {!isSchedule && wo.classificationResult && (
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Kết quả phân loại</td>
                    <td style={{ padding: '12px 0' }}>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>{wo.classificationResult === 'WORKSHOP_CONTINUE' ? 'Tự xử lý' : 'Yêu cầu hỗ trợ'}</span>
                      {wo.classificationNotes && <div style={{ fontSize: '13px', marginTop: '4px' }}>Ghi chú: {wo.classificationNotes}</div>}
                    </td>
                  </tr>
                )}
              </>
            );
          })()}
        </tbody>
      </table>
    </div>

    {/* Incident Image */}
    {wo.request?.images && JSON.parse(wo.request.images).length > 0 && (
      <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Hình ảnh sự cố ban đầu</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {JSON.parse(wo.request.images).map((imgUrl: string, idx: number) => (
            <a key={idx} href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px' }}>
              <img src={imgUrl} alt="Initial incident" style={{ maxHeight: '120px', maxWidth: '200px', objectFit: 'contain', borderRadius: '4px' }} />
            </a>
          ))}
        </div>
      </div>
    )}
  </>
);
