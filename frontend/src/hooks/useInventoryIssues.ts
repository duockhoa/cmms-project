import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';

export function useInventoryIssues(onRefreshParent?: () => void) {
  const toast = useToast();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal Direct Issue State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load all export transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getWorkOrderInventoryTransactions('all');
      const allTx = Array.isArray(res) ? res : res?.data || [];

      // Lọc các giao dịch thuộc nhóm xuất
      const issueTypes = new Set(['ISSUE', 'ISSUE_WORK_ORDER', 'ISSUE_FABRICATION', 'ISSUE_INTERNAL', 'ADJUST_OUT']);
      const issues = allTx.filter((t: any) => issueTypes.has(t.transactionType));
      setTransactions(issues);
    } catch (err: any) {
      console.error('Lỗi tải lịch sử xuất kho:', err);
      toast.error('Lỗi nạp dữ liệu', err.message || 'Không thể tải lịch sử xuất kho');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Open Direct Issue Modal & load items
  const openIssueModal = async () => {
    setIsIssueModalOpen(true);
    if (inventoryList.length === 0) {
      try {
        const items = await api.getInventory();
        setInventoryList(items || []);
      } catch (err) {
        console.error('Lỗi tải danh mục vật tư:', err);
      }
    }
  };

  const closeIssueModal = () => {
    setIsIssueModalOpen(false);
  };

  // Submit direct issue
  const submitDirectIssue = async (data: {
    inventoryItemId: string;
    quantity: number;
    reason: string;
    referenceCode?: string;
  }) => {
    try {
      setSubmitting(true);
      await api.directIssueInventory(data);
      toast.success('Thành công', 'Xuất kho thành công!');
      closeIssueModal();
      loadTransactions();
      if (onRefreshParent) onRefreshParent();
      return true;
    } catch (err: any) {
      toast.error('Lỗi xuất kho', err.message || 'Có lỗi xảy ra khi xuất kho');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transactions with useMemo
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'ALL' || t.transactionType === filterType;
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        !q ||
        t.inventoryItem?.name?.toLowerCase().includes(q) ||
        t.inventoryItem?.itemCode?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q) ||
        t.referenceCode?.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [transactions, filterType, debouncedSearch]);

  return {
    transactions: filteredTransactions,
    rawCount: transactions.length,
    loading,
    loadTransactions,

    // Filters
    search,
    setSearch,
    filterType,
    setFilterType,

    // Issue Modal
    isIssueModalOpen,
    openIssueModal,
    closeIssueModal,
    inventoryList,
    submitting,
    submitDirectIssue,
  };
}
