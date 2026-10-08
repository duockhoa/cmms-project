import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { useExportExcel } from './useExportExcel';

export function useStockReport(initialCategories?: any[]) {
  const toast = useToast();
  const { exportData } = useExportExcel();

  // Mặc định từ ngày 1 của tháng hiện tại đến ngày hôm nay
  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
    return {
      start: toDateStr(firstDay),
      end: toDateStr(now),
    };
  };

  const initialRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [category, setCategory] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Report Data State
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Stock Ledger Modal State
  const [selectedItemForLedger, setSelectedItemForLedger] = useState<any | null>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Report
  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getInventoryReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        category: category !== 'ALL' ? category : undefined,
        location: location !== 'ALL' ? location : undefined,
      });
      setReportData(res);
    } catch (err: any) {
      console.error('Lỗi nạp báo cáo tồn kho:', err);
      toast.error('Lỗi nạp dữ liệu', err.message || 'Không thể tải báo cáo xuất nhập tồn');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, category, location, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Quick period selectors
  const setQuickPeriod = (type: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') => {
    const now = new Date();
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

    if (type === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(now));
    } else if (type === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(end));
    } else if (type === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(now));
    } else if (type === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      setStartDate(toDateStr(start));
      setEndDate(toDateStr(now));
    }
  };

  // Filtered Rows with debounced search
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!debouncedSearch) return reportData.rows;

    return reportData.rows.filter(
      (r: any) =>
        r.name?.toLowerCase().includes(debouncedSearch) ||
        r.itemCode?.toLowerCase().includes(debouncedSearch) ||
        r.category?.toLowerCase().includes(debouncedSearch) ||
        r.location?.toLowerCase().includes(debouncedSearch)
    );
  }, [reportData, debouncedSearch]);

  // Open & load Stock Ledger
  const openLedgerModal = async (row: any) => {
    setSelectedItemForLedger(row);
    try {
      setLedgerLoading(true);
      const allTxRes = await api.getWorkOrderInventoryTransactions('all');
      const allTx = Array.isArray(allTxRes) ? allTxRes : allTxRes?.data || [];

      // Lọc các giao dịch của mặt hàng này
      const itemTx = allTx.filter((t: any) => t.inventoryItemId === row.id);
      itemTx.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setLedgerTransactions(itemTx);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể tải chi tiết thẻ kho');
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedgerModal = () => {
    setSelectedItemForLedger(null);
    setLedgerTransactions([]);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Thông báo', 'Không có dữ liệu để xuất file Excel');
      return;
    }

    const dataToExport = filteredRows.map((r: any, idx: number) => ({
      STT: idx + 1,
      'Mã vật tư': r.itemCode,
      'Tên phụ tùng': r.name,
      'Phân loại': r.category,
      ĐVT: r.unit,
      'Vị trí kệ': r.location,
      'Đơn giá (đ)': r.unitPrice,
      'Tồn đầu kỳ': r.openingQuantity,
      'Thành tiền đầu (đ)': r.openingAmount,
      'Nhập trong kỳ': r.importQuantity,
      'Thành tiền nhập (đ)': r.importAmount,
      'Xuất trong kỳ': r.exportQuantity,
      'Thành tiền xuất (đ)': r.exportAmount,
      'Tồn cuối kỳ': r.closingQuantity,
      'Thành tiền cuối (đ)': r.closingAmount,
      'Định mức tối thiểu': r.minQuantity,
      'Cảnh báo tồn': r.isOutOfStock ? 'Hết hàng' : r.isLowStock ? 'Sắp hết' : 'An toàn',
    }));

    exportData(
      () => ({
        filename: `Bao_Cao_XNT_Vat_Tu_${startDate}_den_${endDate}.csv`,
        data: dataToExport,
      }),
      `Bao_Cao_XNT_Vat_Tu_${startDate}_den_${endDate}.csv`
    );
  };

  return {
    // Report Data
    summary: reportData?.summary || {
      totalItems: 0,
      totalOpeningValue: 0,
      totalImportValue: 0,
      totalExportValue: 0,
      totalClosingValue: 0,
      lowStockCount: 0,
    },
    rows: filteredRows,
    totalRowCount: reportData?.rows?.length || 0,
    period: reportData?.period,
    loading,
    loadReport,

    // Filters
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    category,
    setCategory,
    location,
    setLocation,
    search,
    setSearch,
    setQuickPeriod,

    // Ledger
    selectedItemForLedger,
    ledgerTransactions,
    ledgerLoading,
    openLedgerModal,
    closeLedgerModal,

    // Export
    handleExportExcel,
  };
}
