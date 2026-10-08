import React from 'react';
import { Plus, Search, Eye, FileDown } from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { useInventoryReceipts } from '../../hooks/useInventoryReceipts';
import { CreateReceiptModal } from './modals/CreateReceiptModal';
import { ReceiptDetailModal } from './modals/ReceiptDetailModal';

interface ReceiptsTabProps {
  inventoryItems?: any[];
  onRefreshInventory?: () => void;
}

export const ReceiptsTab: React.FC<ReceiptsTabProps> = ({ onRefreshInventory }) => {
  const {
    receipts,
    total,
    page,
    setPage,
    totalPages,
    loading,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    resetFilters,
    isCreateOpen,
    openCreateModal,
    closeCreateModal,
    submitting,
    submitCreateReceipt,
    catalogItems,
    isDetailOpen,
    receiptDetail,
    detailLoading,
    openDetail,
    closeDetail,
  } = useInventoryReceipts(onRefreshInventory);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Action & Filter Bar */}
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
              placeholder="Tìm theo mã phiếu, NCC, hóa đơn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="form-input"
              style={{ height: '36px', fontSize: '12.5px', width: '135px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Từ ngày"
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input
              type="date"
              className="form-input"
              style={{ height: '36px', fontSize: '12.5px', width: '135px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Đến ngày"
            />
          </div>

          {(search || startDate || endDate) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetFilters}
            >
              Đặt lại
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateModal}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
        >
          <Plus size={16} /> Tạo phiếu nhập kho
        </button>
      </div>

      {/* Receipts Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '140px' }}>Mã phiếu</th>
              <th style={{ width: '120px' }}>Ngày nhập</th>
              <th style={{ minWidth: '180px' }}>Nhà cung cấp</th>
              <th style={{ width: '130px' }}>Số hóa đơn</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Số mặt hàng</th>
              <th style={{ width: '140px', textAlign: 'right' }}>Tổng tiền (VNĐ)</th>
              <th style={{ width: '150px' }}>Người lập phiếu</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={5} columns={8} />
            ) : receipts.length === 0 ? (
              <EmptyState
                colSpan={8}
                title="Chưa có phiếu nhập kho nào"
                description="Bấm 'Tạo phiếu nhập kho' để nhập hàng mới theo lô từ Nhà cung cấp."
                compact
                minHeight={180}
              />
            ) : (
              receipts.map((rc) => (
                <tr key={rc.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                    {rc.receiptCode}
                  </td>
                  <td style={{ fontSize: '12.5px' }}>
                    {rc.receivedDate ? new Date(rc.receivedDate).toLocaleDateString('vi-VN') : '---'}
                  </td>
                  <td style={{ fontWeight: 600, color: '#1e293b' }}>
                    {rc.supplierName || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Mua lẻ / Nội bộ</span>}
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>
                    {rc.invoiceNumber || '---'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '11.5px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 700,
                      }}
                    >
                      {(rc.items || []).length} mục
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                    {(rc.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ fontSize: '12px', color: '#334155' }}>
                    {rc.createdBy?.name || 'Thủ kho'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openDetail(rc.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                      title="Xem chi tiết & In phiếu"
                    >
                      <Eye size={13} /> Xem
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#64748b' }}>
            Tổng cộng: <strong>{total}</strong> phiếu nhập
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </button>
            <span style={{ padding: '4px 8px', color: '#334155', fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* MODAL TẠO PHIẾU NHẬP */}
      <CreateReceiptModal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        onSubmit={submitCreateReceipt}
        submitting={submitting}
        catalogItems={catalogItems}
      />

      {/* MODAL CHI TIẾT & IN PHIẾU */}
      <ReceiptDetailModal
        isOpen={isDetailOpen}
        onClose={closeDetail}
        receipt={receiptDetail}
        loading={detailLoading}
      />
    </div>
  );
};
