import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatVN } from '../utils/formatters';
import { useToast } from '../components/common/Toast';

interface UseUtilityScanFormOptions {
  selectedPoint: any | null;
  setSelectedPoint: Dispatch<SetStateAction<any | null>>;
  resumeScanning: () => void;
}

export function useUtilityScanForm({
  selectedPoint,
  setSelectedPoint,
  resumeScanning,
}: UseUtilityScanFormOptions) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [readingValue, setReadingValue] = useState('');
  const [normalValue, setNormalValue] = useState('');
  const [peakValue, setPeakValue] = useState('');
  const [offPeakValue, setOffPeakValue] = useState('');
  const [powerKw, setPowerKw] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [notes, setNotes] = useState('');
  const [systemStatus, setSystemStatus] = useState('RUNNING');
  const [runningHours, setRunningHours] = useState('');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    if (!selectedPoint) return;
    setReadingValue('');
    setNormalValue('');
    setPeakValue('');
    setOffPeakValue('');
    setPowerKw('');
    setPowerFactor('');
    setNotes('');
    setSystemStatus(selectedPoint.currentStatus || 'RUNNING');
    setRunningHours(selectedPoint.lastReadingValue ? selectedPoint.lastReadingValue.toString() : '');
    setStatusReason('');
  }, [selectedPoint]);

  const previousValue = selectedPoint?.lastReadingValue || 0;
  const multiplier = selectedPoint?.multiplier || 1;
  const currentNum = parseFloat(readingValue);
  const difference = Number.isNaN(currentNum) ? 0 : currentNum - previousValue;
  const calculatedConsumption = difference >= 0 ? difference * multiplier : 0;
  const isSmallerThanPrevious = !Number.isNaN(currentNum)
    && previousValue > 0
    && currentNum < previousValue;
  const isOutlier = !Number.isNaN(currentNum)
    && previousValue > 0
    && difference > previousValue * 1.5;

  const finishSubmission = () => {
    setSelectedPoint(null);
    resumeScanning();
  };

  const handleSubmitReading = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPoint) return;
    if (Number.isNaN(parseFloat(readingValue))) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập chỉ số mới hợp lệ.');
      return;
    }
    if (isSmallerThanPrevious) {
      toast.error(
        'Chặn chỉ số không hợp lệ',
        'Chỉ số mới (' + currentNum + ') không được nhỏ hơn chỉ số trước ('
          + previousValue + ' ' + selectedPoint.unit + '). Vui lòng kiểm tra lại mặt đồng hồ!',
      );
      return;
    }

    try {
      setSubmitting(true);
      await api.recordUtilityReading({
        pointId: selectedPoint.id,
        readingValue: parseFloat(readingValue),
        normalValue: normalValue ? parseFloat(normalValue) : undefined,
        peakValue: peakValue ? parseFloat(peakValue) : undefined,
        offPeakValue: offPeakValue ? parseFloat(offPeakValue) : undefined,
        powerKw: powerKw ? parseFloat(powerKw) : undefined,
        powerFactorCosPhi: powerFactor ? parseFloat(powerFactor) : undefined,
        notes,
      });
      toast.success(
        'Thành công',
        'Đã ghi nhận chỉ số ' + selectedPoint.name + ': ' + readingValue + ' '
          + selectedPoint.unit + ' (Tiêu thụ: +' + formatVN(calculatedConsumption)
          + ' ' + selectedPoint.unit + ').',
      );
      finishSubmission();
    } catch (error: any) {
      toast.error('Lỗi lưu chỉ số', error?.message || 'Có lỗi xảy ra khi lưu chỉ số.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSystemStatus = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPoint) return;
    try {
      setSubmitting(true);
      await api.recordUtilitySystemStatus({
        pointId: selectedPoint.id,
        status: systemStatus as any,
        runningHours: runningHours ? parseFloat(runningHours) : undefined,
        reason: statusReason,
      });
      toast.success(
        'Thành công',
        'Đã cập nhật trạng thái ' + selectedPoint.name + ' thành [' + systemStatus + '].',
      );
      finishSubmission();
    } catch (error: any) {
      toast.error('Lỗi cập nhật', error?.message || 'Có lỗi xảy ra khi cập nhật trạng thái.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitting,
    readingValue, setReadingValue,
    normalValue, setNormalValue,
    peakValue, setPeakValue,
    offPeakValue, setOffPeakValue,
    powerKw, setPowerKw,
    powerFactor, setPowerFactor,
    notes, setNotes,
    systemStatus, setSystemStatus,
    runningHours, setRunningHours,
    statusReason, setStatusReason,
    previousValue, currentNum, calculatedConsumption,
    isSmallerThanPrevious, isOutlier,
    handleSubmitReading, handleSubmitSystemStatus,
  };
}
