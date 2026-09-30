import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, Clock, User, MapPin } from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common';
import { FabricationJobItem } from '../../hooks/useFabricationPage';
import { usePermissions } from '../../hooks/usePermissions';

interface FabricationTableProps {
  jobs: FabricationJobItem[];
  loading: boolean;
  onSelectJob?: (job: FabricationJobItem) => void;
  onDeleteJob: (id: string) => void;
}

export const FabricationTable: React.FC<FabricationTableProps> = ({
  jobs,
  loading,
  onSelectJob,
  onDeleteJob,
}) => {
  const navigate = useNavigate();
  const { can, isAdmin } = usePermissions();
  const canDelete = isAdmin || can('fabrication:delete');
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FABRICATION':
        return 'Gia công chi tiết';
      case 'NEW_MAKING':
        return 'Chế tạo mới';
      case 'MODIFICATION':
        return 'Cải tiến / Kaizen';
      case 'INSTALLATION':
        return 'Lắp đặt & Di dời';
      case 'INFRASTRUCTURE':
        return 'Hạ tầng xưởng';
      default:
        return 'Khác';
    }
  };

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat) {
      case 'FABRICATION':
        return { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
      case 'NEW_MAKING':
        return { backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
      case 'MODIFICATION':
        return { backgroundColor: '#fdf4ff', color: '#86198f', border: '1px solid #f5d0fe' };
      case 'INSTALLATION':
        return { backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
      case 'INFRASTRUCTURE':
        return { backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  const handleRowClick = (job: FabricationJobItem) => {
    if (onSelectJob) {
      onSelectJob(job);
    } else {
      navigate(`/fabrication/${job.id}`);
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Mã phiếu</th>
              <th style={{ minWidth: '220px' }}>Tên công việc / Sản phẩm</th>
              <th style={{ width: '140px' }}>Phân loại</th>
              <th style={{ width: '150px' }}>Khu vực / Bộ phận</th>
              <th style={{ width: '150px' }}>Thợ phụ trách</th>
              <th style={{ width: '110px' }}>Hạn hoàn thành</th>
              <th style={{ width: '100px' }}>Giờ công</th>
              <th style={{ width: '120px' }}>Vật tư (VNĐ)</th>
              <th style={{ width: '120px' }}>Trạng thái</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={10} rows={5} />
            ) : jobs.length === 0 ? (
              <EmptyState
                colSpan={10}
                compact
                minHeight={160}
                title="Chưa có công việc gia công hoặc chế tạo nào"
                description="Bấm 'Tạo công việc' để phân công trực tiếp cho đội cơ điện"
              />
            ) : (
              jobs.map((job) => (
                <tr key={job.id} style={{ transition: 'background-color 0.15s ease' }}>
                  {/* 1. Mã phiếu */}
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRowClick(job)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                      title="Mở chi tiết phiếu"
                    >
                      {job.orderCode}
                    </button>
                    <div style={{ marginTop: '2px' }}>
                      <StatusBadge status={job.priority} />
                    </div>
                  </td>

                  {/* 2. Tên công việc & mô tả */}
                  <td>
                    <div
                      onClick={() => handleRowClick(job)}
                      style={{
                        fontWeight: 700,
                        fontSize: '13.5px',
                        color: 'var(--text-primary)',
                        marginBottom: '3px',
                        cursor: 'pointer',
                      }}
                      title="Mở trang chi tiết & báo cáo"
                    >
                      {job.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={job.description}
                    >
                      {job.description}
                    </div>
                    {job.equipment && (
                      <span style={{ fontSize: '11px', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                        Máy: {job.equipment.name}
                      </span>
                    )}
                  </td>

                  {/* 3. Phân loại */}
                  <td>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-block',
                        ...getCategoryBadgeStyle(job.category),
                      }}
                    >
                      {getCategoryLabel(job.category)}
                    </span>
                  </td>

                  {/* 4. Khu vực / Bộ phận */}
                  <td>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                      {job.location || 'Chưa định vị'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {job.targetDepartment || 'Toàn xưởng'}
                    </div>
                  </td>

                  {/* 5. Thợ phụ trách */}
                  <td>
                    {job.assignedTechnician ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {job.assignedTechnician.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{job.assignedTechnician.name}</span>
                            {(() => {
                              try {
                                const s = typeof job.supporterIds === 'string' ? JSON.parse(job.supporterIds) : job.supporterIds;
                                if (Array.isArray(s) && s.length > 0) {
                                  return (
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#2563eb',
                                        backgroundColor: '#eff6ff',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        border: '1px solid #bfdbfe',
                                        fontWeight: 700,
                                      }}
                                      title={`Phụ trách chung: ${s.length} người hỗ trợ`}
                                    >
                                      +{s.length}
                                    </span>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </div>
                          {job.assignedTechnician.specialty && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {job.assignedTechnician.specialty}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Chưa phân công
                      </span>
                    )}
                  </td>

                  {/* 6. Hạn hoàn thành */}
                  <td style={{ fontSize: '12px' }}>
                    {job.plannedEndDate ? (
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {new Date(job.plannedEndDate).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>---</span>
                    )}
                  </td>

                  {/* 7. Giờ công */}
                  <td style={{ fontSize: '12px' }}>
                    <div>
                      TT: <strong style={{ color: '#2563eb' }}>{job.actualHours || 0}h</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      DK: {job.estimatedHours || 0}h
                    </div>
                  </td>

                  {/* 8. Chi phí vật tư */}
                  <td style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f766e' }}>
                    {job.totalCost ? `${job.totalCost.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </td>

                  {/* 9. Trạng thái */}
                  <td>
                    <StatusBadge status={job.status} />
                  </td>

                  {/* 10. Thao tác */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRowClick(job)}
                        style={{ fontSize: '11.5px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="Ghi nhận tiến độ & Báo cáo nghiệm thu"
                      >
                        <Eye size={13} /> Chi tiết
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteJob(job.id);
                          }}
                          style={{ fontSize: '11.5px', padding: '4px 6px', color: '#ef4444' }}
                          title="Xóa phiếu"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
