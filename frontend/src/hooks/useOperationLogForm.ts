import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { usePermissions } from './usePermissions';
import { Html5QrcodeScanner } from 'html5-qrcode';

export interface EquipmentParam {
  id: string;
  name: string;
  unit?: string | null;
  minSpec?: number | null;
  maxSpec?: number | null;
  standardValue?: number | null;
  displayOrder?: number;
  isActive: boolean;
}

/** Check if a specific parameter input value is out of spec */
export function checkSpecStatus(param: EquipmentParam, valueStr?: string) {
  if (!valueStr || valueStr.trim() === '') return 'EMPTY';
  const val = parseFloat(valueStr);
  if (isNaN(val)) return 'INVALID';

  const hasMin = param.minSpec !== null && param.minSpec !== undefined;
  const hasMax = param.maxSpec !== null && param.maxSpec !== undefined;

  if (hasMin && val < (param.minSpec as number)) return 'OUT_OF_SPEC_LOW';
  if (hasMax && val > (param.maxSpec as number)) return 'OUT_OF_SPEC_HIGH';

  return 'NORMAL';
}

export function useOperationLogForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { can } = usePermissions();
  const canReorder = can('equipment:reorder_parameters');

  const initialVerified = Boolean(location.state?.verifiedByQr);
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [verifiedTime, setVerifiedTime] = useState<string>(
    location.state?.scannedAt || (initialVerified ? new Date().toISOString() : '')
  );
  const [scanError, setScanError] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<EquipmentParam[]>([]);
  const originalParamsRef = useRef<EquipmentParam[]>([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  // QR Scanner Verification Effect when not verified yet
  useEffect(() => {
    let scanner: any = null;
    if (!isVerified && equipment) {
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "op-log-qr-reader",
            { fps: 10, qrbox: { width: 230, height: 230 } },
            false
          );

          scanner.render(
            async (decodedText: string) => {
              try {
                let rawText = decodedText.trim();
                if (rawText.startsWith('{') && rawText.endsWith('}')) {
                  try {
                    const parsed = JSON.parse(rawText);
                    rawText = parsed.code || parsed.equipmentCode || parsed.equipmentId || parsed.id || rawText;
                  } catch (_) {}
                }

                if (rawText.includes('/equipment/')) {
                  const match = rawText.match(/\/equipment\/([^/?#]+)/);
                  if (match) rawText = match[1];
                } else {
                  rawText = rawText
                    .replace(/^cmms-equipment:/i, '')
                    .replace(/^equipment:/i, '')
                    .replace(/^equipment\//i, '')
                    .trim();
                }

                if (rawText.includes('$')) {
                  rawText = rawText.split('$')[0].trim();
                }

                const matchesCurrent =
                  equipment.id?.toLowerCase() === rawText.toLowerCase() ||
                  equipment.code?.toLowerCase() === rawText.toLowerCase() ||
                  (equipment.oldCode && equipment.oldCode.toLowerCase() === rawText.toLowerCase()) ||
                  (equipment.accountingCode && equipment.accountingCode.toLowerCase() === rawText.toLowerCase());

                if (matchesCurrent) {
                  scanner.clear().catch(console.error);
                  setIsVerified(true);
                  setVerifiedTime(new Date().toISOString());
                  setScanError(null);
                  toast.success('Xác thực thành công', `Đã xác nhận bạn đang có mặt tại thiết bị ${equipment.code} - ${equipment.name}.`);
                } else {
                  setScanError(`Mã QR vừa quét ("${rawText}") không khớp với máy ${equipment.code}. Vui lòng quét đúng tem QR dán trên thân máy.`);
                }
              } catch (e: any) {
                console.error(e);
              }
            },
            () => {}
          );
        } catch (e) {
          console.error(e);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(console.error);
        }
      };
    }
  }, [isVerified, equipment]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [eqRes, paramRes] = await Promise.all([
          api.getEquipmentById(id),
          api.getEquipmentParameters(id),
        ]);
        setEquipment(eqRes);
        const activeParams = (Array.isArray(paramRes) ? paramRes : []).filter(
          (p: any) => p.isActive !== false
        );
        setParameters(activeParams);
        originalParamsRef.current = [...activeParams];
      } catch (error: any) {
        toast.error('Lỗi', 'Không thể tải thông tin thiết bị hoặc thông số vận hành.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleInputChange = useCallback((paramId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  }, []);

  // Reordering handlers (ADMIN only)
  const moveParamUp = useCallback((index: number) => {
    if (index <= 0) return;
    setParameters((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  const moveParamDown = useCallback((index: number) => {
    setParameters((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  }, []);

  const saveParamOrder = useCallback(async () => {
    if (!id || parameters.length === 0) return;
    try {
      setSavingOrder(true);
      const orderIds = parameters.map((p) => p.id);
      await api.reorderEquipmentParameters(id, orderIds);
      toast.success('Thành công', 'Đã lưu thứ tự hiển thị thông số vận hành!');
      setIsReorderMode(false);
      originalParamsRef.current = [...parameters];
    } catch (err: any) {
      toast.error('Lỗi lưu thứ tự', err.message || 'Không thể cập nhật thứ tự.');
    } finally {
      setSavingOrder(false);
    }
  }, [id, parameters, toast]);

  const cancelReorder = useCallback(() => {
    setParameters([...originalParamsRef.current]);
    setIsReorderMode(false);
  }, []);

  // Count total outliers in real-time
  const outlierCount = useMemo(() => {
    return parameters.filter((param) => {
      const status = checkSpecStatus(param, formData[param.id]);
      return status === 'OUT_OF_SPEC_LOW' || status === 'OUT_OF_SPEC_HIGH';
    }).length;
  }, [parameters, formData]);

  const onFinish = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSubmitting(true);
      const logs = Object.keys(formData)
        .map((paramId) => ({
          parameterId: paramId,
          value: Number(formData[paramId]),
          notes: notes.trim() || undefined,
        }))
        .filter((log) => !isNaN(log.value));

      if (logs.length === 0) {
        toast.error('Chưa có số liệu', 'Vui lòng nhập ít nhất một giá trị thông số hợp lệ.');
        setSubmitting(false);
        return;
      }

      await api.submitOperationLogs(id, logs);
      toast.success('Thành công', 'Đã lưu thông số vận hành thành công vào Sổ vận hành!');
      
      // Navigate to operation logs page or stay
      navigate('/operation-logs');
    } catch (error: any) {
      toast.error('Lỗi lưu sổ vận hành', error.message || 'Không thể lưu thông số.');
    } finally {
      setSubmitting(false);
    }
  }, [id, formData, notes, toast, navigate]);

  return {
    // Navigation
    navigate,

    // QR Verification
    isVerified,
    verifiedTime,
    scanError,

    // Data
    equipment,
    parameters,
    loading,
    submitting,
    formData,
    notes,
    setNotes,
    outlierCount,

    // Handlers
    handleInputChange,
    onFinish,

    // Parameter Reorder feature (RBAC)
    canReorder,
    isAdmin: canReorder,
    isReorderMode,
    setIsReorderMode,
    savingOrder,
    moveParamUp,
    moveParamDown,
    saveParamOrder,
    cancelReorder,
  };
}
