import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface EquipmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedEquipmentRow {
  rowNumber: number;
  name: string;
  category: string;
  location: string;
  department?: string;
  oldCode?: string;
  accountingCode?: string;
  serialNumber?: string;
  status?: string;
  purchaseDate?: string;
  warrantyPeriod?: string;
  specs?: string;
  functionalUnit?: string;
  isCritical?: string;
  currentOperatingHours?: number | string;
  standardSpeedPerHour?: number | string;
  outputUnit?: string;
  plannedShiftMinutes?: number | string;
  oeeTarget?: number | string;
  notes?: string;
  clientError?: string;
}

interface ImportServerError {
  rowNumber: number;
  name?: string;
  accountingCode?: string;
  reason: string;
}

interface ImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  errors: ImportServerError[];
  created: Array<{ id: string; code: string; name: string; accountingCode: string | null }>;
}

const TEMPLATE_COLUMNS = [
  { key: 'name', header: 'Tên thiết bị (*)', width: 28 },
  { key: 'category', header: 'Loại thiết bị (*)', width: 20 },
  { key: 'location', header: 'Vị trí lắp đặt (*)', width: 22 },
  { key: 'department', header: 'Bộ phận', width: 18 },
  { key: 'oldCode', header: 'Mã cũ / Nhận diện', width: 18 },
  { key: 'accountingCode', header: 'Mã kế toán', width: 18 },
  { key: 'serialNumber', header: 'Số Serial', width: 20 },
  { key: 'status', header: 'Trạng thái', width: 20 },
  { key: 'purchaseDate', header: 'Ngày mua (YYYY-MM-DD)', width: 22 },
  { key: 'warrantyPeriod', header: 'Thời hạn bảo hành', width: 18 },
  { key: 'specs', header: 'Thông số kỹ thuật', width: 28 },
  { key: 'functionalUnit', header: 'Cụm chức năng (ngăn cách dấu phẩy)', width: 32 },
  { key: 'isCritical', header: 'Thiết bị trọng yếu (Có/Không)', width: 24 },
  { key: 'currentOperatingHours', header: 'Giờ vận hành hiện tại', width: 20 },
  { key: 'standardSpeedPerHour', header: 'Tốc độ chuẩn/giờ', width: 18 },
  { key: 'outputUnit', header: 'Đơn vị sản lượng', width: 18 },
  { key: 'plannedShiftMinutes', header: 'Thời gian ca (phút)', width: 18 },
  { key: 'oeeTarget', header: 'Mục tiêu OEE (%)', width: 16 },
  { key: 'notes', header: 'Ghi chú', width: 26 },
] as const;

const HEADER_TO_KEY: Record<string, string> = {
  'tên thiết bị (*)': 'name',
  'tên thiết bị': 'name',
  'name': 'name',
  'loại thiết bị (*)': 'category',
  'loại thiết bị': 'category',
  'category': 'category',
  'vị trí lắp đặt (*)': 'location',
  'vị trí lắp đặt': 'location',
  'vị trí': 'location',
  'location': 'location',
  'bộ phận': 'department',
  'department': 'department',
  'mã cũ / nhận diện': 'oldCode',
  'mã cũ': 'oldCode',
  'oldcode': 'oldCode',
  'mã kế toán': 'accountingCode',
  'accountingcode': 'accountingCode',
  'số serial': 'serialNumber',
  'serial': 'serialNumber',
  'serialnumber': 'serialNumber',
  'trạng thái': 'status',
  'status': 'status',
  'ngày mua (yyyy-mm-dd)': 'purchaseDate',
  'ngày mua': 'purchaseDate',
  'purchasedate': 'purchaseDate',
  'thời hạn bảo hành': 'warrantyPeriod',
  'bảo hành': 'warrantyPeriod',
  'warrantyperiod': 'warrantyPeriod',
  'thông số kỹ thuật': 'specs',
  'specs': 'specs',
  'cụm chức năng (ngăn cách dấu phẩy)': 'functionalUnit',
  'cụm chức năng': 'functionalUnit',
  'functionalunit': 'functionalUnit',
  'thiết bị trọng yếu (có/không)': 'isCritical',
  'thiết bị trọng yếu': 'isCritical',
  'iscritical': 'isCritical',
  'giờ vận hành hiện tại': 'currentOperatingHours',
  'currentoperatinghours': 'currentOperatingHours',
  'tốc độ chuẩn/giờ': 'standardSpeedPerHour',
  'standardspeedperhour': 'standardSpeedPerHour',
  'đơn vị sản lượng': 'outputUnit',
  'outputunit': 'outputUnit',
  'thời gian ca (phút)': 'plannedShiftMinutes',
  'plannedshiftminutes': 'plannedShiftMinutes',
  'mục tiêu oee (%)': 'oeeTarget',
  'oeetarget': 'oeeTarget',
  'ghi chú': 'notes',
  'notes': 'notes',
};

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

export const EquipmentImportModal: React.FC<EquipmentImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedEquipmentRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
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

    const sampleRows = [
      {
        'Tên thiết bị (*)': 'Máy CNC Phay 01',
        'Loại thiết bị (*)': 'Máy gia công',
        'Vị trí lắp đặt (*)': 'Xưởng Cơ khí A',
        'Bộ phận': 'Sản xuất',
        'Mã cũ / Nhận diện': 'CNC-01',
        'Mã kế toán': 'TS-2026-001',
        'Số Serial': 'SN-CNC-9981',
        'Trạng thái': 'OPERATIONAL',
        'Ngày mua (YYYY-MM-DD)': '2025-05-15',
        'Thời hạn bảo hành': '24 tháng',
        'Thông số kỹ thuật': 'Công suất 15kW, tốc độ trục chính 12000 vòng/phút',
        'Cụm chức năng (ngăn cách dấu phẩy)': 'Trục chính, Hệ thống làm mát, Bộ thay dao',
        'Thiết bị trọng yếu (Có/Không)': 'Có',
        'Giờ vận hành hiện tại': 120,
        'Tốc độ chuẩn/giờ': 60,
        'Đơn vị sản lượng': 'chi tiết',
        'Thời gian ca (phút)': 480,
        'Mục tiêu OEE (%)': 85,
        'Ghi chú': 'Dòng dữ liệu mẫu - có thể xóa hoặc sửa',
      },
      {
        'Tên thiết bị (*)': 'Máy Nén Khí Trục Vít 02',
        'Loại thiết bị (*)': 'Thiết bị phụ trợ',
        'Vị trí lắp đặt (*)': 'Phòng Máy Nén',
        'Bộ phận': 'Kỹ thuật',
        'Mã cũ / Nhận diện': 'MNK-02',
        'Mã kế toán': '',
        'Số Serial': 'SN-AC-4420',
        'Trạng thái': 'Hoạt động tốt',
        'Ngày mua (YYYY-MM-DD)': '2024-11-01',
        'Thời hạn bảo hành': '12 tháng',
        'Thông số kỹ thuật': 'Áp suất 8 bar, lưu lượng 3.5 m3/phút',
        'Cụm chức năng (ngăn cách dấu phẩy)': 'Đầu nén, Động cơ chính',
        'Thiết bị trọng yếu (Có/Không)': 'Không',
        'Giờ vận hành hiện tại': 850,
        'Tốc độ chuẩn/giờ': '',
        'Đơn vị sản lượng': '',
        'Thời gian ca (phút)': 480,
        'Mục tiêu OEE (%)': '',
        'Ghi chú': '',
      },
    ];

    const wsData = XLSX.utils.json_to_sheet(sampleRows, {
      header: TEMPLATE_COLUMNS.map((c) => c.header),
    });
    wsData['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(wb, wsData, 'Danh_sach_thiet_bi');

    const guideRows = [
      { 'Cột': 'Mã hệ thống (EQ-xxxx)', 'Bắt buộc': 'Tự động', 'Mô tả': 'Hệ thống tự động sinh mã EQ-0001, EQ-0002... không cần nhập trong file Excel.' },
      { 'Cột': 'Tên thiết bị (*)', 'Bắt buộc': 'Có', 'Mô tả': 'Tên đầy đủ của thiết bị.' },
      { 'Cột': 'Loại thiết bị (*)', 'Bắt buộc': 'Có', 'Mô tả': 'Ví dụ: Máy gia công, Thiết bị phụ trợ, Băng tải, Bơm...' },
      { 'Cột': 'Vị trí lắp đặt (*)', 'Bắt buộc': 'Có', 'Mô tả': 'Xưởng / khu vực lắp đặt thiết bị.' },
      { 'Cột': 'Bộ phận', 'Bắt buộc': 'Không', 'Mô tả': 'Phòng ban / bộ phận quản lý hoặc vận hành.' },
      { 'Cột': 'Mã cũ / Nhận diện', 'Bắt buộc': 'Không', 'Mô tả': 'Mã nội bộ cũ hoặc mã dán trên máy nếu có.' },
      { 'Cột': 'Mã kế toán', 'Bắt buộc': 'Không', 'Mô tả': 'Mã tài sản cố định. Nếu nhập thì không được trùng lặp giữa các thiết bị.' },
      { 'Cột': 'Trạng thái', 'Bắt buộc': 'Không', 'Mô tả': 'Mặc định OPERATIONAL. Hỗ trợ: OPERATIONAL (Hoạt động tốt), UNDER_MAINTENANCE (Đang bảo trì), INCIDENT (Sự cố), DISCOMMISSIONED (Ngừng sử dụng).' },
      { 'Cột': 'Ngày mua (YYYY-MM-DD)', 'Bắt buộc': 'Không', 'Mô tả': 'Định dạng YYYY-MM-DD (ví dụ 2025-05-15).' },
      { 'Cột': 'Cụm chức năng', 'Bắt buộc': 'Không', 'Mô tả': 'Nhiều cụm cách nhau bằng dấu phẩy, hệ thống sẽ tự tạo cụm chức năng cho thiết bị.' },
      { 'Cột': 'Thiết bị trọng yếu', 'Bắt buộc': 'Không', 'Mô tả': 'Nhập Có hoặc Không (mặc định Không).' },
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Huong_dan');

    XLSX.writeFile(wb, 'Bieu_mau_import_thiet_bi.xlsx');
    toast.success('Đã tải biểu mẫu', 'File Bieu_mau_import_thiet_bi.xlsx đã được tải xuống.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportResult(null);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
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

      if (rawRows.length > 500) {
        toast.error('Vượt giới hạn', 'Mỗi lần import tối đa 500 dòng thiết bị. Vui lòng chia nhỏ file.');
        return;
      }

      const seenAccountingCodes = new Map<string, number>();
      const mapped: ParsedEquipmentRow[] = [];

      rawRows.forEach((rawRow, idx) => {
        const normalized: Record<string, string> = {};
        for (const [colHeader, cellVal] of Object.entries(rawRow)) {
          const mappedKey = HEADER_TO_KEY[colHeader.trim().toLowerCase()];
          if (mappedKey) {
            normalized[mappedKey] = formatCellValue(cellVal);
          }
        }

        // Bỏ qua các dòng hoàn toàn trống
        const hasAnyValue = Object.values(normalized).some((v) => v !== '');
        if (!hasAnyValue) return;

        const rowNumber = idx + 2;
        const errors: string[] = [];
        if (!normalized.name) errors.push('Thiếu tên thiết bị');
        if (!normalized.category) errors.push('Thiếu loại thiết bị');
        if (!normalized.location) errors.push('Thiếu vị trí');

        if (normalized.accountingCode) {
          const prevRow = seenAccountingCodes.get(normalized.accountingCode);
          if (prevRow) {
            errors.push(`Trùng mã kế toán với dòng ${prevRow}`);
          } else {
            seenAccountingCodes.set(normalized.accountingCode, rowNumber);
          }
        }

        mapped.push({
          rowNumber,
          name: normalized.name || '',
          category: normalized.category || '',
          location: normalized.location || '',
          department: normalized.department || undefined,
          oldCode: normalized.oldCode || undefined,
          accountingCode: normalized.accountingCode || undefined,
          serialNumber: normalized.serialNumber || undefined,
          status: normalized.status || undefined,
          purchaseDate: normalized.purchaseDate || undefined,
          warrantyPeriod: normalized.warrantyPeriod || undefined,
          specs: normalized.specs || undefined,
          functionalUnit: normalized.functionalUnit || undefined,
          isCritical: normalized.isCritical || undefined,
          currentOperatingHours: normalized.currentOperatingHours || undefined,
          standardSpeedPerHour: normalized.standardSpeedPerHour || undefined,
          outputUnit: normalized.outputUnit || undefined,
          plannedShiftMinutes: normalized.plannedShiftMinutes || undefined,
          oeeTarget: normalized.oeeTarget || undefined,
          notes: normalized.notes || undefined,
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
      const result: ImportResult = await api.importEquipment(payload);
      setImportResult(result);

      if (result.createdCount > 0) {
        toast.success(
          'Import hoàn tất',
          `Đã thêm thành công ${result.createdCount} thiết bị${result.skippedCount > 0 ? `, bỏ qua ${result.skippedCount} dòng lỗi` : ''}.`
        );
        onSuccess();
      } else {
        toast.error('Import không thành công', 'Không có thiết bị nào được thêm. Vui lòng kiểm tra danh sách lỗi.');
      }
    } catch (err: any) {
      toast.error('Lỗi import thiết bị', err?.message || 'Không thể import dữ liệu lên máy chủ.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Thiết Bị Hàng Loạt (Excel)"
      maxWidth="920px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Step 1: Download Template & Upload File */}
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
              Bước 1: Tải biểu mẫu chuẩn & điền danh sách thiết bị
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Hỗ trợ file <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code> (tối đa 500 dòng/lần). Mã <code>EQ-xxxx</code> sẽ được tự động sinh.
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

        {/* File picker */}
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
                Nhấn để chọn file Excel cần import
              </div>
            )}
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Định dạng hỗ trợ: .xlsx, .xls, .csv
            </div>
          </div>
        </div>

        {/* Summary badges */}
        {parsedRows.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                Tổng dòng đọc được: {parsedRows.length}
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

        {/* Preview table */}
        {parsedRows.length > 0 && !importResult && (
          <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary, #f8fafc)', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Dòng</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Tên thiết bị</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Loại</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Vị trí</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Bộ phận</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Mã kế toán</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>Trạng thái kiểm tra</th>
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
                    <td style={{ padding: '7px 10px' }}>{row.name || <span style={{ color: '#dc2626' }}>(Trống)</span>}</td>
                    <td style={{ padding: '7px 10px' }}>{row.category || <span style={{ color: '#dc2626' }}>(Trống)</span>}</td>
                    <td style={{ padding: '7px 10px' }}>{row.location || <span style={{ color: '#dc2626' }}>(Trống)</span>}</td>
                    <td style={{ padding: '7px 10px' }}>{row.department || '-'}</td>
                    <td style={{ padding: '7px 10px' }}>{row.accountingCode || '-'}</td>
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

        {/* Server import result */}
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
              Kết quả Import: Đã thêm {importResult.createdCount}/{importResult.totalRows} thiết bị
              {importResult.skippedCount > 0 ? ` (${importResult.skippedCount} dòng bỏ qua)` : ''}
            </div>

            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '12.5px', color: '#b91c1c', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {importResult.errors.map((err, i) => (
                  <div key={i}>
                    • Dòng {err.rowNumber} {err.name ? `(${err.name})` : ''}: {err.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
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
              <span>{isImporting ? 'Đang import...' : `Xác nhận Import (${validRows.length} thiết bị)`}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

