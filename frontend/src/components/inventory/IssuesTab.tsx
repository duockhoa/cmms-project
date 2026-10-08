import React from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { useInventoryIssues } from '../../hooks/useInventoryIssues';
import { CreateIssueModal } from './modals/CreateIssueModal';

interface IssuesTabProps {
  inventoryItems?: any[];
  onRefreshInventory?: () => void;
}

export const IssuesTab: React.FC<IssuesTabProps> = ({ onRefreshInventory }) => {
  const {
    transactions,
    loading,
    search,
    setSearch,
    filterType,
    setFilterType,
    isIssueModalOpen,
    openIssueModal,
    closeIssueModal,
    inventoryList,
    submitting,
    submitDirectIssue,
  } = useInventoryIssues(onRefreshInventory);

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'ISSUE_WORK_ORDER':
      case 'ISSUE':
        return { label: 'Bảo trì (Work Order)', bg: '#fee2e2', color: '#991b1b' };
      case 'ISSUE_FABRICATION':
        return { label: 'Gia công & Chế tạo', bg: '#ffedd5', color: '#9a3412' };
      case 'ISSUE_INTERNAL':
        return { label: 'Xuất dùng nội bộ', bg: '#fef3c7', color: '#92400e' };
      case 'ADJUST_OUT':
        return { label: 'Kiểm kê giảm', bg: '#f1f5f9', color: '#475569' };
      default:
        return { label: type, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              placeholder="Tìm theo tên, mã vật tư, lệnh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ height: '36px', fontSize: '13px', width: '200px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Tất cả mục đích xuất</option>
            <option value="ISSUE_WORK_ORDER">Sửa chữa bảo trì (WO)</option>
            <option value="ISSUE_FABRICATION">Gia công & chế tạo (GC)</option>
            <option value="ISSUE_INTERNAL">Xuất trực tiếp nội bộ</option>
            <option value="ADJUST_OUT">Kiểm kê cân đối giảm</option>
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openIssueModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          <ArrowUpRight size={16} /> Xuất kho nội bộ / trực tiếp
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Thời gian</th>
              <th style={{ width: '100px' }}>Mã VT</th>
              <th style={{ minWidth: '220px' }}>Tên phụ tùng</th>
              <th style={{ width: '130px' }}>Mục đích</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Số lượng</th>
              <th style={{ minWidth: '180px' }}>Chi tiết / Mã phiếu</th>
              <th style={{ width: '140px' }}>Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : transactions.length === 0 ? (
              <EmptyState
                colSpan={7}
                title="Chưa có dữ liệu xuất kho"
                description="Các giao dịch xuất dùng cho sửa chữa thiết bị, gia công chế tạo hoặc xuất nội bộ sẽ hiển thị tại đây."
                compact
                minHeight={180}
              />
            ) : (
              transactions.map((tx) => {
                const badge = getTxTypeBadge(tx.transactionType);
                return (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '---'}
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                      {tx.inventoryItem?.itemCode || tx.inventoryItemId?.slice(0, 8)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.inventoryItem?.name || tx.reference}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Tồn trước: {tx.quantityBefore} &rarr; Sau: {tx.quantityAfter}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11.5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                      -{tx.quantity} {tx.inventoryItem?.unit || ''}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{tx.reference || 'Xuất kho'}</div>
                      {tx.reason && <div style={{ fontSize: '11.5px', color: '#64748b' }}>Lý do: {tx.reason}</div>}
                    </td>
                    <td style={{ fontSize: '12px', color: '#334155' }}>
                      {tx.actedBy?.name || 'Thủ kho'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: XUẤT KHO NỘI BỘ */}
      <CreateIssueModal
        isOpen={isIssueModalOpen}
        onClose={closeIssueModal}
        onSubmit={submitDirectIssue}
        submitting={submitting}
        inventoryList={inventoryList}
      />
    </div>
  );
};
