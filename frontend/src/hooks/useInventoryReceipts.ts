import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';

export interface ReceiptItemInput {
  inventoryItemId: string;
  itemCode?: string;
  name?: string;
  unit?: string;
  currentStock?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export function useInventoryReceipts(onRefreshParent?: () => void) {
  const toast = useToast();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Data state
  const [receipts, setReceipts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail & Print modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Master catalog for creating receipts
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Debounce search effect (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // Reset page on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load receipts list
  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getInventoryReceipts({
        search: debouncedSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      });

      if (res && res.data) {
        setReceipts(res.data);
        setTotal(res.meta?.total || 0);
        setTotalPages(res.meta?.totalPages || 1);
      } else {
        setReceipts([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách phiếu nhập:', err);
      toast.error('Lỗi nạp dữ liệu', err.message || 'Không thể tải danh sách phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, startDate, endDate, page, toast]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Load inventory catalog when create modal opens
  const openCreateModal = async () => {
    setIsCreateOpen(true);
    if (catalogItems.length === 0) {
      try {
        const items = await api.getInventory();
        setCatalogItems(items || []);
      } catch (err) {
        console.error('Lỗi nạp danh mục phụ tùng:', err);
      }
    }
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
  };

  // Submit new receipt
  const submitCreateReceipt = async (formData: {
    receiptCode?: string;
    supplierName: string;
    invoiceNumber?: string;
    receivedDate?: string;
    notes?: string;
    items: ReceiptItemInput[];
  }) => {
    if (!formData.items || formData.items.length === 0) {
      toast.error('Thông báo', 'Vui lòng thêm ít nhất một mặt hàng vào phiếu nhập');
      return false;
    }

    try {
      setSubmitting(true);
      await api.createInventoryReceipt({
        receiptCode: formData.receiptCode?.trim() || undefined,
        supplierName: formData.supplierName.trim() || undefined,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        receivedDate: formData.receivedDate || undefined,
        notes: formData.notes?.trim() || undefined,
        items: formData.items.map((it) => ({
          inventoryItemId: it.inventoryItemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
          notes: it.notes?.trim() || undefined,
        })),
      });

      toast.success('Thành công', 'Tạo phiếu nhập kho thành công!');
      closeCreateModal();
      loadReceipts();
      if (onRefreshParent) onRefreshParent();
      return true;
    } catch (err: any) {
      toast.error('Lỗi tạo phiếu nhập', err.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Open & load detail
  const openDetail = async (id: string) => {
    setActiveReceiptId(id);
    setIsDetailOpen(true);
    try {
      setDetailLoading(true);
      const data = await api.getInventoryReceiptDetail(id);
      setReceiptDetail(data);
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể tải chi tiết phiếu nhập kho');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setActiveReceiptId(null);
    setReceiptDetail(null);
  };

  const resetFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return {
    // List state
    receipts,
    total,
    page,
    setPage,
    totalPages,
    loading,
    loadReceipts,

    // Filter state
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    resetFilters,

    // Create modal state & actions
    isCreateOpen,
    openCreateModal,
    closeCreateModal,
    submitting,
    submitCreateReceipt,
    catalogItems,

    // Detail modal state & actions
    isDetailOpen,
    receiptDetail,
    detailLoading,
    openDetail,
    closeDetail,
  };
}
