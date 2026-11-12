import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface FixedEquipmentInfo {
  id: string;
  code: string;
  oldCode?: string | null;
  name: string;
}

interface FunctionalUnitImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fixedEquipment?: FixedEquipmentInfo;
}

interface ParsedUnitRow {
  rowNumber: number;
  equipmentId?: string;
  equipmentKey: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  status?: string;
  orderIndex?: string;
  clientError?: string;
}

interface ImportServerError {
  rowNumber: number;
  equipmentKey?: string;
  name?: string;
  reason: string;
}

interface ImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errors: ImportServerError[];
  created: Array<{ id: string; code: string; name: string; equipmentCode: string; equipmentName: string }>;
}

const TEMPLATE_COLUMNS = [
  { key: 'equipmentKey', header: 'Mã / Tên thiết bị (*)', width: 26 },
  { key: 'name', header: 'Tên cụm chức năng (*)', width: 28 },
  { key: 'code', header: 'Mã cụm chức năng', width: 20 },
  { key: 'category', header: 'Nhóm / Loại cụm', width: 18 },
  { key: 'status', header: 'Trạng thái', width: 20 },
  { key: 'orderIndex', header: 'Thứ tự', width: 12 },
  { key: 'description', header: 'Mô tả chi tiết', width: 36 },
] as const;

const HEADER_TO_KEY: Record<string, string> = {
  'mã / tên thiết bị (*)': 'equipmentKey',
  'mã / tên thiết bị': 'equipmentKey',
  'mã thiết bị (*)': 'equipmentKey',
  'mã thiết bị': 'equipmentKey',
  'mã cũ / nhận diện': 'equipmentKey',
  'tên thiết bị': 'equipmentKey',
  'equipmentkey': 'equipmentKey',
  'equipmentcode': 'equipmentKey',
  'tên cụm chức năng (*)': 'name',
  'tên cụm chức năng': 'name',
  'cụm chức năng': 'name',
  'name': 'name',
  'mã cụm chức năng': 'code',
  'mã cụm': 'code',
  'code': 'code',
  'nhóm / loại cụm': 'category',
  'nhóm': 'category',
  'loại': 'category',
  'category': 'category',
  'trạng thái': 'status',
  'status': 'status',
  'thứ tự': 'orderIndex',
  'orderindex': 'orderIndex',
  'mô tả chi tiết': 'description',
  'mô tả': 'description',
  'description': 'description',
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export const FunctionalUnitImportModal: React.FC<FunctionalUnitImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  fixedEquipment,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedUnitRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setImportProgress(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const defaultEqKey = fixedEquipment?.code || fixedEquipment?.oldCode || 'EQ-0001';

    const sampleRows = [
      {
        'Mã / Tên thiết bị (*)': defaultEqKey,
        'Tên cụm chức năng (*)': 'Động cơ chính',
        'Mã cụm chức năng': '',
        'Nhóm / Loại cụm': 'Cơ khí',
        'Trạng thái': 'OPERATIONAL',
        'Thứ tự': 1,
        'Mô tả chi tiết': 'Cụm động cơ truyền động chính của thiết bị',
      },
      {
        'Mã / Tên thiết bị (*)': fixedEquipment ? defaultEqKey : 'TBNC100.01',
        'Tên cụm chức năng (*)': 'Bộ điều khiển nhiệt',
        'Mã cụm chức năng': '',
        'Nhóm / Loại cụm': 'Điện - Tự động hóa',
        'Trạng thái': 'Hoạt động tốt',
        'Thứ tự': 2,
        'Mô tả chi tiết': 'Cảm biến và bộ điều khiển nhiệt độ',
      },
    ];

    const wsData = XLSX.utils.json_to_sheet(sampleRows, {
      header: TEMPLATE_COLUMNS.map((c) => c.header),
    });
    wsData['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(wb, wsData, 'Cum_chuc_nang_thiet_bi');

    const guideRows = [
      { 'Cột': 'Mã / Tên thiết bị (*)', 'Bắt buộc': 'Có (khi import nhiều máy)', 'Mô tả': 'Nhập mã hệ thống (EQ-xxxx), mã cũ (vd: TBNC100.01), mã kế toán, hoặc tên thiết bị (nếu tên không bị trùng).' },
      { 'Cột': 'Tên cụm chức năng (*)', 'Bắt buộc': 'Có', 'Mô tả': 'Tên cụm chức năng cần gắn cho thiết bị. Hệ thống tự đồng bộ vào Thư viện cụm chức năng nếu chưa có.' },
      { 'Cột': 'Mã cụm chức năng', 'Bắt buộc': 'Không', 'Mô tả': 'Nếu bỏ trống, hệ thống tự sinh mã dạng EQ-xxxx-CU01, CU02...' },
      { 'Cột': 'Nhóm / Loại cụm', 'Bắt buộc': 'Không', 'Mô tả': 'Ví dụ: Cơ khí, Điện - Tự động hóa, Thủy lực, Khí nén... Mặc định lấy theo loại thiết bị.' },
      { 'Cột': 'Trạng thái', 'Bắt buộc': 'Không', 'Mô tả': 'Mặc định OPERATIONAL. Hỗ trợ: OPERATIONAL (Hoạt động tốt), WARNING (Cần theo dõi), INCIDENT (Sự cố), INACTIVE (Ngừng hoạt động).' },
      { 'Cột': 'Thứ tự', 'Bắt buộc': 'Không', 'Mô tả': 'Số thứ tự hiển thị của cụm chức năng trên thiết bị.' },
      { 'Cột': 'Mô tả chi tiết', 'Bắt buộc': 'Không', 'Mô tả': 'Thông tin mô tả hoặc thông số của cụm chức năng.' },
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 24 }, { wch: 26 }, { wch: 78 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Huong_dan');

    XLSX.writeFile(wb, 'Bieu_mau_import_cum_chuc_nang_theo_thiet_bi.xlsx');
    toast.success('Đã tải biểu mẫu', 'File Bieu_mau_import_cum_chuc_nang_theo_thiet_bi.xlsx đã được tải xuống.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportResult(null);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error('File không hợp lệ', 'Không tìm thấy sheet dữ liệu trong file.');
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: '',
        raw: true,
      });

      if (rawRows.length === 0) {
        setParsedRows([]);
        toast.error('File trống', 'Không có dòng dữ liệu nào để import.');
        return;
      }

      if (rawRows.length > 1000) {
        toast.error('Vượt giới hạn', 'Mỗi lần import tối đa 1000 dòng cụm chức năng.');
        return;
      }

      const seenPair = new Map<string, number>();
      const mapped: ParsedUnitRow[] = [];

      rawRows.forEach((rawRow, idx) => {
        const normalized: Record<string, string> = {};
        for (const [colHeader, cellVal] of Object.entries(rawRow)) {
          const mappedKey = HEADER_TO_KEY[colHeader.trim().toLowerCase()];
          if (mappedKey) {
            normalized[mappedKey] = formatCell(cellVal);
          }
        }

        const hasAnyValue = Object.values(normalized).some((v) => v !== '');
        if (!hasAnyValue) return;

        const rowNumber = idx + 2;
        const equipmentKey = normalized.equipmentKey || fixedEquipment?.code || '';
        const name = normalized.name || '';
        const errors: string[] = [];

        if (!fixedEquipment && !equipmentKey) {
          errors.push('Thiếu mã/tên thiết bị');
        }
        if (!name) {
          errors.push('Thiếu tên cụm chức năng');
        }

        if (equipmentKey && name) {
          const pairKey = `${equipmentKey.toLowerCase()}::${name.toLowerCase()}`;
          const prevRow = seenPair.get(pairKey);
          if (prevRow) {
            errors.push(`Trùng cụm chức năng với dòng ${prevRow}`);
          } else {
            seenPair.set(pairKey, rowNumber);
          }
        }

        mapped.push({
          rowNumber,
          equipmentId: fixedEquipment?.id,
          equipmentKey,
          name,
          code: normalized.code || undefined,
          category: normalized.category || undefined,
          description: normalized.description || undefined,
          status: normalized.status || undefined,
          orderIndex: normalized.orderIndex || undefined,
          clientError: errors.length > 0 ? errors.join('; ') : undefined,
        });
      });

      setParsedRows(mapped);
    } catch (err: any) {
      console.error('Lỗi đọc file Excel:', err);
      toast.error('Không thể đọc file', err?.message || 'Vui lòng kiểm tra lại định dạng file (.xlsx, .xls, .csv).');
    }
  };

  const validRows = parsedRows.filter((r) => !r.clientError);
  const clientErrorRows = parsedRows.filter((r) => Boolean(r.clientError));

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      toast.error('Không có dòng hợp lệ', 'Vui lòng sửa các dòng lỗi trước khi import.');
      return;
    }

    try {
      setIsImporting(true);
      const payload = validRows.map(({ clientError: _err, ...rest }) => rest);
      const CHUNK_SIZE = 100;
      const aggregated: ImportResult = {
        totalRows: payload.length,
        createdCount: 0,
        skippedCount: 0,
        errors: [],
        created: [],
      };

      setImportProgress({ done: 0, total: payload.length });
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        const res: ImportResult = await api.importFunctionalUnitsByEquipment(chunk);
        aggregated.createdCount += res.createdCount || 0;
        aggregated.skippedCount += res.skippedCount || 0;
        if (Array.isArray(res.errors)) aggregated.errors.push(...res.errors);
        if (Array.isArray(res.created)) aggregated.created.push(...res.created);
        setImportProgress({ done: Math.min(i + chunk.length, payload.length), total: payload.length });
      }

      setImportResult(aggregated);

      if (aggregated.createdCount > 0) {
        toast.success(
          'Import cụm chức năng hoàn tất',
          `Đã thêm ${aggregated.createdCount} cụm chức năng${aggregated.skippedCount > 0 ? `, bỏ qua ${aggregated.skippedCount} dòng lỗi` : ''}.`
        );
        onSuccess();
      } else {
        toast.error('Import không thành công', 'Không có cụm chức năng nào được thêm. Vui lòng kiểm tra lỗi.');
      }
    } catch (err: any) {
      toast.error('Lỗi import cụm chức năng', err?.message || 'Không thể gửi dữ liệu lên máy chủ.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        fixedEquipment
          ? `Import Cụm Chức Năng — ${fixedEquipment.code} (${fixedEquipment.name})`
          : 'Import Cụm Chức Năng Theo Thiết Bị (Excel)'
      }
      maxWidth="900px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Bước 1: Tải biểu mẫu cụm chức năng theo thiết bị
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {fixedEquipment
                ? 'Có thể điền nhiều cụm chức năng cho thiết bị này (hỗ trợ .xlsx, .xls, .csv).'
                : 'Khớp thiết bị theo Mã hệ thống (EQ-xxxx), Mã cũ (TBNC...), Mã kế toán hoặc Tên thiết bị.'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadTemplate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Tải biểu mẫu (.xlsx)</span>
          </button>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            padding: '22px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-primary, #ffffff)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={28} color="#2563eb" />
            {fileName ? (
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Đã chọn: {fileName} ({parsedRows.length} dòng dữ liệu)
              </div>
            ) : (
              <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Nhấn để chọn file Excel cụm chức năng cần import
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Định dạng hỗ trợ: .xlsx, .xls, .csv (tối đa 1000 dòng/lần)
            </div>
          </div>
        </div>

        {parsedRows.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                Tổng dòng: {parsedRows.length}
              </span>
              <span style={{ fontSize: '12.5px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                Hợp lệ: {validRows.length}
              </span>
              {clientErrorRows.length > 0 && (
                <span style={{ fontSize: '12.5px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>
                  Lỗi kiểm tra: {clientErrorRows.length}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetState}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12.5px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={14} /> Chọn file khác
            </button>
          </div>
        )}

        {parsedRows.length > 0 && !importResult && (
          <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary, #f8fafc)', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Dòng</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Mã / Tên thiết bị</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Tên cụm chức năng</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Mã cụm</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Nhóm</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    style={{
                      backgroundColor: row.clientError ? '#fef2f2' : 'transparent',
                      borderBottom: '1px solid var(--border-color, #f1f5f9)',
                    }}
                  >
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{row.rowNumber}</td>
                    <td style={{ padding: '7px 10px' }}>{row.equipmentKey || <span style={{ color: '#dc2626' }}>(Trống)</span>}</td>
                    <td style={{ padding: '7px 10px' }}>{row.name || <span style={{ color: '#dc2626' }}>(Trống)</span>}</td>
                    <td style={{ padding: '7px 10px' }}>{row.code || '(Tự sinh)'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.category || '-'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      {row.clientError ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 500 }}>
                          <AlertCircle size={13} /> {row.clientError}
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 500 }}>
                          <CheckCircle2 size={13} /> Hợp lệ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {importResult && (
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Kết quả Import: Đã thêm {importResult.createdCount}/{importResult.totalRows} cụm chức năng
              {importResult.skippedCount > 0 ? ` (${importResult.skippedCount} dòng bỏ qua)` : ''}
            </div>

            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '12.5px', color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {importResult.errors.map((err, i) => (
                  <div key={i}>
                    • Dòng {err.rowNumber} {err.equipmentKey ? `[${err.equipmentKey}] ` : ''}{err.name ? `(${err.name})` : ''}: {err.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isImporting}>
            {importResult ? 'Đóng' : 'Hủy'}
          </button>
          {!importResult && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={isImporting || validRows.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={15} />
              <span>
                {isImporting
                  ? `Đang import${importProgress ? ` (${importProgress.done}/${importProgress.total})` : '...'}`
                  : `Xác nhận Import (${validRows.length} cụm)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

