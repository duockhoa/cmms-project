import React from 'react';
import {
  FileSpreadsheet,
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  Boxes,
  AlertTriangle,
  WalletCards,
} from 'lucide-react';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { KpiCard } from '../common/KpiCard';
import { useStockReport } from '../../hooks/useStockReport';
import { StockLedgerModal } from './modals/StockLedgerModal';

interface StockReportTabProps {
  categories?: any[];
}

export const StockReportTab: React.FC<StockReportTabProps> = ({ categories }) => {
  const {
    summary,
    rows,
    totalRowCount,
    period,
    loading,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    category,
    setCategory,
    search,
    setSearch,
    setQuickPeriod,
    selectedItemForLedger,
    ledgerTransactions,
    ledgerLoading,
    openLedgerModal,
    closeLedgerModal,
    handleExportExcel,
  } = useStockReport(categories);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter and Period Selection */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              placeholder="Lọc theo tên, mã vật tư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

          {/* Quick period buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setQuickPeriod('this_month')}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Tháng này
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setQuickPeriod('last_month')}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Tháng trước
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setQuickPeriod('this_quarter')}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              Quý này
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportExcel}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          title="Tải bảng báo cáo xuất nhập tồn ra Excel"
        >
          <FileSpreadsheet size={16} color="#16a34a" /> Xuất Excel
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        <KpiCard
          title="Tổng mặt hàng"
          value={summary.totalItems}
          icon={Boxes}
          variant="default"
        />
        <KpiCard
          title="Giá trị tồn đầu"
          value={`${(summary.totalOpeningValue || 0).toLocaleString('vi-VN')} đ`}
          icon={WalletCards}
          variant="info"
        />
        <KpiCard
          title="Giá trị nhập kỳ"
          value={`${(summary.totalImportValue || 0).toLocaleString('vi-VN')} đ`}
          icon={TrendingUp}
          variant="success"
        />
        <KpiCard
          title="Giá trị xuất kỳ"
          value={`${(summary.totalExportValue || 0).toLocaleString('vi-VN')} đ`}
          icon={TrendingDown}
          variant="danger"
        />
        <KpiCard
          title="Giá trị tồn cuối"
          value={`${(summary.totalClosingValue || 0).toLocaleString('vi-VN')} đ`}
          icon={WalletCards}
          variant="info"
        />
      </div>

      {/* Report Table */}
      <div className="table-wrapper">
        <table className="custom-table" style={{ fontSize: '12.5px' }}>
          <thead>
            <tr>
              <th style={{ width: '90px' }}>Mã VT</th>
              <th style={{ minWidth: '180px' }}>Tên phụ tùng</th>
              <th style={{ width: '60px', textAlign: 'center' }}>ĐVT</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#f8fafc' }}>Tồn đầu</th>
              <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#f0fdf4', color: '#166534' }}>Nhập</th>
              <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#fef2f2', color: '#991b1b' }}>Xuất</th>
              <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#eff6ff', color: '#1e40af' }}>Tồn cuối</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền cuối</th>
              <th style={{ width: '60px', textAlign: 'center' }}>Thẻ kho</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={8} columns={10} />
            ) : rows.length === 0 ? (
              <EmptyState colSpan={10} title="Không có dữ liệu trong khoảng thời gian này" compact minHeight={180} />
            ) : (
              rows.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>{r.itemCode}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{r.category}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{r.unit}</td>
                  <td style={{ textAlign: 'right' }}>{(r.unitPrice || 0).toLocaleString('vi-VN')} đ</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    {r.openingQuantity}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    {r.importQuantity > 0 ? `+${r.importQuantity}` : 0}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, backgroundColor: '#fef2f2', color: '#dc2626' }}>
                    {r.exportQuantity > 0 ? `-${r.exportQuantity}` : 0}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                    {r.closingQuantity}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>
                    {(r.closingAmount || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openLedgerModal(r)}
                      style={{ padding: '2px 6px', fontSize: '11.5px' }}
                      title="Xem Thẻ kho chi tiết"
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800 }}>
                <td colSpan={4} style={{ textAlign: 'right' }}>Tổng cộng toàn kho:</td>
                <td style={{ textAlign: 'center' }}>---</td>
                <td style={{ textAlign: 'center', color: '#16a34a' }}>---</td>
                <td style={{ textAlign: 'center', color: '#dc2626' }}>---</td>
                <td style={{ textAlign: 'center' }}>---</td>
                <td style={{ textAlign: 'right', color: '#0f766e', fontSize: '13.5px' }}>
                  {(summary.totalClosingValue || 0).toLocaleString('vi-VN')} đ
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* MODAL: THẺ KHO CHI TIẾT */}
      <StockLedgerModal
        isOpen={Boolean(selectedItemForLedger)}
        onClose={closeLedgerModal}
        item={selectedItemForLedger}
        transactions={ledgerTransactions}
        loading={ledgerLoading}
      />
    </div>
  );
};
