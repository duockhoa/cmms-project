import { useState, useEffect, useCallback } from 'react';
import { api, API_HOST as API_BASE } from '../services/api';
import { useToast } from '../components/common/Toast';

export function useEquipmentDetail(itemId: string) {
  const [activeSubTab, setActiveSubTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);
  const toast = useToast();

  // States for Specs management (Dynamic multi-row inputs)
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [tempSpecs, setTempSpecs] = useState<{ key: string; val: string }[]>([]);

  // States for Spare Parts mapping
  const [showPartModal, setShowPartModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partMinQty, setPartMinQty] = useState(1);

  // States for SOP Preview
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const fetchDetail = useCallback(() => {
    setLoading(true);
    api.getEquipmentById(itemId)
      .then(data => {
        setDetailData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [itemId]);

  useEffect(() => {
    fetchDetail();
  }, [itemId]);

  const data = detailData || { id: itemId };
  const workOrdersList = data.workOrders || [];
  const schedulesList = data.schedules || [];
  const sparePartsList = data.spareParts || [];
  const attachmentsList = data.attachments || [];

  // Parse specs dynamically
  let parsedSpecs: Record<string, string> = {};
  try {
    if (data.specs) {
      parsedSpecs = JSON.parse(data.specs);
    }
  } catch (e) {
    parsedSpecs = { 'Thông số': data.specs };
  }

  const logsList = (data.logs || []).map((l: any) => ({
    title: l.action === 'CREATE' ? 'Tạo yêu cầu' : l.action === 'COMPLETE' ? 'Bảo trì hoàn thành' : l.action,
    desc: l.comment || l.reason || 'Nhật ký hoạt động thiết bị',
    meta: `${l.actedBy?.name || 'Hệ thống'} • ${new Date(l.createdAt).toLocaleString('vi-VN')}`,
    icon: l.action === 'CREATE' ? 'New' : l.action === 'COMPLETE' ? 'Done' : 'Info',
    color: l.action === 'CREATE' ? '#2563eb' : l.action === 'COMPLETE' ? '#16a34a' : '#d97706'
  }));

  const handleAddSpec = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct new specs from temporary inputs
    const newSpecs: Record<string, string> = {};
    for (const item of tempSpecs) {
      if (item.key.trim() && item.val.trim()) {
        newSpecs[item.key.trim()] = item.val.trim();
      }
    }

    try {
      await api.updateEquipment(data.id, {
        expectedVersion: data.version,
        specs: JSON.stringify(newSpecs)
      });

      setShowSpecModal(false);
      toast.success('Thành công', 'Đã cập nhật thông số thiết bị.');
      fetchDetail();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi cập nhật thông số');
    }
  }, [tempSpecs, data, toast, fetchDetail]);

  const openSpecsModal = useCallback(() => {
    // Populate modal with existing specs as rows
    const rows = Object.entries(parsedSpecs).map(([key, val]) => ({ key, val }));
    setTempSpecs(rows.length > 0 ? rows : [{ key: '', val: '' }]);
    setShowSpecModal(true);
  }, [parsedSpecs]);

  const handleLinkPart = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) return;

    try {
      await api.updateEquipment(data.id, {
        expectedVersion: data.version,
        notes: data.notes
      });

      setShowPartModal(false);
      fetchDetail();
      toast.success('Thành công', 'Đã liên kết phụ tùng thành công.');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể liên kết phụ tùng');
    }
  }, [selectedPartId, data, toast, fetchDetail]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'Equipment');
    formData.append('entityId', data.id);
    formData.append('description', 'Tài liệu SOP');

    try {
      await api.uploadAttachment(formData);
      toast.success('Thành công', 'Tải lên tài liệu thành công.');
      fetchDetail();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi khi tải lên tài liệu');
    }
  }, [data.id, toast, fetchDetail]);

  const subTabs = ['Tổng quan', 'Cụm chức năng chính', 'Lịch sử sửa chữa', 'Lịch bảo trì', 'Phụ tùng', 'SOP & Tài liệu', 'Mã QR', 'Thông số vận hành', 'Sổ vận hành', 'Nhật ký'];

  return {
    // Tab navigation
    activeSubTab,
    setActiveSubTab,
    subTabs,

    // Data
    loading,
    data,
    workOrdersList,
    schedulesList,
    sparePartsList,
    attachmentsList,
    parsedSpecs,
    logsList,

    // Spec Modal
    showSpecModal,
    setShowSpecModal,
    tempSpecs,
    setTempSpecs,
    openSpecsModal,
    handleAddSpec,

    // Part Modal
    showPartModal,
    setShowPartModal,
    selectedPartId,
    setSelectedPartId,
    partMinQty,
    setPartMinQty,
    handleLinkPart,

    // SOP Preview
    previewFileUrl,
    setPreviewFileUrl,
    previewFileName,
    setPreviewFileName,

    // File upload
    handleFileUpload,
    fetchDetail,

    // Constants
    API_BASE,
  };
}
