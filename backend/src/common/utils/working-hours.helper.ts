/**
 * Khung giờ làm việc và mốc áp dụng SLA 4h cho phản hồi sự cố kỹ thuật.
 * - Khung giờ làm việc: 08:00 - 17:00 (9 giờ làm việc/ngày).
 * - Ngày làm việc: Thứ Hai đến Thứ Bảy (Nghỉ Chủ Nhật).
 * - Mốc chuyển giao CUTOFF_DATE: Các sự cố trước 10/11/2026 được coi là PASS.
 */

export const KPI_4H_SLA_CUTOFF_DATE = new Date('2026-11-10T00:00:00+07:00');

export function isExemptFrom4hSla(date: Date | string | number | null | undefined): boolean {
  if (!date) return true;
  const d = new Date(date);
  return d.getTime() < KPI_4H_SLA_CUTOFF_DATE.getTime();
}

/**
 * Tính số giờ làm việc giữa 2 mốc thời gian (trong khung 08:00 - 17:00, loại trừ ngoài giờ và Chủ Nhật).
 * @param startDate Thời điểm bắt đầu giao việc cho KTV
 * @param endDate Thời điểm KTV đánh giá sơ bộ hoặc thời điểm hiện tại
 * @returns Số giờ làm việc (thập phân, làm tròn 2 chữ số)
 */
export function calculateWorkingHoursBetween(
  startDate: Date | string | number,
  endDate: Date | string | number,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return 0;
  }

  const WORK_START_HOUR = 8;
  const WORK_END_HOUR = 17;

  let totalWorkingMs = 0;
  const current = new Date(start);

  while (current.getTime() < end.getTime()) {
    const dayOfWeek = current.getDay(); // 0 = Chủ nhật

    if (dayOfWeek !== 0) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const date = current.getDate();

      const dayStart = new Date(year, month, date, WORK_START_HOUR, 0, 0, 0);
      const dayEnd = new Date(year, month, date, WORK_END_HOUR, 0, 0, 0);

      const effectiveStart = current.getTime() < dayStart.getTime() ? dayStart : current;
      const isLastDay = end.getFullYear() === year && end.getMonth() === month && end.getDate() === date;
      const effectiveEnd = isLastDay && end.getTime() < dayEnd.getTime() ? end : dayEnd;

      if (effectiveStart.getTime() < dayEnd.getTime() && effectiveEnd.getTime() > dayStart.getTime()) {
        const clampedStart = Math.max(effectiveStart.getTime(), dayStart.getTime());
        const clampedEnd = Math.min(effectiveEnd.getTime(), dayEnd.getTime());
        if (clampedEnd > clampedStart) {
          totalWorkingMs += (clampedEnd - clampedStart);
        }
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  const hours = totalWorkingMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

