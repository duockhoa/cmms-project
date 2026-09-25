import { useState, useCallback } from 'react';
import { useToast } from '../components/common/Toast';

export interface ExportCsvOptions {
  filename?: string;
  headers?: { key: string; label: string }[];
  data?: any[];
  rawCsv?: string;
  blob?: Blob;
  mimeType?: string;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function convertJsonToCsv(data: any[], headers?: { key: string; label: string }[]): string {
  if (!data || data.length === 0) return '';

  const columns = headers || Object.keys(data[0]).map(key => ({ key, label: key }));
  
  // Header line
  const headerLine = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(';');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(c => {
      const val = item[c.key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? 'Có' : 'Không';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';');
  });

  // Include UTF-8 BOM so Microsoft Excel renders Vietnamese characters correctly
  return '\uFEFF' + [headerLine, ...rows].join('\r\n');
}

export function useExportExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const exportData = useCallback(async (
    exportFn: () => Promise<ExportCsvOptions | Blob | string | void> | ExportCsvOptions | Blob | string | void,
    defaultFilename: string = `Bao_cao_${new Date().toISOString().slice(0, 10)}.csv`
  ) => {
    try {
      setIsExporting(true);
      const result = await exportFn();
      if (!result) {
        setIsExporting(false);
        return;
      }

      let blob: Blob;
      let filename = defaultFilename;

      if (result instanceof Blob) {
        blob = result;
      } else if (typeof result === 'string') {
        const content = result.startsWith('\uFEFF') ? result : '\uFEFF' + result;
        blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      } else if (typeof result === 'object') {
        filename = result.filename || defaultFilename;
        if (result.blob) {
          blob = result.blob;
        } else if (result.rawCsv) {
          const content = result.rawCsv.startsWith('\uFEFF') ? result.rawCsv : '\uFEFF' + result.rawCsv;
          blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        } else if (result.data) {
          const csv = convertJsonToCsv(result.data, result.headers);
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        } else {
          throw new Error('Dữ liệu xuất không hợp lệ');
        }
      } else {
        throw new Error('Định dạng xuất không hỗ trợ');
      }

      downloadBlob(blob, filename);
      toast.success('Xuất file thành công', `Đã tải xuống file: ${filename}`);
    } catch (err: any) {
      console.error('Lỗi khi xuất file:', err);
      toast.error('Lỗi xuất dữ liệu', err?.message || 'Không thể tạo file báo cáo.');
    } finally {
      setIsExporting(false);
    }
  }, [toast]);

  return { isExporting, exportData };
}
