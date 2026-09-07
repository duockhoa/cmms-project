/**
 * Bộ tiện ích định dạng số và ngày tháng chuẩn hóa theo tiêu chuẩn Việt Nam (vi-VN)
 * - Dấu phân cách hàng nghìn: Dấu chấm (.)
 * - Dấu phân cách thập phân: Dấu phẩy (,)
 * - Tiền tệ: Đồng (₫)
 */

export function formatVN(val: number | string | undefined | null, maxDecimals = 3): string {
  if (val === undefined || val === null || val === '') return '0';
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    let s = String(val).trim();
    if (s.includes('.') && s.includes(',')) {
      // e.g. 1.234,56 (VN) or 1,234.56 (US)
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        // VN format: dot is thousand, comma is decimal
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: comma is thousand, dot is decimal
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',') && !s.includes('.')) {
      // e.g. 12,5 (VN decimal)
      s = s.replace(',', '.');
    }
    num = Number(s);
  }
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatCurrencyVN(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0 ₫';
  const formatted = formatVN(val, 0);
  return `${formatted} ₫`;
}

export function formatDateTimeVN(val: Date | string | number | undefined | null): string {
  if (!val) return '---';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  });
}

export function formatDateVN(val: Date | string | number | undefined | null): string {
  if (!val) return '---';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTimeVN(val: Date | string | number | undefined | null): string {
  if (!val) return '---';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
