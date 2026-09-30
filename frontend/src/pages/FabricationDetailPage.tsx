import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Hammer, Clock, Calendar, User, MapPin, Cpu, Building2, 
  CheckCircle2, AlertCircle, Plus, Trash2, Printer, Save, Award, 
  ChevronRight, Wrench, Package, FileText, Check, ShieldCheck,
  Camera, Upload, Eye, Image as ImageIcon, ZoomIn, X, Play, RotateCcw,
  Timer
} from 'lucide-react';
import { api, API_HOST as API_BASE } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { StatusBadge } from '../components/common/Badge';
import { usePermissions } from '../hooks/usePermissions';

export const FabricationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const { user, can, isAdmin } = usePermissions();
  const canDelete = isAdmin || can('fabrication:delete');

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Available staff for assignment (from 'xưởng cơ điện')
  const [staffList, setStaffList] = useState<any[]>([]);

  // Work progress states
  const [status, setStatus] = useState<string>('ASSIGNED');
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [actualStartDate, setActualStartDate] = useState<string>('');
  const [actualEndDate, setActualEndDate] = useState<string>('');
  const [actualHours, setActualHours] = useState<number>(0);
  const [resultNotes, setResultNotes] = useState<string>('');
  const [acceptanceRating, setAcceptanceRating] = useState<string>('GOOD');
  const [acceptedByName, setAcceptedByName] = useState<string>('');
  const [acceptanceTab, setAcceptanceTab] = useState<'ACCEPT' | 'REWORK'>('ACCEPT');
  const [reworkReason, setReworkReason] = useState<string>('');
  const [materials, setMaterials] = useState<any[]>([]);

  // Photos & Media states
  const [resultImages, setResultImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Live timer for IN_PROGRESS
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadJob = async (jobId: string) => {
    try {
      setLoading(true);
      const [jobData, usersData] = await Promise.all([
        api.getFabricationOrder(jobId),
        api.getUsers({ department: 'xưởng cơ điện' }),
      ]);

      if (!jobData) {
        toast.error('Không tìm thấy', 'Công việc gia công không tồn tại');
        navigate('/fabrication');
        return;
      }

      setJob(jobData);
      setStaffList(Array.isArray(usersData) ? usersData : []);

      // Populate states
      setStatus(jobData.status || 'ASSIGNED');
      setActualHours(jobData.actualHours || 0);
      setResultNotes(jobData.resultNotes || '');
      setAcceptanceRating(jobData.acceptanceRating || 'GOOD');
      setAcceptedByName(jobData.acceptedByName || '');
      if (jobData.acceptanceRating === 'REWORK') {
        setAcceptanceTab('REWORK');
      } else {
        setAcceptanceTab('ACCEPT');
      }
      setMaterials(jobData.materials || []);

      if (jobData.actualStartDate) {
        setActualStartDate(new Date(jobData.actualStartDate).toISOString());
      }
      if (jobData.actualEndDate) {
        setActualEndDate(new Date(jobData.actualEndDate).toISOString());
      }

      // Initialize result images
      let initialImages: any[] = [];
      if (jobData.resultImages) {
        try {
          initialImages = typeof jobData.resultImages === 'string' ? JSON.parse(jobData.resultImages) : jobData.resultImages;
          if (!Array.isArray(initialImages)) initialImages = [];
        } catch (e) {
          initialImages = [];
        }
      }
      setResultImages(initialImages);

      // Initialize technicians
      let initialTechs: string[] = [];
      if (jobData.assignedTechnicianId) initialTechs.push(jobData.assignedTechnicianId);
      if (jobData.supporterIds) {
        try {
          const parsed = typeof jobData.supporterIds === 'string' ? JSON.parse(jobData.supporterIds) : jobData.supporterIds;
          if (Array.isArray(parsed)) {
            parsed.forEach((tId: string) => {
              if (tId && !initialTechs.includes(tId)) initialTechs.push(tId);
            });
          }
        } catch (e) {}
      }
      setSelectedTechIds(initialTechs);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải thông tin công việc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  // Live timer tick when status is IN_PROGRESS and actualStartDate exists
  useEffect(() => {
    if (status === 'IN_PROGRESS' && actualStartDate) {
      const updateTimer = () => {
        const diffMs = Math.max(0, Date.now() - new Date(actualStartDate).getTime());
        setElapsedSeconds(Math.floor(diffMs / 1000));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [status, actualStartDate]);

  const formatElapsed = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}m ${pad(secs)}s`;
  };

  const formatDateTimeDisplay = (isoStr?: string | null) => {
    if (!isoStr) return '---';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  // Convert ISO string to format YYYY-MM-DDTHH:mm for datetime-local input
  const toInputDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  const handleToggleTech = (techId: string) => {
    if (selectedTechIds.includes(techId)) {
      setSelectedTechIds(selectedTechIds.filter((t) => t !== techId));
    } else {
      setSelectedTechIds([...selectedTechIds, techId]);
    }
  };

  const handleAddMaterial = () => {
    setMaterials([...materials, { materialName: '', quantity: 1, unit: 'cái', unitPrice: 0, totalPrice: 0 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const updated = [...materials];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : updated[index].quantity || 0;
      const p = field === 'unitPrice' ? parseFloat(value) || 0 : updated[index].unitPrice || 0;
      updated[index].totalPrice = q * p;
    }
    setMaterials(updated);
  };

  const totalMaterialCost = useMemo(() => {
    return materials.reduce((sum, m) => sum + (Number(m.totalPrice) || (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)), 0);
  }, [materials]);

  // Recalculate hours from actual start and end
  const handleRecalculateHours = () => {
    if (!actualStartDate || !actualEndDate) {
      toast.warning('Thiếu mốc thời gian', 'Cần có cả thời điểm bắt đầu và kết thúc để tính giờ tự động');
      return;
    }
    const diffMs = new Date(actualEndDate).getTime() - new Date(actualStartDate).getTime();
    if (diffMs < 0) {
      toast.error('Thời gian không hợp lệ', 'Thời điểm hoàn thành phải sau thời điểm bắt đầu');
      return;
    }
    const hours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));
    setActualHours(hours);
    toast.info('Đã tính lại giờ', `Giờ công thực tế: ${hours} giờ`);
  };

  // 1. ACTION: Bắt đầu làm việc (Start Work)
  const handleStartWork = async () => {
    if (!job) return;
    const nowIso = new Date().toISOString();
    setSaving(true);
    try {
      const updated = await api.updateFabricationOrder(job.id, {
        status: 'IN_PROGRESS',
        actualStartDate: nowIso,
      });

      setJob(updated);
      setStatus('IN_PROGRESS');
      setActualStartDate(nowIso);
      toast.success('Bắt đầu làm việc', 'Đã ghi nhận mốc thời gian bắt đầu và kích hoạt tính giờ công');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể bắt đầu công việc');
    } finally {
      setSaving(false);
    }
  };

  // 2. ACTION: Báo cáo hoàn thành (Report Complete)
  const handleCompleteWork = async () => {
    if (!job) return;
    const nowIso = new Date().toISOString();
    const startIso = actualStartDate || job.actualStartDate || nowIso;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(nowIso).getTime();
    const diffMs = Math.max(0, endMs - startMs);
    const computedHours = Math.max(0.1, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    setSaving(true);
    try {
      const validMaterials = materials
        .filter((m) => m.materialName && m.materialName.trim() !== '')
        .map((m) => ({
          materialName: m.materialName.trim(),
          quantity: Number(m.quantity) || 1,
          unit: m.unit.trim() || 'cái',
          unitPrice: Number(m.unitPrice) || 0,
        }));

      const updated = await api.updateFabricationOrder(job.id, {
        status: 'COMPLETED',
        actualStartDate: startIso,
        actualEndDate: nowIso,
        actualHours: computedHours,
        resultNotes: resultNotes.trim() || undefined,
        materials: validMaterials,
        resultImages: resultImages,
      });

      setJob(updated);
      setStatus('COMPLETED');
      setActualStartDate(startIso);
      setActualEndDate(nowIso);
      setActualHours(computedHours);
      toast.success('Báo cáo hoàn thành', `Đã hoàn thành. Giờ công thực tế tự động tính: ${computedHours} giờ`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể cập nhật hoàn thành');
    } finally {
      setSaving(false);
    }
  };

  // 3. ACTION: Lưu toàn bộ thông tin ghi nhận
  const handleSave = async (targetStatus?: string) => {
    if (!job) return;
    setSaving(true);
    try {
      const newStatus = targetStatus || status;

      const validMaterials = materials
        .filter((m) => m.materialName && m.materialName.trim() !== '')
        .map((m) => ({
          materialName: m.materialName.trim(),
          quantity: Number(m.quantity) || 1,
          unit: m.unit.trim() || 'cái',
          unitPrice: Number(m.unitPrice) || 0,
        }));

      const updated = await api.updateFabricationOrder(job.id, {
        status: newStatus,
        assignedTechnicianId: selectedTechIds[0] || undefined,
        supporterIds: selectedTechIds.length > 1 ? selectedTechIds.slice(1) : undefined,
        actualStartDate: actualStartDate ? new Date(actualStartDate).toISOString() : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate).toISOString() : undefined,
        actualHours: Number(actualHours) || 0,
        resultNotes: resultNotes.trim() || undefined,
        acceptanceRating: newStatus === 'CLOSED' ? acceptanceRating : undefined,
        acceptedByName: newStatus === 'CLOSED' ? (acceptedByName.trim() || undefined) : undefined,
        materials: validMaterials,
        resultImages: resultImages,
      });

      setJob(updated);
      setStatus(updated.status);
      toast.success('Đã lưu', 'Cập nhật tiến độ và ghi nhận công việc thành công');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi lưu', err.message || 'Không thể lưu thông tin công việc');
    } finally {
      setSaving(false);
    }
  };

  // 4. ACTION: Xử lý Đạt nghiệm thu & Bàn giao (Close & Handover)
  const handleAcceptAndClose = async () => {
    if (!job) return;
    const recipient = acceptedByName.trim() || user?.name || 'Đại diện bộ phận tiếp nhận';

    const ok = await confirm(
      'Xác nhận nghiệm thu & bàn giao',
      `Xác nhận sản phẩm đã ĐẠT tiêu chuẩn kỹ thuật và bàn giao cho "${recipient}". Trạng thái phiếu sẽ chuyển sang HOÀN TẤT?`,
      {
        confirmText: 'Xác nhận Bàn giao',
        cancelText: 'Hủy',
        type: 'info',
      }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const finalRating = acceptanceRating === 'REWORK' ? 'GOOD' : acceptanceRating;
      const updated = await api.updateFabricationOrder(job.id, {
        status: 'CLOSED',
        acceptanceRating: finalRating,
        acceptedByName: recipient,
      });

      setJob(updated);
      setStatus('CLOSED');
      setAcceptedByName(recipient);
      setAcceptanceRating(finalRating);
      toast.success('Nghiệm thu thành công', `Đã nghiệm thu đạt chuẩn và bàn giao cho ${recipient}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể hoàn tất nghiệm thu');
    } finally {
      setSaving(false);
    }
  };

  // 5. ACTION: Xử lý Không đạt / Yêu cầu sửa lại (Reject & Rework)
  const handleRejectAndRework = async () => {
    if (!job) return;
    if (!reworkReason.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập lý do không đạt và nội dung yêu cầu sửa lại chi tiết');
      return;
    }

    const ok = await confirm(
      'Yêu cầu sửa lại',
      'Phiếu công việc sẽ được chuyển ngược lại trạng thái "Đang thực hiện" để kỹ thuật viên tiến hành sửa chữa. Bạn có chắc chắn không?',
      {
        confirmText: 'Yêu cầu sửa lại',
        cancelText: 'Hủy',
        type: 'warning',
      }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const nowStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const inspector = user?.name || 'Bộ phận nghiệm thu';
      const reworkEntry = `\n\n[⚠️ YÊU CẦU SỬA LẠI - ${nowStr} bởi ${inspector}]:\n${reworkReason.trim()}`;
      const newResultNotes = resultNotes ? `${resultNotes}${reworkEntry}` : reworkEntry.trim();

      const updated = await api.updateFabricationOrder(job.id, {
        status: 'IN_PROGRESS',
        acceptanceRating: 'REWORK',
        resultNotes: newResultNotes,
      });

      setJob(updated);
      setStatus('IN_PROGRESS');
      setAcceptanceRating('REWORK');
      setResultNotes(newResultNotes);
      setReworkReason('');
      toast.warning('Yêu cầu sửa lại', 'Đã chuyển phiếu về trạng thái Đang thực hiện cho kỹ thuật viên sửa chữa');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể cập nhật yêu cầu sửa lại');
    } finally {
      setSaving(false);
    }
  };

  // 6. ACTION: Mở lại phiếu nếu đã Closed mà phát sinh vấn đề
  const handleReopenJob = async () => {
    if (!job) return;
    const ok = await confirm(
      'Mở lại phiếu công việc',
      'Bạn có chắc chắn muốn mở lại phiếu đã hoàn tất để tiếp tục điều chỉnh hoặc xử lý bổ sung?',
      {
        confirmText: 'Mở lại phiếu',
        cancelText: 'Hủy',
        type: 'warning',
      }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await api.updateFabricationOrder(job.id, {
        status: 'IN_PROGRESS',
      });
      setJob(updated);
      setStatus('IN_PROGRESS');
      toast.info('Đã mở lại phiếu', 'Phiếu đã chuyển về trạng thái Đang thực hiện');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể mở lại phiếu');
    } finally {
      setSaving(false);
    }
  };

  // 7. ACTION: Xóa phiếu công việc
  const handleDeleteJob = async () => {
    if (!job) return;
    const ok = await confirm(
      'Xác nhận xóa phiếu',
      `Bạn có chắc chắn muốn xóa phiếu [${job.orderCode}] "${job.title}" không? Dữ liệu đã xóa sẽ không thể phục hồi.`,
      {
        confirmText: 'Xóa phiếu',
        cancelText: 'Hủy',
        type: 'danger',
      }
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await api.deleteFabricationOrder(job.id);
      toast.success('Đã xóa', `Đã xóa thành công phiếu ${job.orderCode}`);
      navigate('/fabrication');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi xóa', err.message || 'Không thể xóa phiếu công việc');
      setDeleting(false);
    }
  };

  // 5. ACTION: Xử lý chụp ảnh & upload ảnh kết quả
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !job) return;
    setUploadingImage(true);

    const newImgs: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        toast.warning('Tệp quá lớn', `Ảnh ${file.name} vượt quá 15MB`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'FabricationOrder');
        formData.append('entityId', job.id);
        formData.append('description', 'Ảnh kết quả gia công/chế tạo');
        formData.append('photoCategory', 'RESULT');

        const uploadRes = await api.uploadAttachment(formData);
        newImgs.push({
          id: uploadRes.id,
          url: `${API_BASE}/api/v1/attachments/${uploadRes.id}/view`,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      } catch (uploadErr) {
        // Fallback to base64 preview for immediate display
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        newImgs.push({
          id: 'local-' + Date.now() + '-' + i,
          url: dataUrl,
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    if (newImgs.length > 0) {
      const updatedList = [...resultImages, ...newImgs];
      setResultImages(updatedList);

      try {
        await api.updateFabricationOrder(job.id, {
          resultImages: updatedList,
        });
        toast.success('Đã tải ảnh lên', `Đã lưu ${newImgs.length} ảnh kết quả`);
      } catch (err: any) {
        toast.error('Lỗi lưu ảnh', err.message || 'Không thể lưu danh sách ảnh');
      }
    }
    setUploadingImage(false);

    // Reset input elements
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (imgIndex: number) => {
    const imgToRemove = resultImages[imgIndex];
    const nextList = resultImages.filter((_, idx) => idx !== imgIndex);
    setResultImages(nextList);

    try {
      if (imgToRemove.id && !imgToRemove.id.startsWith('local-')) {
        api.deleteAttachment(imgToRemove.id).catch(() => {});
      }
      await api.updateFabricationOrder(job.id, {
        resultImages: nextList,
      });
      toast.success('Đã xóa', 'Đã loại bỏ ảnh kết quả');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể cập nhật danh sách ảnh');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'FABRICATION': return 'Gia công cơ khí';
      case 'NEW_MAKING': return 'Chế tạo mới';
      case 'MODIFICATION': return 'Cải tiến kỹ thuật';
      case 'INSTALLATION': return 'Lắp đặt / Di dời';
      case 'INFRASTRUCTURE': return 'Cơ sở hạ tầng';
      default: return 'Khác';
    }
  };

  const getRatingLabel = (rating?: string) => {
    switch (rating) {
      case 'EXCELLENT':
        return '⭐ Xuất sắc (Vượt tiến độ / Chuẩn xác cao)';
      case 'GOOD':
        return '✅ Đạt chuẩn chất lượng kỹ thuật';
      case 'ACCEPTABLE':
        return '🆗 Chấp nhận được';
      case 'REWORK':
      case 'POOR':
        return '⚠️ Không đạt / Yêu cầu sửa chữa lại';
      default:
        return rating || 'Chưa đánh giá';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ marginTop: '12px', fontSize: '13.5px' }}>Đang tải thông tin công việc...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h3>Không tìm thấy dữ liệu công việc</h3>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/fabrication')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="fabrication-detail-page" style={{ paddingBottom: '40px' }}>
      {/* Hidden file inputs for Camera and File select */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleImageFiles(e.target.files)}
      />
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleImageFiles(e.target.files)}
      />

      {/* Top Navigation & Actions Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/fabrication')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#64748b',
            padding: '6px 0',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={16} /> Quay lại danh sách gia công & chế tạo
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canDelete && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDeleteJob}
              disabled={deleting || saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#ef4444',
                borderColor: '#fca5a5',
                backgroundColor: '#fef2f2',
                fontWeight: 600,
              }}
              title="Xóa phiếu gia công/chế tạo này"
            >
              <Trash2 size={15} /> {deleting ? 'Đang xóa...' : 'Xóa phiếu'}
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Printer size={15} /> In phiếu báo cáo
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleSave()}
            disabled={saving || deleting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu ghi nhận'}
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div
        className="card no-print"
        style={{
          padding: '20px 24px',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb', letterSpacing: '0.02em' }}>
                {job.orderCode}
              </span>
              <StatusBadge status={job.status} />
              <StatusBadge status={job.priority} />
              {job.acceptanceRating === 'REWORK' && job.status === 'IN_PROGRESS' && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    backgroundColor: '#fff1f2',
                    color: '#e11d48',
                    borderRadius: '4px',
                    border: '1px solid #fecdd3',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} /> Cần sửa lại theo nghiệm thu
                </span>
              )}
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '4px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {getCategoryLabel(job.category)}
              </span>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {job.title}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: '#64748b' }}>
              {job.targetDepartment && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={13} color="#2563eb" /> Đơn vị yêu cầu: <strong style={{ color: '#1e293b' }}>{job.targetDepartment}</strong>
                </span>
              )}
              {job.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#2563eb" /> Vị trí: <strong style={{ color: '#1e293b' }}>{job.location}</strong>
                </span>
              )}
              {job.equipment && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={13} color="#2563eb" /> Thiết bị: <strong style={{ color: '#1e293b' }}>[{job.equipment.code}] {job.equipment.name}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick status progression buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Thao tác nhanh tiến độ:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {status === 'ASSIGNED' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartWork}
                  disabled={saving || deleting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Play size={14} /> Bắt đầu làm việc (Bật tính giờ)
                </button>
              )}
              {status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleCompleteWork}
                  disabled={saving || deleting}
                  style={{
                    backgroundColor: acceptanceRating === 'REWORK' ? '#ea580c' : '#16a34a',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={15} /> 
                  {acceptanceRating === 'REWORK' ? 'Báo cáo hoàn thành lại (Gửi nghiệm thu lần 2)' : 'Báo cáo hoàn thành (Chốt giờ)'}
                </button>
              )}
              {status === 'COMPLETED' && (
                <>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAcceptanceTab('ACCEPT');
                      document.getElementById('acceptance-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={saving || deleting}
                    style={{
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    <ShieldCheck size={15} /> Đạt nghiệm thu & Bàn giao
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAcceptanceTab('REWORK');
                      document.getElementById('acceptance-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={saving || deleting}
                    style={{
                      backgroundColor: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={14} /> Không đạt / Sửa lại
                  </button>
                </>
              )}
              {status === 'CLOSED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={16} /> Đã hoàn tất & nghiệm thu bàn giao
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleReopenJob}
                      disabled={saving || deleting}
                      title="Mở lại phiếu nếu có phát sinh"
                      style={{ fontSize: '11.5px', color: '#64748b' }}
                    >
                      <RotateCcw size={12} style={{ marginRight: '4px' }} /> Mở lại
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
          gap: '20px',
        }}
      >
        {/* LEFT COLUMN: GHI NHẬN CÔNG VIỆC, QUY CÁCH, VẬT TƯ & KẾT QUẢ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Yêu cầu & Quy cách kỹ thuật */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <FileText size={15} /> 1. Yêu cầu & Quy cách kỹ thuật
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Mô tả công việc:
                </span>
                <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {job.description || 'Chưa ghi nhận'}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                  Quy cách / Kích thước / Vật liệu:
                </span>
                <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {job.specifications || 'Chưa có thông số chi tiết'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ghi nhận quá trình làm việc & Giờ công tự động */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={15} /> 2. Tiến độ & Giờ công thực tế
              </div>

              {status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1.5s infinite' }} />
                  Đang đếm giờ: {formatElapsed(elapsedSeconds)}
                </div>
              )}
            </div>

            {/* Live Progress Banner Box */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: status === 'IN_PROGRESS' ? '#f0fdf4' : status === 'COMPLETED' ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${status === 'IN_PROGRESS' ? '#bbf7d0' : status === 'COMPLETED' ? '#bfdbfe' : '#e2e8f0'}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                  Trạng thái đo thời gian:
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: status === 'IN_PROGRESS' ? '#15803d' : status === 'COMPLETED' ? '#1d4ed8' : '#334155' }}>
                  {status === 'ASSIGNED' && 'Chờ kỹ thuật viên bấm "Bắt đầu làm việc"'}
                  {status === 'IN_PROGRESS' && `Đang làm việc: ${formatElapsed(elapsedSeconds)}`}
                  {status === 'COMPLETED' && `Đã hoàn thành • Tổng giờ thực tế: ${actualHours} giờ`}
                  {status === 'CLOSED' && `Đã nghiệm thu • Tổng giờ thực tế: ${actualHours} giờ`}
                  {status === 'CANCELLED' && 'Công việc đã hủy'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {status === 'ASSIGNED' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleStartWork}
                    disabled={saving || deleting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}
                  >
                    <Play size={13} /> Bắt đầu làm việc
                  </button>
                )}
                {status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCompleteWork}
                    disabled={saving || deleting}
                    style={{ backgroundColor: '#16a34a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700 }}
                  >
                    <CheckCircle2 size={13} /> Báo cáo hoàn thành
                  </button>
                )}
              </div>
            </div>

            {/* Cảnh báo yêu cầu sửa lại nếu trước đó bị nghiệm thu không đạt */}
            {acceptanceRating === 'REWORK' && status === 'IN_PROGRESS' && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#b45309' }}>
                    Lưu ý kỹ thuật viên: Phiếu này đang cần sửa chữa lại theo yêu cầu nghiệm thu!
                  </div>
                  <div style={{ fontSize: '12px', color: '#92400e', marginTop: '3px', lineHeight: 1.4 }}>
                    Vui lòng kiểm tra kỹ yêu cầu sửa chữa trong phần ghi chú, tiến hành khắc phục, chụp ảnh kết quả mới và bấm <strong>"Báo cáo hoàn thành lại"</strong> để nghiệm thu lại.
                  </div>
                </div>
              </div>
            )}

            {/* Time Tracking Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              {/* Actual Start Date */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Clock size={12} color="#2563eb" /> Bắt đầu thực tế
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={toInputDateTime(actualStartDate)}
                  onChange={(e) => setActualStartDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  {formatDateTimeDisplay(actualStartDate)}
                </span>
              </div>

              {/* Actual End Date */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <CheckCircle2 size={12} color="#16a34a" /> Hoàn thành thực tế
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={toInputDateTime(actualEndDate)}
                  onChange={(e) => setActualEndDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  {formatDateTimeDisplay(actualEndDate)}
                </span>
              </div>

              {/* Actual Hours */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                    <Timer size={12} color="#7c3aed" /> Giờ công (giờ)
                  </label>
                  {actualStartDate && actualEndDate && (
                    <button
                      type="button"
                      onClick={handleRecalculateHours}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '11px', padding: 0, textDecoration: 'underline' }}
                      title="Tính lại giờ theo mốc bắt đầu & kết thúc"
                    >
                      Tính lại
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-input"
                  value={actualHours}
                  onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', fontSize: '13px', fontWeight: 700, color: '#1e40af', padding: '6px 8px' }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Dự kiến: {job.estimatedHours || 0}h
                </span>
              </div>
            </div>

            {/* Result Notes */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                Ghi chú kết quả thực hiện / Báo cáo quá trình:
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Ghi nhận các bước đã thực hiện, phương án gia công, tình trạng sau khi lắp đặt, lưu ý vận hành..."
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                style={{ width: '100%', fontSize: '13px', padding: '8px 12px', lineHeight: 1.5 }}
              />
            </div>
          </div>

          {/* 3. Chụp ảnh & Tải ảnh kết quả gia công/chế tạo */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e40af',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Camera size={15} /> 3. Ảnh kết quả gia công & chế tạo ({resultImages.length})
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
                  title="Mở camera để chụp ảnh sản phẩm sau gia công"
                >
                  <Camera size={14} /> Chụp ảnh kết quả
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                  title="Chọn ảnh từ thiết bị / máy tính"
                >
                  <Upload size={14} /> Tải ảnh lên
                </button>
              </div>
            </div>

            {uploadingImage && (
              <div style={{ padding: '12px', textAlign: 'center', color: '#2563eb', fontSize: '12.5px', backgroundColor: '#eff6ff', borderRadius: '8px', marginBottom: '12px' }}>
                Đang tải và tối ưu hóa hình ảnh...
              </div>
            )}

            {/* Image Grid */}
            {resultImages.length === 0 ? (
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#64748b', marginBottom: '8px' }}>
                  <ImageIcon size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Chưa có hình ảnh kết quả nào
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '380px', margin: '0 auto 12px auto' }}>
                  Kỹ thuật viên bấm <strong>"Chụp ảnh kết quả"</strong> hoặc <strong>"Tải ảnh lên"</strong> để lưu hình ảnh thực tế sau khi hoàn thành.
                </div>
                <div style={{ display: 'inline-flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={13} style={{ marginRight: '4px' }} /> Chụp ảnh ngay
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '12px',
                }}
              >
                {resultImages.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    style={{
                      position: 'relative',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#f8fafc',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '110px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        backgroundColor: '#000000',
                      }}
                      onClick={() => setPreviewImage(img.url)}
                      title="Nhấn để phóng to ảnh"
                    >
                      <img
                        src={img.url}
                        alt={img.name || `Ảnh kết quả ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    </div>

                    <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#334155',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '90px',
                        }}
                        title={img.name || `Ảnh ${idx + 1}`}
                      >
                        {img.name || `Ảnh ${idx + 1}`}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewImage(img.url)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          title="Xem phóng to"
                        >
                          <ZoomIn size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                          title="Xóa ảnh này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Vật tư phôi thô sử dụng thực tế */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e40af',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Package size={15} /> 4. Vật tư phôi thô sử dụng thực tế
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddMaterial}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
              >
                <Plus size={13} /> Thêm vật tư
              </button>
            </div>

            {materials.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '12.5px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                Chưa có vật tư nào được ghi nhận. Nhấn <strong>"Thêm vật tư"</strong> để kê khai phôi sắt, thép, inox, que hàn...
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: '180px' }}>Tên vật tư / Phôi thô</th>
                      <th style={{ width: '90px' }}>Số lượng</th>
                      <th style={{ width: '80px' }}>Đơn vị</th>
                      <th style={{ width: '130px' }}>Đơn giá (VNĐ)</th>
                      <th style={{ width: '130px' }}>Thành tiền (VNĐ)</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((mat, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Vd: Thép hộp 40x40x1.4, Inox 304..."
                            value={mat.materialName}
                            onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '4px 8px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            className="form-input"
                            value={mat.quantity}
                            onChange={(e) => handleMaterialChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '4px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            value={mat.unit}
                            onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '4px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            className="form-input"
                            value={mat.unitPrice}
                            onChange={(e) => handleMaterialChange(idx, 'unitPrice', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '4px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f766e' }}>
                          {((Number(mat.quantity) || 0) * (Number(mat.unitPrice) || 0)).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Xóa dòng"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>
                        Tổng chi phí vật tư:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '13.5px', color: '#0f766e' }}>
                        {totalMaterialCost.toLocaleString('vi-VN')} đ
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: NHÂN SỰ PHÂN CÔNG, NGHIỆM THU */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Nhân sự cơ điện phụ trách */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <User size={15} /> Nhân sự cơ điện phụ trách ({selectedTechIds.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {staffList.map((st) => {
                const isSelected = selectedTechIds.includes(st.id);
                const isLead = selectedTechIds[0] === st.id;

                return (
                  <div
                    key={st.id}
                    onClick={() => handleToggleTech(st.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#2563eb' : '#cbd5e1',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {st.department || 'Xưởng cơ điện'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isLead && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '4px' }}>
                          Chính
                        </span>
                      )}
                      {!isLead && isSelected && (
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#0f766e', backgroundColor: '#ccfbf1', padding: '2px 6px', borderRadius: '4px' }}>
                          Hỗ trợ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Nghiệm thu & Bàn giao sản phẩm */}
          <div
            id="acceptance-section"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: status === 'COMPLETED' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              padding: '18px 20px',
              boxShadow: status === 'COMPLETED' ? '0 4px 12px rgba(59, 130, 246, 0.08)' : 'none',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={15} /> 5. Nghiệm thu & Bàn giao
              </div>
              {status === 'COMPLETED' && (
                <span style={{ fontSize: '11px', color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  Chờ nghiệm thu
                </span>
              )}
            </div>

            {/* TRƯỜNG HỢP 1: ĐÃ CLOSED (HOÀN TẤT & ĐÃ BÀN GIAO) */}
            {status === 'CLOSED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '14px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', marginBottom: '8px' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
                    ĐÃ ĐẠT NGHIỆM THU & BÀN GIAO
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                    Đánh giá: <strong>{getRatingLabel(acceptanceRating || job.acceptanceRating)}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: '#334155', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    Người tiếp nhận: <strong style={{ color: '#0f172a' }}>{acceptedByName || job.acceptedByName || '---'}</strong>
                  </div>
                  <div>
                    Thời gian nghiệm thu: <strong style={{ color: '#0f172a' }}>{job.acceptedAt ? formatDateTimeDisplay(job.acceptedAt) : 'Đã nghiệm thu'}</strong>
                  </div>
                  {job.creator && (
                    <div style={{ fontSize: '11.5px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                      Người tạo phiếu: {job.creator.name}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleReopenJob}
                    disabled={saving}
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <RotateCcw size={13} /> Mở lại phiếu nếu phát sinh vấn đề
                  </button>
                )}
              </div>
            ) : status === 'COMPLETED' ? (
              /* TRƯỜNG HỢP 2: COMPLETED (THỢ ĐÃ BÁO CÁO XONG -> TIẾN HÀNH NGHIỆM THU) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 2 Tabs: Đạt & Bàn giao VS Không đạt (Yêu cầu sửa lại) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAcceptanceTab('ACCEPT')}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: acceptanceTab === 'ACCEPT' ? '#16a34a' : 'transparent',
                      color: acceptanceTab === 'ACCEPT' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CheckCircle2 size={14} /> Đạt nghiệm thu
                  </button>

                  <button
                    type="button"
                    onClick={() => setAcceptanceTab('REWORK')}
                    style={{
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: acceptanceTab === 'REWORK' ? '#e11d48' : 'transparent',
                      color: acceptanceTab === 'REWORK' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <RotateCcw size={14} /> Yêu cầu sửa lại
                  </button>
                </div>

                {acceptanceTab === 'ACCEPT' ? (
                  /* TAB 1: ĐẠT NGHIỆM THU & BÀN GIAO */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Xếp loại chất lượng:
                      </label>
                      <select
                        className="form-input"
                        value={acceptanceRating}
                        onChange={(e) => setAcceptanceRating(e.target.value)}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      >
                        <option value="EXCELLENT">⭐ Xuất sắc (Vượt tiến độ / Chuẩn xác cao)</option>
                        <option value="GOOD">✅ Đạt chuẩn chất lượng kỹ thuật</option>
                        <option value="ACCEPTABLE">🆗 Chấp nhận được (Cần lưu ý thêm)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                        Người đại diện nhận bàn giao:
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nhập họ tên người tiếp nhận..."
                        value={acceptedByName}
                        onChange={(e) => setAcceptedByName(e.target.value)}
                        style={{ width: '100%', fontSize: '12.5px' }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                        (Đại diện xưởng/phòng ban nhận bàn giao thiết bị hoặc sản phẩm hoàn thiện)
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAcceptAndClose}
                      disabled={saving}
                      style={{
                        backgroundColor: '#16a34a',
                        borderColor: '#16a34a',
                        color: '#ffffff',
                        width: '100%',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <ShieldCheck size={16} /> Xác nhận Đạt & Bàn giao
                    </button>
                  </div>
                ) : (
                  /* TAB 2: KHÔNG ĐẠT / YÊU CẦU SỬA LẠI */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '12px',
                        color: '#9f1239',
                        lineHeight: 1.4,
                      }}
                    >
                      Phiếu sẽ chuyển ngược lại trạng thái <strong>"ĐANG THỰC HIỆN"</strong> để kỹ thuật viên tiến hành khắc phục các lỗi trước khi nghiệm thu lại.
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#e11d48', display: 'block', marginBottom: '4px' }}>
                        Lý do không đạt & Yêu cầu sửa chi tiết (*):
                      </label>
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder="Ghi rõ chi tiết cần sửa (VD: Kích thước bản mã lệch 3mm, mối hàn chân đế chưa ngấu, bề mặt chưa mài phẳng...)"
                        value={reworkReason}
                        onChange={(e) => setReworkReason(e.target.value)}
                        style={{ width: '100%', fontSize: '12.5px', borderColor: '#fda4af' }}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn"
                      onClick={handleRejectAndRework}
                      disabled={saving || !reworkReason.trim()}
                      style={{
                        backgroundColor: '#e11d48',
                        color: '#ffffff',
                        width: '100%',
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <RotateCcw size={16} /> Gửi yêu cầu thợ sửa lại
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TRƯỜNG HỢP 3: ASSIGNED HOẶC IN_PROGRESS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {acceptanceRating === 'REWORK' && status === 'IN_PROGRESS' ? (
                  <div
                    style={{
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                      <AlertCircle size={15} color="#d97706" /> Đang trong quy trình sửa lại
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.4 }}>
                      Phiếu bị nghiệm thu chưa đạt yêu cầu. Kỹ thuật viên đang tiến hành sửa chữa theo nội dung ghi chú.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '16px 12px',
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Chưa tới bước nghiệm thu
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {status === 'ASSIGNED' 
                        ? 'Công việc chưa bắt đầu thực hiện.' 
                        : 'Kỹ thuật viên đang gia công chế tạo. Sau khi bấm "Báo cáo hoàn thành", phần nghiệm thu sẽ kích hoạt.'}
                    </div>
                  </div>
                )}

                {job.creator && (
                  <div style={{ fontSize: '11.5px', color: '#64748b', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                    Người tạo phiếu: <strong>{job.creator.name}</strong> ({new Date(job.createdAt).toLocaleDateString('vi-VN')})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Image Preview Modal */}
      {previewImage && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: '#000000',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
              title="Đóng xem ảnh"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Phóng to ảnh kết quả"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}

      {/* D. PRINTABLE REPORT SHEET (Chỉ xuất hiện khi bấm In phiếu) */}
      <div
        className="print-only"
        style={{
          display: 'none',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#000000',
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>
            CÔNG TY CỔ PHẦN DƯỢC KHOA
          </h2>
          <p style={{ margin: '4px 0', fontSize: '13px' }}>PHÒNG KỸ THUẬT & CƠ ĐIỆN</p>
          <h1 style={{ margin: '14px 0 6px 0', fontSize: '20px', textTransform: 'uppercase', fontWeight: 800 }}>
            PHIẾU BÁO CÁO GIA CÔNG & CHẾ TẠO THIẾT BỊ
          </h1>
          <p style={{ margin: 0, fontSize: '12.5px' }}>Mã phiếu: <strong>{job.orderCode}</strong> | Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <table style={{ width: '100%', marginBottom: '16px', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', width: '22%' }}><strong>Tên công việc / Sản phẩm:</strong></td>
              <td style={{ padding: '4px 0', width: '78%' }}>{job.title}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Hình thức phân loại:</strong></td>
              <td>{getCategoryLabel(job.category)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Bộ phận thụ hưởng / Vị trí:</strong></td>
              <td>{job.targetDepartment || 'Toàn xưởng'} (Vị trí: {job.location || '---'})</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Mô tả yêu cầu:</strong></td>
              <td>{job.description}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Quy cách kỹ thuật:</strong></td>
              <td>{job.specifications || '---'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Thời gian thực hiện:</strong></td>
              <td>
                Bắt đầu: {formatDateTimeDisplay(actualStartDate)} — Kết thúc: {formatDateTimeDisplay(actualEndDate)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Giờ công thực tế:</strong></td>
              <td><strong>{actualHours} giờ</strong> (Tự động tính từ thời điểm bắt đầu đến khi hoàn thành)</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Ghi chú kết quả:</strong></td>
              <td>{resultNotes || 'Đã hoàn thành theo quy cách'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}><strong>Đánh giá nghiệm thu:</strong></td>
              <td>
                <strong>{getRatingLabel(job.acceptanceRating || acceptanceRating)}</strong>
                {acceptedByName && ` — Bàn giao cho: ${acceptedByName}`}
                {job.acceptedAt && ` (Ngày: ${formatDateTimeDisplay(job.acceptedAt)})`}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bảng vật tư */}
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
          Vật tư phôi thô sử dụng thực tế
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px' }} border={1}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '6px' }}>STT</th>
              <th style={{ padding: '6px', textAlign: 'left' }}>Tên vật tư / Phôi thô</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>Số lượng</th>
              <th style={{ padding: '6px', textAlign: 'center' }}>ĐVT</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Đơn giá (đ)</th>
              <th style={{ padding: '6px', textAlign: 'right' }}>Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, idx) => (
              <tr key={idx}>
                <td style={{ padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '6px' }}>{m.materialName}</td>
                <td style={{ padding: '6px', textAlign: 'center' }}>{m.quantity}</td>
                <td style={{ padding: '6px', textAlign: 'center' }}>{m.unit}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{Number(m.unitPrice || 0).toLocaleString('vi-VN')}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>
                  {((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)).toLocaleString('vi-VN')}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>Tổng cộng chi phí vật tư:</td>
              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700 }}>{totalMaterialCost.toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>

        {/* Hình ảnh minh chứng kết quả */}
        {resultImages.length > 0 && (
          <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>
              Hình ảnh minh chứng sản phẩm hoàn thành
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {resultImages.map((img, idx) => (
                <div key={idx} style={{ width: '150px', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', textAlign: 'center' }}>
                  <img src={img.url} alt={img.name || `Ảnh ${idx + 1}`} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                  <div style={{ fontSize: '10px', color: '#555', padding: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {img.name || `Ảnh ${idx + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chữ ký xác nhận */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '30px', pageBreakInside: 'avoid' }}>
          <div>
            <strong>NGƯỜI GIAO VIỆC</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{job.creator?.name || ''}</p>
          </div>
          <div>
            <strong>NGƯỜI THỰC HIỆN</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{selectedTechIds.map(id => staffList.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</p>
          </div>
          <div>
            <strong>NGHIỆM THU TIẾP NHẬN</strong>
            <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 50px 0' }}>(Ký và ghi rõ họ tên)</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{acceptedByName || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FabricationDetailPage;
