import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFeedbacks({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchTerm.trim() || undefined,
      });
      setFeedbacks(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error('Lỗi khi tải danh sách góp ý/báo lỗi:', err);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const resetFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchTerm('');
  }, []);

  // Status stats
  const totalCount = feedbacks.length;
  const pendingCount = feedbacks.filter(f => f.status === 'PENDING').length;
  const inProgressCount = feedbacks.filter(f => f.status === 'IN_PROGRESS').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'RESOLVED' || f.status === 'CLOSED').length;

  return {
    feedbacks,
    loading,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    searchTerm,
    setSearchTerm,
    resetFilters,
    fetchFeedbacks,

    // Modals & Overlays
    isCreateModalOpen,
    setIsCreateModalOpen,
    selectedFeedback,
    setSelectedFeedback,
    previewImage,
    setPreviewImage,

    // Statistics
    stats: {
      totalCount,
      pendingCount,
      inProgressCount,
      resolvedCount,
    },
  };
}
