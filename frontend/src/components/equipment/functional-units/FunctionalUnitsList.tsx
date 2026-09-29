import React from 'react';
import {
  AlertCircle, AlertTriangle, BookOpen, CheckCircle2, Copy,
  Cpu, Edit, Plus, RefreshCw, Trash2,
} from 'lucide-react';
import { KpiCard } from '../../common';

export const FunctionalUnitsList: React.FC<any> = ({
  handleOpenAddModal, handleOpenCloneModal, handleOpenEditModal, incidentCount,
  loadData, loading, operationalCount, renderStatusBadge, setUnitToDelete,
  totalCount, units, warningCount,
}) => (
  <>
      {/* Thẻ KPI tổng kết nhanh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <KpiCard title="Tổng cụm chức năng" value={totalCount} icon={Cpu} variant="primary" />
        <KpiCard title="Hoạt động tốt" value={operationalCount} icon={CheckCircle2} variant="success" />
        <KpiCard title="Cần theo dõi" value={warningCount} icon={AlertTriangle} variant="warning" />
        <KpiCard title="Sự cố / Hỏng" value={incidentCount} icon={AlertCircle} variant="danger" />
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Danh sách cụm chức năng chính
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Quản lý các bộ phận, cụm cơ cấu chính cấu thành máy và liên kết với thư viện chuẩn
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={loadData}
              className="btn btn-secondary btn-sm"
              title="Làm mới dữ liệu"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
            </button>
            <button 
              onClick={handleOpenCloneModal}
              className="btn btn-outline-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              title="Sao chép các cụm chức năng từ thiết bị tương tự"
            >
              <Copy size={14} /> Sao chép từ máy khác
            </button>
            <button 
              onClick={handleOpenAddModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={15} /> Thêm cụm chức năng
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Đang tải danh sách cụm chức năng...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '150px' }}>Mã cụm</th>
                  <th style={{ minWidth: '220px' }}>Tên cụm chức năng</th>
                  <th style={{ width: '170px' }}>Trạng thái</th>
                  <th style={{ minWidth: '250px' }}>Mô tả / Thông số phụ trách</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 16px' }}>
                      <Cpu size={36} style={{ margin: '0 auto 10px', opacity: 0.35, display: 'block' }} />
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Chưa có cụm chức năng chính nào
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Bạn có thể chọn từ Thư viện mẫu có sẵn hoặc sao chép nhanh từ máy tương tự khác.
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={handleOpenCloneModal}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <Copy size={13} style={{ marginRight: '4px' }} /> Sao chép từ máy khác
                        </button>
                        <button 
                          onClick={handleOpenAddModal}
                          className="btn btn-primary btn-sm"
                        >
                          <Plus size={13} style={{ marginRight: '4px' }} /> Thêm cụm từ Thư viện
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : units.map((u, idx) => (
                  <tr key={u.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {u.code || '---'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {u.name}
                      </div>
                      {u.libraryItem && (
                        <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <BookOpen size={11} /> Thư viện chuẩn: {u.libraryItem.category ? `[${u.libraryItem.category}]` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      {renderStatusBadge(u.status)}
                    </td>
                    <td style={{ color: u.description ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {u.description || 'Chưa có mô tả'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Chỉnh sửa cụm chức năng"
                          style={{ padding: '4px 7px' }}
                          onClick={() => handleOpenEditModal(u)}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Xóa cụm chức năng"
                          style={{ padding: '4px 7px' }}
                          onClick={() => setUnitToDelete(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  </>
);
