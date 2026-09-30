import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Hammer, Clock, Calendar, User, MapPin, Cpu, Building2, 
  CheckCircle2, AlertCircle, Plus, Trash2, Printer, Save, Award, 
  ChevronRight, Wrench, Package, FileText, Check, ShieldCheck,
  Camera, Upload, Eye, Image as ImageIcon, ZoomIn, X, Play, RotateCcw,
  Timer, History, RefreshCw, Lock, XOctagon, Loader2, ArrowRightLeft,
  Pause
} from 'lucide-react';
import { api, API_HOST as API_BASE } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { usePermissions } from '../../hooks/usePermissions';
import { Modal } from '../common/Modal';
import { DetailViewSkeleton } from '../common/Skeleton';

// Reusable Circular Action Button (CMMS Standard)
const ActionButton = ({ onClick, disabled, icon: Icon, label, color }: any) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      background: 'none',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <div
      className="action-grid-btn"
      style={{
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}
    >
      <Icon size={24} />
    </div>
    <span
      style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        textAlign: 'center',
        lineHeight: '1.3',
        maxWidth: '110px',
      }}
    >
      {label}
    </span>
  </button>
);

interface FabricationDetailViewProps {
  jobId: string;
  onClose?: () => void;
  onUpdated?: (updatedJob?: any) => void;
  onDeleted?: (deletedId: string) => void;
}

export const FabricationDetailView: React.FC<FabricationDetailViewProps> = ({
  jobId,
  onClose,
  onUpdated,
  onDeleted,
}) => {
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
  const [reworkReason, setReworkReason] = useState<string>('');
  const [materials, setMaterials] = useState<any[]>([]);

  // Acceptance & Rework Modals (aligned with WorkOrder flow)
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [testRunResult, setTestRunResult] = useState<string>('Đúng bản vẽ & quy cách kỹ thuật, dung sai chuẩn xác');
  const [cleanlinessResult, setCleanlinessResult] = useState<string>('Bề mặt mài nhẵn bavia, đã xử lý chống rỉ, đạt tiêu chuẩn 5S');
  const [workshopComment, setWorkshopComment] = useState<string>('');

  // Reassign Modal states (Đổi người phụ trách)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [newPrimaryTechId, setNewPrimaryTechId] = useState<string>('');
  const [newSupporterIds, setNewSupporterIds] = useState<string[]>([]);
  const [reassignNote, setReassignNote] = useState<string>('');

  // Log Progress Modal states (Ghi nhận tiến độ)
  const [isLogProgressModalOpen, setIsLogProgressModalOpen] = useState(false);
  const [progressContent, setProgressContent] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<string>('50%');
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [progressPhotos, setProgressPhotos] = useState<FileList | null>(null);

  // Pause Modal states (Tạm dừng công việc)
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>('Chờ vật tư / phôi thô');
  const [customPauseReason, setCustomPauseReason] = useState<string>('');

  // Audit Trail / History states
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Photos & Media states
  const [resultImages, setResultImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Live timer for IN_PROGRESS
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadHistory = async (id: string) => {
    try {
      setLoadingHistory(true);
      const h = await api.getFabricationHistory(id);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      console.error('Failed to load fabrication history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadJob = async (id: string) => {
    try {
      setLoading(true);
      const [jobData, usersData, historyData] = await Promise.all([
        api.getFabricationOrder(id),
        api.getUsers({ department: 'xưởng cơ điện' }),
        api.getFabricationHistory(id).catch(() => []),
      ]);

      if (!jobData) {
        toast.error('Không tìm thấy', 'Công việc gia công không tồn tại');
        if (onClose) onClose();
        return;
      }

      setJob(jobData);
      setStaffList(Array.isArray(usersData) ? usersData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);

      // Populate states
      setStatus(jobData.status || 'ASSIGNED');
      setActualHours(jobData.actualHours || 0);
      setResultNotes(jobData.resultNotes || '');
      setAcceptanceRating(jobData.acceptanceRating || 'GOOD');
      setAcceptedByName(jobData.acceptedByName || '');
      setMaterials(jobData.materials || []);

      if (jobData.actualStartDate) {
        setActualStartDate(new Date(jobData.actualStartDate).toISOString());
      } else {
        setActualStartDate('');
      }
      if (jobData.actualEndDate) {
        setActualEndDate(new Date(jobData.actualEndDate).toISOString());
      } else {
        setActualEndDate('');
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
    if (jobId) {
      loadJob(jobId);
    }
  }, [jobId]);

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
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
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
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
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
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.success('Đã lưu', 'Cập nhật tiến độ và ghi nhận công việc thành công');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi lưu', err.message || 'Không thể lưu thông tin công việc');
    } finally {
      setSaving(false);
    }
  };

  // 4. ACTION: Xác nhận nghiệm thu & Bàn giao (Modal Submit)
  const handleWorkshopAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    const recipient = acceptedByName.trim() || user?.name || 'Đại diện bộ phận tiếp nhận';

    setSaving(true);
    try {
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const acceptHeader = `\n\n[✅ BIÊN BẢN NGHIỆM THU BÀN GIAO - ${timeStr}]:\n• Người nhận: ${recipient}\n• Quy cách kỹ thuật: ${testRunResult}\n• Vệ sinh 5S: ${cleanlinessResult}\n• Đánh giá: ${getRatingLabel(acceptanceRating)}\n• Ý kiến phân xưởng: ${workshopComment.trim() || 'Đồng ý nghiệm thu & tiếp nhận bàn giao'}`;
      const newResultNotes = resultNotes ? `${resultNotes}${acceptHeader}` : acceptHeader.trim();

      const finalRating = acceptanceRating === 'REWORK' ? 'GOOD' : acceptanceRating;
      const updated = await api.updateFabricationOrder(job.id, {
        status: 'CLOSED',
        acceptanceRating: finalRating,
        acceptedByName: recipient,
        resultNotes: newResultNotes,
      });

      setJob(updated);
      setStatus('CLOSED');
      setAcceptedByName(recipient);
      setAcceptanceRating(finalRating);
      setResultNotes(newResultNotes);
      setIsAcceptanceModalOpen(false);
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.success('Nghiệm thu thành công', `Đã nghiệm thu đạt chuẩn và bàn giao cho "${recipient}"`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể hoàn tất nghiệm thu');
    } finally {
      setSaving(false);
    }
  };

  // 5. ACTION: Yêu cầu xử lý lại (Reject Modal Submit)
  const handleRejectReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!reworkReason.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập lý do không đạt và nội dung yêu cầu sửa lại');
      return;
    }

    setSaving(true);
    try {
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const inspector = user?.name || 'Bộ phận nghiệm thu';
      const reworkEntry = `\n\n[⚠️ YÊU CẦU SỬA LẠI - ${timeStr} bởi ${inspector}]:\n${reworkReason.trim()}`;
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
      setIsRejectModalOpen(false);
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.warning('Yêu cầu sửa lại', 'Đã chuyển phiếu về trạng thái Đang thực hiện cho kỹ thuật viên sửa chữa');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể gửi yêu cầu sửa lại');
    } finally {
      setSaving(false);
    }
  };

  // 5b. ACTION: Đổi người phụ trách / Điều chuyển nhân sự
  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!newPrimaryTechId) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn thợ cơ điện phụ trách chính');
      return;
    }

    setSaving(true);
    try {
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const oldTechName = job.assignedTechnician?.name || 'Chưa phân công';
      const newTechName = staffList.find((s) => s.id === newPrimaryTechId)?.name || 'Kỹ thuật viên mới';
      const actorName = user?.name || 'Quản trị viên';

      const transferNote = `\n\n[🔄 ĐIỀU CHUYỂN PHÂN CÔNG - ${timeStr} bởi ${actorName}]:\n• Chuyển từ: ${oldTechName} -> Sang: ${newTechName}${reassignNote.trim() ? `\n• Lý do: ${reassignNote.trim()}` : ''}`;
      const newResultNotes = resultNotes ? `${resultNotes}${transferNote}` : transferNote.trim();

      const updated = await api.updateFabricationOrder(job.id, {
        assignedTechnicianId: newPrimaryTechId,
        supporterIds: newSupporterIds,
        resultNotes: newResultNotes,
      });

      setJob(updated);
      setSelectedTechIds([newPrimaryTechId, ...newSupporterIds]);
      setResultNotes(newResultNotes);
      setIsReassignModalOpen(false);
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.success('Đã đổi người phụ trách', `Đã phân công lại cho "${newTechName}" thành công`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể đổi người phụ trách');
    } finally {
      setSaving(false);
    }
  };

  // 5c. ACTION: Ghi nhận tiến độ công việc & hình ảnh minh chứng
  const handleLogProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    if (!progressContent.trim()) {
      toast.warning('Thiếu nội dung', 'Vui lòng nhập nội dung thao tác đã thực hiện');
      return;
    }

    setSaving(true);
    try {
      // 1. Upload các ảnh đính kèm nếu có
      let newUploadedImgs: any[] = [];
      if (progressPhotos && progressPhotos.length > 0) {
        const uploadPromises = Array.from(progressPhotos).map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', 'FabricationOrder');
          formData.append('entityId', job.id);

          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
          const data = await res.json();
          const uploadedUrl = data.url || (data.path ? `${API_BASE}${data.path}` : null);
          return {
            url: uploadedUrl,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            size: file.size,
          };
        });
        const uploaded = await Promise.all(uploadPromises);
        newUploadedImgs = uploaded.filter((img) => img.url);
      }

      const combinedImgs = [...resultImages, ...newUploadedImgs];

      // 2. Format progress entry
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const performer = user?.name || 'Kỹ thuật viên';
      const logEntry = `\n\n[📝 TIẾN ĐỘ (${progressPercent}) - ${timeStr} bởi ${performer}]:\n• Nội dung: ${progressContent.trim()}${progressNotes.trim() ? `\n• Lưu ý: ${progressNotes.trim()}` : ''}${newUploadedImgs.length > 0 ? `\n• Kèm ${newUploadedImgs.length} ảnh minh chứng` : ''}`;
      const newResultNotes = resultNotes ? `${resultNotes}${logEntry}` : logEntry.trim();

      const updated = await api.updateFabricationOrder(job.id, {
        resultNotes: newResultNotes,
        resultImages: combinedImgs,
      });

      setJob(updated);
      setResultNotes(newResultNotes);
      setResultImages(combinedImgs);
      setProgressContent('');
      setProgressNotes('');
      setProgressPhotos(null);
      setIsLogProgressModalOpen(false);
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.success('Đã ghi nhận tiến độ', 'Nội dung công việc và ảnh minh chứng đã được cập nhật');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể lưu ghi nhận tiến độ');
    } finally {
      setSaving(false);
    }
  };

  // 5d. ACTION: Tạm dừng chế tạo (Pause)
  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    const finalReason = pauseReason === 'Lý do khác' ? (customPauseReason.trim() || 'Lý do khác') : pauseReason;

    setSaving(true);
    try {
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const performer = user?.name || 'Kỹ thuật viên';
      const pauseEntry = `\n\n[⏸️ TẠM DỪNG - ${timeStr} bởi ${performer}]:\n• Lý do: ${finalReason}`;
      const newResultNotes = resultNotes ? `${resultNotes}${pauseEntry}` : pauseEntry.trim();

      const updated = await api.updateFabricationOrder(job.id, {
        status: 'ON_HOLD',
        resultNotes: newResultNotes,
      });

      setJob(updated);
      setStatus('ON_HOLD');
      setResultNotes(newResultNotes);
      setIsPauseModalOpen(false);
      setCustomPauseReason('');
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.info('Đã tạm dừng công việc', `Lý do: ${finalReason}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể tạm dừng công việc');
    } finally {
      setSaving(false);
    }
  };

  // 5e. ACTION: Tiếp tục thực hiện (Resume)
  const handleResumeWork = async () => {
    if (!job) return;
    setSaving(true);
    try {
      const timeStr = new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const performer = user?.name || 'Kỹ thuật viên';
      const resumeEntry = `\n\n[▶️ TIẾP TỤC LÀM VIỆC - ${timeStr} bởi ${performer}]`;
      const newResultNotes = resultNotes ? `${resultNotes}${resumeEntry}` : resumeEntry.trim();

      const updated = await api.updateFabricationOrder(job.id, {
        status: 'IN_PROGRESS',
        resultNotes: newResultNotes,
      });

      setJob(updated);
      setStatus('IN_PROGRESS');
      setResultNotes(newResultNotes);
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.success('Tiếp tục chế tạo', 'Đã chuyển phiếu về trạng thái Đang thực hiện');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể tiếp tục công việc');
    } finally {
      setSaving(false);
    }
  };

  // 6. ACTION: Mở lại phiếu khi đã đóng (Admin)
  const handleReopenJob = async () => {
    const ok = await confirm(
      'Mở lại phiếu gia công',
      'Bạn có chắc chắn muốn mở lại phiếu gia công này không? Trạng thái sẽ được chuyển về Đang thực hiện.',
      { confirmText: 'Mở lại', cancelText: 'Hủy' }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await api.updateFabricationOrder(job.id, {
        status: 'IN_PROGRESS',
      });
      setJob(updated);
      setStatus('IN_PROGRESS');
      loadHistory(job.id);
      if (onUpdated) onUpdated(updated);
      toast.info('Đã mở lại phiếu', 'Phiếu đã được chuyển về trạng thái Đang thực hiện');
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể mở lại phiếu');
    } finally {
      setSaving(false);
    }
  };

  // 7. ACTION: Xóa phiếu
  const handleDeleteJob = async () => {
    if (!job) return;
    const ok = await confirm(
      'Xóa phiếu gia công',
      `Bạn có chắc chắn muốn xóa vĩnh viễn phiếu "${job.orderCode} - ${job.title}"?`,
      {
        confirmText: 'Xóa vĩnh viễn',
        cancelText: 'Hủy',
        type: 'danger',
      }
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await api.deleteFabricationOrder(job.id);
      toast.success('Đã xóa', 'Phiếu gia công đã được xóa thành công');
      if (onDeleted) onDeleted(job.id);
      if (onClose) onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể xóa phiếu gia công');
    } finally {
      setDeleting(false);
    }
  };

  // Handle uploading photos
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'FabricationOrder');
        formData.append('entityId', job.id);

        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        const data = await res.json();
        const uploadedUrl = data.url || (data.path ? `${API_BASE}${data.path}` : null);
        return {
          url: uploadedUrl,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size,
        };
      });

      const newUploaded = await Promise.all(uploadPromises);
      const validUploaded = newUploaded.filter((img) => img.url);
      const combined = [...resultImages, ...validUploaded];
      setResultImages(combined);

      // Persist directly
      await api.updateFabricationOrder(job.id, {
        resultImages: combined,
      });

      toast.success('Đã tải ảnh lên', `Tải thành công ${validUploaded.length} ảnh kết quả`);
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi tải ảnh', err.message || 'Không thể upload ảnh kết quả');
    } finally {
      setUploadingImage(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    const ok = await confirm('Xóa ảnh minh chứng', 'Bạn có chắc muốn xóa ảnh kết quả này?');
    if (!ok) return;

    const updated = resultImages.filter((_, idx) => idx !== index);
    setResultImages(updated);
    try {
      await api.updateFabricationOrder(job.id, {
        resultImages: updated,
      });
      toast.info('Đã xóa ảnh', 'Ảnh minh chứng đã được gỡ');
    } catch (e) {
      console.error(e);
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

  const getAuditActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { text: 'Khởi tạo phiếu', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'START_WORK':
        return { text: 'Bắt đầu làm việc', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
      case 'COMPLETE_WORK':
        return { text: 'Báo cáo hoàn thành', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      case 'ACCEPT_HANDOVER':
        return { text: 'Đạt nghiệm thu & Bàn giao', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'REJECT_REWORK':
        return { text: 'Nghiệm thu không đạt (Sửa lại)', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
      case 'REOPEN':
        return { text: 'Mở lại phiếu', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'UPDATE':
      default:
        return { text: 'Cập nhật', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  if (loading || !job) {
    return (
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <DetailViewSkeleton />
      </div>
    );
  }

  return (
    <div
      className="work-order-detail-view"
      style={{
        flex: 1,
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
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

      {/* Title Bar (Synchronized with WorkOrderDetailView) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          gap: '12px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e3a8a' }}>
          {job.title} <span style={{ color: 'var(--text-muted)' }}>- {job.orderCode}</span>
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canDelete && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDeleteJob}
              disabled={deleting || saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#ef4444',
                borderColor: '#fca5a5',
                backgroundColor: '#fef2f2',
                fontWeight: 600,
              }}
              title="Xóa phiếu gia công này"
            >
              <Trash2 size={13} /> {deleting ? 'Đang xóa...' : 'Xóa phiếu'}
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
          >
            <Printer size={13} /> In phiếu
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSave()}
            disabled={saving || deleting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
          >
            <Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="btn-icon"
              title="Đóng chi tiết"
              style={{
                marginLeft: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >
              <XOctagon size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Detail Container */}
      <div
        className="work-order-detail-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
        }}
      >
        {/* TOP HEADER CARD - ACTION GRID (Identical to WorkOrder Header) */}
        <div
          className="card no-print"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: '24px' }}>
            {job.title} - {job.orderCode}
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
            {status === 'ASSIGNED' && (
              <ActionButton
                onClick={handleStartWork}
                disabled={saving || deleting}
                icon={Play}
                label="Bắt đầu chế tạo"
                color="#3b82f6"
              />
            )}

            {['ASSIGNED', 'IN_PROGRESS'].includes(status) && (
              <ActionButton
                onClick={() => {
                  setNewPrimaryTechId(job.assignedTechnicianId || selectedTechIds[0] || '');
                  setNewSupporterIds(selectedTechIds.length > 1 ? selectedTechIds.slice(1) : []);
                  setReassignNote('');
                  setIsReassignModalOpen(true);
                }}
                disabled={saving || deleting}
                icon={ArrowRightLeft}
                label="Đổi người phụ trách"
                color="#6366f1"
              />
            )}

            {status === 'IN_PROGRESS' && (
              <>
                <ActionButton
                  onClick={() => setIsLogProgressModalOpen(true)}
                  disabled={saving || deleting}
                  icon={Plus}
                  label="Ghi nhận tiến độ"
                  color="#8b5cf6"
                />
                <ActionButton
                  onClick={() => setIsPauseModalOpen(true)}
                  disabled={saving || deleting}
                  icon={Pause}
                  label="Tạm dừng"
                  color="#f59e0b"
                />
                <ActionButton
                  onClick={handleCompleteWork}
                  disabled={saving || deleting}
                  icon={CheckCircle2}
                  label={acceptanceRating === 'REWORK' ? 'Báo cáo hoàn thành lại' : 'Báo cáo hoàn thành'}
                  color="#10b981"
                />
              </>
            )}

            {status === 'ON_HOLD' && (
              <ActionButton
                onClick={handleResumeWork}
                disabled={saving || deleting}
                icon={Play}
                label="Tiếp tục chế tạo"
                color="#3b82f6"
              />
            )}

            {status === 'COMPLETED' && (
              <>
                <ActionButton
                  onClick={() => {
                    setAcceptedByName(acceptedByName || user?.name || '');
                    setIsAcceptanceModalOpen(true);
                  }}
                  disabled={saving || deleting}
                  icon={ShieldCheck}
                  label="Nghiệm thu bàn giao (Xưởng)"
                  color="#059669"
                />
                <ActionButton
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={saving || deleting}
                  icon={XOctagon}
                  label="Yêu cầu sửa lại"
                  color="#ef4444"
                />
              </>
            )}

            {status === 'CLOSED' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  color: '#047857',
                  fontSize: '13.5px',
                }}
              >
                <Lock size={20} />
                <span>
                  Phiếu gia công đã được <strong>Phân xưởng</strong> nghiệm thu và bàn giao hoàn tất. Thao tác đã khóa.
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleReopenJob}
                    disabled={saving || deleting}
                    style={{ marginLeft: '12px', fontSize: '11.5px', color: '#64748b' }}
                    title="Mở lại phiếu nếu có phát sinh"
                  >
                    <RotateCcw size={12} style={{ marginRight: '4px' }} /> Mở lại
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* METADATA TABLE CARD (Synchronized with WorkOrderMetadata style) */}
        <div
          className="card no-print"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', width: '25%', color: 'var(--text-secondary)' }}>Mã phiếu gia công</td>
                <td style={{ padding: '12px 0', fontWeight: 700, color: '#2563eb' }}>{job.orderCode}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Tên công việc / Sản phẩm</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{job.title}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Phân loại hình thức</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>{getCategoryLabel(job.category)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Trạng thái</td>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={job.status} />
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
                        ⚠️ CẦN SỬA CHỮA LẠI THEO YÊU CẦU NGHIỆM THU
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mức độ ưu tiên</td>
                <td style={{ padding: '12px 0' }}>
                  <PriorityBadge priority={job.priority} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Bộ phận yêu cầu / Thụ hưởng</td>
                <td style={{ padding: '12px 0', fontWeight: 600 }}>
                  {job.targetDepartment || 'Toàn phân xưởng'} {job.location && `— Vị trí: ${job.location}`}
                </td>
              </tr>
              {job.equipment && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thiết bị liên quan</td>
                  <td style={{ padding: '12px 0', fontWeight: 600 }}>{job.equipment.code} - {job.equipment.name}</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Người giao việc / Tạo phiếu</td>
                <td style={{ padding: '12px 0' }}>{job.creator?.name || 'Hệ thống'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thợ cơ điện phụ trách</td>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>
                        {job.assignedTechnician?.name || (selectedTechIds.length > 0 ? staffList.find(s => s.id === selectedTechIds[0])?.name : 'Chưa phân công')}
                      </strong>
                      {selectedTechIds.length > 1 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '6px' }}>
                          (+ {selectedTechIds.slice(1).map(id => staffList.find(s => s.id === id)?.name).filter(Boolean).join(', ')})
                        </span>
                      )}
                    </div>
                    {status !== 'CLOSED' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setNewPrimaryTechId(job.assignedTechnicianId || selectedTechIds[0] || '');
                          setNewSupporterIds(selectedTechIds.length > 1 ? selectedTechIds.slice(1) : []);
                          setReassignNote('');
                          setIsReassignModalOpen(true);
                        }}
                        style={{ fontSize: '11.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Đổi thợ cơ điện phụ trách"
                      >
                        <ArrowRightLeft size={12} /> Đổi người
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Ngày tạo</td>
                <td style={{ padding: '12px 0' }}>{formatDateTimeDisplay(job.createdAt)}</td>
              </tr>
              {job.plannedEndDate && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Hạn hoàn thành kế hoạch</td>
                  <td style={{ padding: '12px 0', fontWeight: 600 }}>{formatDateTimeDisplay(job.plannedEndDate)}</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Thời gian thực hiện thực tế</td>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    <span>Bắt đầu: <strong>{formatDateTimeDisplay(actualStartDate)}</strong></span>
                    <span>Hoàn thành: <strong>{formatDateTimeDisplay(actualEndDate)}</strong></span>
                    {status === 'IN_PROGRESS' && elapsedSeconds > 0 && (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#10b981',
                          backgroundColor: '#ecfdf5',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Timer size={13} className="animate-spin" /> Đang tính giờ: {formatElapsed(elapsedSeconds)}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Giờ công thực tế</td>
                <td style={{ padding: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '15px', color: '#2563eb' }}>{actualHours} giờ</strong>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>(Dự kiến: {job.estimatedHours || 0}h)</span>
                    {status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={handleRecalculateHours}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Tính lại theo mốc giờ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {job.specifications && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Quy cách kỹ thuật / Bản vẽ</td>
                  <td style={{ padding: '12px 0', fontWeight: 600, color: '#334155' }}>{job.specifications}</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Mô tả yêu cầu</td>
                <td style={{ padding: '12px 0', lineHeight: '1.5' }}>{job.description}</td>
              </tr>
              {resultNotes && (
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 0', color: 'var(--text-secondary)' }}>Ghi chú kết quả & Nghiệm thu</td>
                  <td style={{ padding: '12px 0', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#1e293b' }}>
                    {resultNotes}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 2: VẬT TƯ & PHÔI THÔ SỬ DỤNG */}
        <div
          id="record-materials-section"
          className="card no-print"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="#2563eb" /> Vật tư phôi thô sử dụng thực tế
            </h3>
            {status !== 'CLOSED' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddMaterial}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}
              >
                <Plus size={14} /> Thêm vật tư
              </button>
            )}
          </div>

          {materials.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
              Chưa ghi nhận vật tư phôi thô sử dụng. Bấm "Thêm vật tư" để kê khai.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="custom-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                    <th>Tên vật tư / Phôi thô</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>SL</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Đơn giá (đ)</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền (đ)</th>
                    {status !== 'CLOSED' && <th style={{ width: '50px', textAlign: 'center' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '32px', fontSize: '12.5px' }}
                          disabled={status === 'CLOSED'}
                          placeholder="VD: Thép tấm Inox 304 dày 3mm..."
                          value={m.materialName}
                          onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          className="form-input"
                          style={{ height: '32px', fontSize: '12.5px', textAlign: 'center' }}
                          disabled={status === 'CLOSED'}
                          value={m.quantity}
                          onChange={(e) => handleMaterialChange(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '32px', fontSize: '12.5px', textAlign: 'center' }}
                          disabled={status === 'CLOSED'}
                          placeholder="cái, kg..."
                          value={m.unit}
                          onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          className="form-input"
                          style={{ height: '32px', fontSize: '12.5px', textAlign: 'right' }}
                          disabled={status === 'CLOSED'}
                          value={m.unitPrice}
                          onChange={(e) => handleMaterialChange(idx, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {((Number(m.quantity) || 0) * (Number(m.unitPrice) || 0)).toLocaleString('vi-VN')} đ
                      </td>
                      {status !== 'CLOSED' && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            title="Xóa dòng"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={status !== 'CLOSED' ? 5 : 4} style={{ textAlign: 'right', fontWeight: 700, padding: '10px' }}>
                      Tổng chi phí vật tư:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f766e', fontSize: '14px', padding: '10px' }}>
                      {totalMaterialCost.toLocaleString('vi-VN')} đ
                    </td>
                    {status !== 'CLOSED' && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 3: HÌNH ẢNH MINH CHỨNG KẾT QUẢ */}
        <div
          className="card no-print"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} color="#2563eb" /> Hình ảnh minh chứng sản phẩm & nghiệm thu ({resultImages.length})
            </h3>
            {status !== 'CLOSED' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}
                >
                  <Camera size={14} /> Chụp ảnh
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12.5px' }}
                >
                  <Upload size={14} /> Tải ảnh lên
                </button>
              </div>
            )}
          </div>

          {resultImages.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
              Chưa có hình ảnh minh chứng sản phẩm. Dùng nút "Chụp ảnh" hoặc "Tải ảnh lên" để cập nhật.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {resultImages.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#000',
                    aspectRatio: '1',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.name || `Ảnh ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(img.url)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      display: 'flex',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img.url)}
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '3px',
                        cursor: 'pointer',
                      }}
                      title="Xem phóng to"
                    >
                      <ZoomIn size={13} />
                    </button>
                    {status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.85)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px',
                          cursor: 'pointer',
                        }}
                        title="Xóa ảnh"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: AUDIT TRAIL / TIMELINE (CMMS Standard) */}
        <div
          className="card no-print"
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="#2563eb" /> Lịch sử thao tác & Nhật ký tiến trình (Audit Trail)
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadHistory(job.id)}
              disabled={loadingHistory}
              title="Làm mới lịch sử"
            >
              <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '13px' }}>
              Chưa có bản ghi lịch sử thao tác nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((hItem) => {
                const bStyle = getAuditActionBadge(hItem.action);
                return (
                  <div
                    key={hItem.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: bStyle.bg,
                            color: bStyle.color,
                            border: `1px solid ${bStyle.border}`,
                          }}
                        >
                          {bStyle.text}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                          {hItem.performedBy?.name || 'Hệ thống'}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {formatDateTimeDisplay(hItem.createdAt)}
                      </span>
                    </div>
                    {hItem.note && (
                      <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                        {hItem.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS (ALIGNED WITH WORKORDER ACCEPTANCE FLOW) ── */}

      {/* 0. Modal Đổi người phụ trách / Điều chuyển nhân sự */}
      {isReassignModalOpen && (
        <Modal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          title={`Đổi người phụ trách: ${job.orderCode}`}
          maxWidth="560px"
        >
          <form onSubmit={handleReassignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '13px', color: '#3730a3' }}>
              Điều chuyển hoặc phân công lại thợ cơ điện phụ trách công việc gia công/chế tạo này.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Thợ cơ điện phụ trách chính *</label>
              <select
                className="form-select"
                required
                value={newPrimaryTechId}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPrimaryTechId(val);
                  setNewSupporterIds(newSupporterIds.filter((id) => id !== val));
                }}
              >
                <option value="">-- Chọn kỹ thuật viên phụ trách --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.specialty || s.department || 'Cơ điện'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Thợ cơ điện phối hợp / hỗ trợ (Tùy chọn)</label>
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'var(--bg-card)' }}>
                {staffList
                  .filter((s) => s.id !== newPrimaryTechId)
                  .map((s) => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newSupporterIds.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSupporterIds([...newSupporterIds, s.id]);
                          } else {
                            setNewSupporterIds(newSupporterIds.filter((id) => id !== s.id));
                          }
                        }}
                      />
                      <span>{s.name} ({s.specialty || 'Thợ cơ điện'})</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Lý do điều chuyển / Ghi chú</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Nhập lý do thay đổi người phụ trách (VD: Nhân sự bận đột xuất, chuyển giao theo chuyên môn phay/tiện...)"
                value={reassignNote}
                onChange={(e) => setReassignNote(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReassignModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !newPrimaryTechId}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận điều chuyển"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 0b. Modal Ghi nhận tiến độ gia công & chế tạo */}
      {isLogProgressModalOpen && (
        <Modal
          isOpen={isLogProgressModalOpen}
          onClose={() => setIsLogProgressModalOpen(false)}
          title={`Ghi nhận tiến độ công việc: ${job.orderCode}`}
          maxWidth="600px"
        >
          <form onSubmit={handleLogProgressSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '13px', color: '#6d28d9' }}>
              Ghi lại nội dung thao tác, giai đoạn hoàn thành và ảnh minh chứng thực tế cho công việc này.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Nội dung thao tác / công việc đã thực hiện *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="VD: Đã cắt phôi thép tấm theo kích thước 500x300mm, mài nhẵn bavia, tiện ren trục chính..."
                value={progressContent}
                onChange={(e) => setProgressContent(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Ước tính tiến độ đạt được *</label>
                <select
                  className="form-select"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(e.target.value)}
                >
                  <option value="25%">25% - Hoàn thành cắt/chuẩn bị phôi</option>
                  <option value="50%">50% - Đang gia công chi tiết cơ khí</option>
                  <option value="75%">75% - Hoàn thiện tiện/phay/hàn cơ bản</option>
                  <option value="90%">90% - Đang mài bóng & xử lý bề mặt</option>
                  <option value="99%">99% - Sẵn sàng nghiệm thu thử tải</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Lưu ý kỹ thuật (Tùy chọn)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ghi chú về dung sai, thông số đo..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <Camera size={18} color="#2563eb" /> Đính kèm ảnh minh chứng tiến độ (Chụp hoặc chọn file)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="form-input"
                onChange={(e) => setProgressPhotos(e.target.files)}
              />
              {progressPhotos && progressPhotos.length > 0 && (
                <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                  Đã chọn {progressPhotos.length} ảnh để tải lên.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsLogProgressModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !progressContent.trim()}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : "Lưu ghi nhận tiến độ"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 0c. Modal Xác nhận Tạm dừng chế tạo */}
      {isPauseModalOpen && (
        <Modal
          isOpen={isPauseModalOpen}
          onClose={() => setIsPauseModalOpen(false)}
          title={`Tạm dừng công việc: ${job.orderCode}`}
          maxWidth="520px"
        >
          <form onSubmit={handlePauseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '13px', color: '#b45309' }}>
              Công việc sẽ được chuyển sang trạng thái <strong>Tạm dừng</strong> và dừng bộ đếm giờ công thực tế cho đến khi được tiếp tục.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Lý do tạm dừng *</label>
              <select
                className="form-select"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              >
                <option value="Chờ vật tư / phôi thô">Chờ vật tư / phôi thô</option>
                <option value="Chờ máy gia công (máy tiện/phay bận)">Chờ máy gia công (máy tiện/phay bận)</option>
                <option value="Chờ bản vẽ / duyệt quy cách kỹ thuật">Chờ bản vẽ / duyệt quy cách kỹ thuật</option>
                <option value="Chờ phân xưởng bàn giao mặt bằng/thiết bị">Chờ phân xưởng bàn giao mặt bằng/thiết bị</option>
                <option value="Hết ca làm việc">Hết ca làm việc</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            {pauseReason === 'Lý do khác' && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Chi tiết lý do khác *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ghi rõ lý do tạm dừng chi tiết..."
                  value={customPauseReason}
                  onChange={(e) => setCustomPauseReason(e.target.value)}
                />
              </div>
            )}

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPauseModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-warning" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận tạm dừng"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 1. Modal Biên bản Nghiệm thu Bàn giao (Phân xưởng) */}
      {isAcceptanceModalOpen && (
        <Modal
          isOpen={isAcceptanceModalOpen}
          onClose={() => setIsAcceptanceModalOpen(false)}
          title={`Biên bản Nghiệm thu Bàn giao (Phân xưởng): ${job.orderCode}`}
          maxWidth="620px"
        >
          <form onSubmit={handleWorkshopAcceptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '13px', color: '#065f46' }}>
              <strong>Lưu ý:</strong> Sau khi phân xưởng nghiệm thu đạt, sản phẩm gia công/chế tạo sẽ được bàn giao chính thức cho bộ phận thụ hưởng và khóa hoàn tất phiếu.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Tình trạng quy cách & kích thước bản vẽ *</label>
              <select
                className="form-select"
                value={testRunResult}
                onChange={(e) => setTestRunResult(e.target.value)}
              >
                <option value="Đúng bản vẽ & quy cách kỹ thuật, dung sai chuẩn xác">Đúng bản vẽ & quy cách kỹ thuật, dung sai chuẩn xác</option>
                <option value="Đạt tiêu chuẩn sử dụng thực tế, dung sai trong mức cho phép">Đạt tiêu chuẩn sử dụng thực tế, dung sai trong mức cho phép</option>
                <option value="Đạt mức cơ bản, cần theo dõi thêm trong quá trình vận hành">Đạt mức cơ bản, cần theo dõi thêm trong quá trình vận hành</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Tình trạng mài nhẵn bavia & vệ sinh 5S *</label>
              <select
                className="form-select"
                value={cleanlinessResult}
                onChange={(e) => setCleanlinessResult(e.target.value)}
              >
                <option value="Bề mặt mài nhẵn bavia, đã xử lý sơn/chống rỉ, đạt tiêu chuẩn 5S">Bề mặt mài nhẵn bavia, đã xử lý sơn/chống rỉ, đạt tiêu chuẩn 5S</option>
                <option value="Đã mài nhẵn sơ bộ, khu vực lắp đặt sạch sẽ không rơi vãi phôi thừa">Đã mài nhẵn sơ bộ, khu vực lắp đặt sạch sẽ không rơi vãi phôi thừa</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Đánh giá xếp loại *</label>
                <select
                  className="form-select"
                  value={acceptanceRating}
                  onChange={(e) => setAcceptanceRating(e.target.value)}
                >
                  <option value="EXCELLENT">⭐ Xuất sắc (Vượt tiến độ / Chuẩn xác cao)</option>
                  <option value="GOOD">✅ Đạt chuẩn chất lượng kỹ thuật</option>
                  <option value="ACCEPTABLE">🆗 Chấp nhận được (Cần lưu ý thêm)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Người đại diện tiếp nhận *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Nhập họ tên người nhận..."
                  value={acceptedByName}
                  onChange={(e) => setAcceptedByName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Ý kiến / Nhận xét của bên tiếp nhận *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Nhập ý kiến cụ thể từ bên tiếp nhận (VD: Đã lắp thử nghiệm vào dây chuyền, máy vận hành êm, chi tiết cơ khí khớp tốt...)"
                value={workshopComment}
                onChange={(e) => setWorkshopComment(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={() => {
                  setIsAcceptanceModalOpen(false);
                  setIsRejectModalOpen(true);
                }}
              >
                Yêu cầu xử lý lại
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAcceptanceModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận Nghiệm thu & Bàn giao"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Modal Yêu cầu xử lý lại (Từ chối nghiệm thu) */}
      {isRejectModalOpen && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title="Yêu cầu xử lý lại (Từ chối nghiệm thu)"
          maxWidth="540px"
        >
          <form onSubmit={handleRejectReworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', color: '#991b1b' }}>
              Phiếu công việc sẽ được chuyển ngược lại trạng thái <strong>"Đang thực hiện"</strong> để kỹ thuật viên tiến hành sửa chữa theo nội dung yêu cầu bên dưới.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#e11d48' }}>Lý do yêu cầu xử lý lại & Chỉ dẫn cụ thể *</label>
              <textarea
                className="form-input"
                rows={4}
                required
                placeholder="Ghi rõ các lỗi cần khắc phục (VD: Kích thước thanh giằng bị lệch 3mm, mối hàn chân đế chưa ngấu, bavia chưa mài phẳng...)"
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsRejectModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-danger" disabled={saving || !reworkReason.trim()}>
                {saving ? <Loader2 className="animate-spin" size={14} /> : "Xác nhận gửi yêu cầu xử lý lại"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Modal Xem ảnh phóng to */}
      {previewImage && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
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

      {/* 4. PRINTABLE REPORT SHEET (Khổ A4 chuẩn CMMS Dược Khoa) */}
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

export default FabricationDetailView;
