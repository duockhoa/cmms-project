import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface OeeShiftInputFormProps {
  equipment: any;
  verifiedTime?: string;
  recordedVia?: 'QR_APP' | 'WEB_APP';
  onSuccess?: (record: any) => void;
  onCancel?: () => void;
}

interface TimeEntryRow {
  key: string;
  label: string;
  categoryType: 'PLANNED' | 'UNPLANNED' | 'RUN';
  start1: string;
  end1: string;
  start2: string;
  end2: string;
  manualMinutes: string;
  note: string;
}

interface DefectLogRow {
  id: string;
  time: string;
  quantity: string;
  reason: string;
}

function parseFlexibleTime(str: string): number | null {
  if (!str || !str.trim()) return null;
  const cleaned = str.trim().toLowerCase().replace(/['’p\s]/g, '');
  if (cleaned.includes('h')) {
    const [hPart, mPart] = cleaned.split('h');
    const h = parseInt(hPart, 10);
    const m = mPart ? parseInt(mPart, 10) : 0;
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 24 && m >= 0 && m < 60) {
      return h * 60 + m;
    }
  }
  if (cleaned.includes(':')) {
    const [hPart, mPart] = cleaned.split(':');
    const h = parseInt(hPart, 10);
    const m = mPart ? parseInt(mPart, 10) : 0;
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 24 && m >= 0 && m < 60) {
      return h * 60 + m;
    }
  }
  const num = Number(cleaned);
  if (!isNaN(num) && num >= 0 && num <= 24) {
    return Math.round(num * 60);
  }
  return null;
}

function calcIntervalMinutes(startStr: string, endStr: string): number {
  const s = parseFlexibleTime(startStr);
  const e = parseFlexibleTime(endStr);
  if (s === null || e === null) return 0;
  if (e >= s) return e - s;
  return 24 * 60 - s + e;
}

function calcRowMinutes(row: TimeEntryRow): number {
  const d1 = calcIntervalMinutes(row.start1, row.end1);
  const d2 = calcIntervalMinutes(row.start2, row.end2);
  const fromIntervals = d1 + d2;
  if (fromIntervals > 0) return fromIntervals;
  return Math.max(0, Number(row.manualMinutes) || 0);
}

const INITIAL_ROWS: TimeEntryRow[] = [
  {
    key: 'cleaning',
    label: 'Vệ sinh',
    categoryType: 'PLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'adjustment',
    label: 'Chỉnh máy',
    categoryType: 'UNPLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'running',
    label: 'Chạy máy',
    categoryType: 'RUN',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'breakShift',
    label: 'Nghỉ ca',
    categoryType: 'PLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'breakdown',
    label: 'Hỏng máy',
    categoryType: 'UNPLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'noOperator',
    label: 'Thiếu người',
    categoryType: 'UNPLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'qualityProcess',
    label: 'Chất lượng / quá trình',
    categoryType: 'UNPLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
  {
    key: 'otherWaiting',
    label: 'Chờ khác',
    categoryType: 'UNPLANNED',
    start1: '',
    end1: '',
    start2: '',
    end2: '',
    manualMinutes: '',
    note: '',
  },
];

export const OeeShiftInputForm: React.FC<OeeShiftInputFormProps> = ({
  equipment,
  recordedVia = 'QR_APP',
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [recordDate, setRecordDate] = useState<string>(todayIso);
  const [shift, setShift] = useState<string>('HANH_CHINH');
  const [workshop, setWorkshop] = useState<string>(equipment?.department || equipment?.location || 'HT');
  const [machineSpeedPerMin, setMachineSpeedPerMin] = useState<string>(
    equipment?.standardSpeedPerHour ? String(Math.round((equipment.standardSpeedPerHour / 60) * 10) / 10) : '50',
  );
  const [outputUnit] = useState<string>(equipment?.outputUnit || 'SP');
  const [productCode, setProductCode] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [startOutputCount, setStartOutputCount] = useState<string>('0');

  const [timeRows, setTimeRows] = useState<TimeEntryRow[]>(() =>
    INITIAL_ROWS.map((r) => ({ ...r })),
  );

  const [defectRows, setDefectRows] = useState<DefectLogRow[]>([
    { id: '1', time: '', quantity: '', reason: '' },
    { id: '2', time: '', quantity: '', reason: '' },
  ]);

  const [endCounterNt, setEndCounterNt] = useState<string>('');
  const [goodOutputEnd, setGoodOutputEnd] = useState<string>('');
  const [operatorSignName, setOperatorSignName] = useState<string>('');

  const [autoWorkOrderDowntime, setAutoWorkOrderDowntime] = useState<number>(0);
  const [matchedIncidents, setMatchedIncidents] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!equipment?.id) return;
    let isMounted = true;
    api
      .getOeeShiftContext(equipment.id, { recordDate, shift })
      .then((ctx: any) => {
        if (!isMounted || !ctx) return;
        const autoMin = Number(ctx.autoWorkOrderDowntimeMinutes) || 0;
        setAutoWorkOrderDowntime(autoMin);
        setMatchedIncidents(Array.isArray(ctx.matchedIncidents) ? ctx.matchedIncidents : []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [equipment?.id, recordDate, shift]);

  const handleTimeRowChange = (index: number, field: keyof TimeEntryRow, value: string) => {
    setTimeRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDefectRowChange = (index: number, field: keyof DefectLogRow, value: string) => {
    setDefectRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addDefectRow = () => {
    setDefectRows((prev) => [
      ...prev,
      { id: String(prev.length + 1), time: '', quantity: '', reason: '' },
    ]);
  };

  const removeDefectRow = (index: number) => {
    if (defectRows.length <= 1) return;
    setDefectRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const processedMetrics = useMemo(() => {
    const minutesByKey: Record<string, number> = {};
    for (const row of timeRows) {
      minutesByKey[row.key] = calcRowMinutes(row);
    }

    const cleaningMin = minutesByKey.cleaning || 0;
    const adjustmentMin = minutesByKey.adjustment || 0;
    const runningMinFromRow = minutesByKey.running || 0;
    const breakShiftMin = minutesByKey.breakShift || 0;
    const breakdownMin = minutesByKey.breakdown || 0;
    const noOperatorMin = minutesByKey.noOperator || 0;
    const qualityProcessMin = minutesByKey.qualityProcess || 0;
    const otherWaitingMin = minutesByKey.otherWaiting || 0;

    const plannedDowntimeMinutes = cleaningMin + breakShiftMin;
    const unplannedDowntimeMinutes =
      adjustmentMin + breakdownMin + noOperatorMin + qualityProcessMin + otherWaitingMin;

    const runTimeMinutes =
      runningMinFromRow > 0
        ? runningMinFromRow
        : Math.max(0, 480 - plannedDowntimeMinutes - unplannedDowntimeMinutes);

    const shiftDurationMinutes =
      runningMinFromRow > 0
        ? runningMinFromRow + plannedDowntimeMinutes + unplannedDowntimeMinutes
        : 480;

    const plannedProductionMinutes = Math.max(1, shiftDurationMinutes - plannedDowntimeMinutes);

    const startQty = Math.max(0, Number(startOutputCount) || 0);
    const ntEndQty = Math.max(0, Number(endCounterNt) || 0);
    const goodEndQty = Math.max(0, Number(goodOutputEnd) || 0);

    const sumTable3Defects = defectRows.reduce(
      (acc, r) => acc + (Math.max(0, Number(r.quantity) || 0)),
      0,
    );

    const shiftProducedOutput = ntEndQty > startQty ? ntEndQty - startQty : ntEndQty;

    let defectOutput = sumTable3Defects;
    if (ntEndQty > 0 && goodEndQty > 0 && ntEndQty >= goodEndQty) {
      const counterDiffDefect = ntEndQty - goodEndQty;
      if (counterDiffDefect <= shiftProducedOutput) {
        defectOutput = Math.max(sumTable3Defects, counterDiffDefect);
      }
    }

    const totalOutput = Math.max(0, shiftProducedOutput);
    const goodOutput = Math.max(0, totalOutput - defectOutput);

    const speedPerMin = Math.max(0.1, Number(machineSpeedPerMin) || 50);
    const standardSpeedPerHour = Math.round(speedPerMin * 60 * 100) / 100;
    const theoreticalOutput = Math.round(runTimeMinutes * speedPerMin);

    const availability =
      plannedProductionMinutes > 0
        ? Math.min(100, Math.round(((runTimeMinutes / plannedProductionMinutes) * 100) * 100) / 100)
        : 0;

    const rawPerformance =
      theoreticalOutput > 0
        ? Math.round(((totalOutput / theoreticalOutput) * 100) * 100) / 100
        : 0;
    const performance = Math.min(120, Math.max(0, rawPerformance));

    const quality =
      totalOutput > 0
        ? Math.min(100, Math.round(((goodOutput / totalOutput) * 100) * 100) / 100)
        : 100;

    const oee =
      totalOutput > 0
        ? Math.round(((availability * Math.min(100, performance) * quality) / 10000) * 100) / 100
        : 0;

    return {
      cleaningMin,
      adjustmentMin,
      runningMinFromRow,
      breakShiftMin,
      breakdownMin,
      noOperatorMin,
      qualityProcessMin,
      otherWaitingMin,
      plannedDowntimeMinutes,
      unplannedDowntimeMinutes,
      shiftDurationMinutes,
      plannedProductionMinutes,
      runTimeMinutes,
      startQty,
      ntEndQty,
      goodEndQty,
      totalOutput,
      defectOutput,
      goodOutput,
      speedPerMin,
      standardSpeedPerHour,
      theoreticalOutput,
      availability,
      performance,
      quality,
      oee,
    };
  }, [
    timeRows,
    startOutputCount,
    endCounterNt,
    goodOutputEnd,
    defectRows,
    machineSpeedPerMin,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processedMetrics.runTimeMinutes <= 0) {
      showToast('error', 'Vui lòng nhập thời gian mục "Chạy máy"');
      return;
    }
    if (processedMetrics.totalOutput <= 0) {
      showToast('error', 'Vui lòng nhập "Chỉ số bộ đếm cuối ca (NT)" hợp lệ');
      return;
    }

    setSubmitting(true);
    try {
      const activeDefects = defectRows.filter((d) => d.quantity || d.reason);
      const defectReasonSummary = activeDefects
        .map((d) => `${d.time ? `[${d.time}] ` : ''}${d.quantity || 0} SP: ${d.reason || 'Lỗi'}`)
        .join('; ');

      const isMultiDayBatch = processedMetrics.startQty > 0;

      const payload = {
        recordDate,
        shift,
        workshop,
        batchNumber: batchNumber.trim() || undefined,
        productName: productCode.trim() || undefined,
        machineSpeed: processedMetrics.speedPerMin,
        isMultiDayBatch,
        startOutputCount: processedMetrics.startQty,
        endCounterNt: processedMetrics.ntEndQty,
        operatorSignName: operatorSignName.trim() || undefined,
        shiftDurationMinutes: processedMetrics.shiftDurationMinutes,
        plannedDowntimeMinutes: processedMetrics.plannedDowntimeMinutes,
        unplannedDowntimeMinutes: processedMetrics.unplannedDowntimeMinutes,
        runTimeMinutesOverride: processedMetrics.runTimeMinutes,
        autoWorkOrderDowntimeMinutes: autoWorkOrderDowntime,
        downtimeBreakdown: {
          cleaningMinutes: processedMetrics.cleaningMin,
          adjustmentMinutes: processedMetrics.adjustmentMin,
          runMinutes: processedMetrics.runTimeMinutes,
          breakMinutes: processedMetrics.breakShiftMin,
          breakdownMinutes: processedMetrics.breakdownMin,
          noOperatorMinutes: processedMetrics.noOperatorMin,
          qualityProcessMinutes: processedMetrics.qualityProcessMin,
          otherWaitingMinutes: processedMetrics.otherWaitingMin,
          fieldSheetVer2: {
            version: 'VER2',
            workshop,
            machineSpeedPerMin: processedMetrics.speedPerMin,
            productCode: productCode.trim(),
            batchNumber: batchNumber.trim(),
            isMultiDayBatch,
            startOutputCount: processedMetrics.startQty,
            isBatchFinished: true,
            endCounterNt: processedMetrics.ntEndQty,
            goodOutputEnd: processedMetrics.goodEndQty,
            operatorSignName: operatorSignName.trim(),
            timeRows,
            defectRows: activeDefects,
          },
        },
        standardSpeedPerHour: processedMetrics.standardSpeedPerHour,
        outputUnit: outputUnit.trim() || 'SP',
        totalOutput: processedMetrics.totalOutput,
        defectOutput: processedMetrics.defectOutput,
        defectReasons: defectReasonSummary || undefined,
        recordedVia,
        notes: operatorSignName
          ? `Người ghi: ${operatorSignName.trim()} | Xưởng: ${workshop} | NT cuối kỳ: ${processedMetrics.ntEndQty}`
          : undefined,
        saveBaselineToEquipment: true,
      };

      const res = await api.submitEquipmentOeeRecord(equipment.id, payload);
      showToast('success', res.message || `Đã lưu phiếu OEE (OEE = ${processedMetrics.oee}%)`);
      if (onSuccess) {
        onSuccess(res.record);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi lưu phiếu OEE');
    } finally {
      setSubmitting(false);
    }
  };

  const targetOee = equipment?.oeeTarget || 85;
  const oeeColor =
    processedMetrics.oee >= targetOee
      ? '#16a34a'
      : processedMetrics.oee >= targetOee - 15
      ? '#d97706'
      : '#dc2626';

  return (
    <div
      className="card"
      style={{
        padding: '20px 24px',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header gọn gàng */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#2563eb" />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Phiếu ghi nhận OEE theo ca
          </h3>
        </div>
        <div style={{ fontSize: '12.5px', color: '#475569' }}>
          Thiết bị: <strong style={{ color: '#2563eb' }}>{equipment.oldCode || equipment.code}</strong> — {equipment.name}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* MỤC 1. THÔNG TIN CA SẢN XUẤT */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            1. Thông tin ca sản xuất
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Ngày sản xuất
              </label>
              <input
                type="date"
                className="form-input"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Ca làm việc
              </label>
              <select
                className="form-input"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="CA_1">Ca 1</option>
                <option value="CA_2">Ca 2</option>
                <option value="HANH_CHINH">Ca hành chính</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Xưởng / Bộ phận
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: HT"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tốc độ máy (SP/phút)
              </label>
              <input
                type="number"
                min={0.1}
                step="any"
                className="form-input"
                placeholder="VD: 50"
                value={machineSpeedPerMin}
                onChange={(e) => setMachineSpeedPerMin(e.target.value)}
                required
                style={{ width: '100%', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mã sản phẩm
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: TP00201"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Số lô
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: 1091026"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Số lượng đầu ca
              </label>
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="0"
                value={startOutputCount}
                onChange={(e) => setStartOutputCount(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* MỤC 2. THỜI GIAN VẬN HÀNH & DỪNG MÁY */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              2. Thời gian vận hành & dừng máy
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Chạy máy: <strong style={{ color: '#15803d' }}>{processedMetrics.runTimeMinutes}p</strong> • Dừng KH:{' '}
              <strong>{processedMetrics.plannedDowntimeMinutes}p</strong> • Dừng sự cố:{' '}
              <strong style={{ color: '#dc2626' }}>{processedMetrics.unplannedDowntimeMinutes}p</strong>
            </div>
          </div>

          {matchedIncidents.length > 0 && (
            <div
              style={{
                marginBottom: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#92400e' }}>
                <Wrench size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Có <strong>{matchedIncidents.length} phiếu sự cố</strong> trong ca ({autoWorkOrderDowntime} phút).
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const idx = timeRows.findIndex((r) => r.key === 'breakdown');
                  if (idx >= 0) handleTimeRowChange(idx, 'manualMinutes', String(autoWorkOrderDowntime));
                }}
                style={{ padding: '3px 10px', fontSize: '11.5px', fontWeight: 600 }}
              >
                Điền {autoWorkOrderDowntime} phút
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table className="table" style={{ width: '100%', fontSize: '12.5px', margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                  <th style={{ minWidth: '150px' }}>Hạng mục</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Bắt đầu 1</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Kết thúc 1</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Bắt đầu 2</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Kết thúc 2</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Số phút</th>
                  <th style={{ minWidth: '150px' }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {timeRows.map((row, idx) => {
                  const mins = calcRowMinutes(row);
                  const isRunRow = row.categoryType === 'RUN';
                  return (
                    <tr
                      key={row.key}
                      style={{
                        backgroundColor: isRunRow
                          ? '#f0fdf4'
                          : mins > 0 && row.categoryType === 'UNPLANNED'
                          ? '#fef2f2'
                          : '#ffffff',
                      }}
                    >
                      <td style={{ fontWeight: 600, color: isRunRow ? '#15803d' : '#0f172a' }}>
                        {row.label}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="08:00"
                          value={row.start1}
                          onChange={(e) => handleTimeRowChange(idx, 'start1', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', textAlign: 'center' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="08:15"
                          value={row.end1}
                          onChange={(e) => handleTimeRowChange(idx, 'end1', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', textAlign: 'center' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="11:00"
                          value={row.start2}
                          onChange={(e) => handleTimeRowChange(idx, 'start2', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', textAlign: 'center' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="11:15"
                          value={row.end2}
                          onChange={(e) => handleTimeRowChange(idx, 'end2', e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          className="form-input"
                          placeholder="0"
                          value={
                            calcIntervalMinutes(row.start1, row.end1) +
                              calcIntervalMinutes(row.start2, row.end2) >
                            0
                              ? String(mins)
                              : row.manualMinutes
                          }
                          onChange={(e) => handleTimeRowChange(idx, 'manualMinutes', e.target.value)}
                          style={{
                            width: '72px',
                            padding: '4px 6px',
                            textAlign: 'center',
                            fontWeight: 700,
                            backgroundColor: mins > 0 ? '#eff6ff' : undefined,
                            color: isRunRow ? '#15803d' : mins > 0 ? '#1d4ed8' : '#64748b',
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="..."
                          value={row.note}
                          onChange={(e) => handleTimeRowChange(idx, 'note', e.target.value)}
                          style={{ width: '100%', padding: '4px 8px', fontSize: '12px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* MỤC 3. SẢN PHẨM LỖI PHÁT SINH */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              3. Sản phẩm lỗi phát sinh
            </div>
            <button
              type="button"
              onClick={addDefectRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Thêm dòng
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table className="table" style={{ width: '100%', fontSize: '12.5px', margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
                  <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '140px' }}>Thời điểm</th>
                  <th style={{ width: '160px' }}>Số lượng lỗi</th>
                  <th>Nguyên nhân lỗi</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {defectRows.map((dRow, idx) => (
                  <tr key={dRow.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="10:15"
                        value={dRow.time}
                        onChange={(e) => handleDefectRowChange(idx, 'time', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        placeholder="0"
                        value={dRow.quantity}
                        onChange={(e) => handleDefectRowChange(idx, 'quantity', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontWeight: 600 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nguyên nhân..."
                        value={dRow.reason}
                        onChange={(e) => handleDefectRowChange(idx, 'reason', e.target.value)}
                        style={{ width: '100%', padding: '4px 8px' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {defectRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDefectRow(idx)}
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MỤC 4. CHỐT SỐ LIỆU CUỐI CA */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            4. Chốt số liệu cuối ca
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                Chỉ số bộ đếm cuối ca (NT) *
              </label>
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Nhập chỉ số NT"
                value={endCounterNt}
                onChange={(e) => setEndCounterNt(e.target.value)}
                required
                style={{ width: '100%', fontWeight: 700, color: '#1d4ed8' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                Sản lượng đạt
              </label>
              <input
                type="number"
                min={0}
                className="form-input"
                placeholder="Nhập sản lượng đạt"
                value={goodOutputEnd}
                onChange={(e) => setGoodOutputEnd(e.target.value)}
                style={{ width: '100%', fontWeight: 700, color: '#15803d' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Người ghi nhận
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Họ và tên"
                value={operatorSignName}
                onChange={(e) => setOperatorSignName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* TÓM TẮT KẾT QUẢ OEE */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>OEE</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: oeeColor }}>
              {processedMetrics.oee}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>A - Thời gian</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0284c7' }}>
              {processedMetrics.availability}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>P - Tốc độ</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#16a34a' }}>
              {processedMetrics.performance}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Q - Chất lượng</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#d97706' }}>
              {processedMetrics.quality}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Sản lượng ca</div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              {processedMetrics.totalOutput.toLocaleString('vi-VN')} {outputUnit}
            </div>
          </div>
        </div>

        {/* NÚT LƯU */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 20px',
              fontSize: '13.5px',
              fontWeight: 700,
            }}
          >
            {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{submitting ? 'Đang lưu...' : 'Lưu phiếu OEE'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default OeeShiftInputForm;
