import { Injectable, BadRequestException } from '@nestjs/common';
import { DateWindowContract } from '../contracts/analytics-response.contract';

@Injectable()
export class AnalyticsDateWindowService {
  /**
   * Resolves date window into UTC ISO bounds [startInclusive, endExclusive]
   * according to specified IANA report timezone.
   */
  resolveDateWindow(
    startDateInput?: string,
    endDateInput?: string,
    timezoneInput = 'Asia/Ho_Chi_Minh',
    maxRangeDays = 366
  ): DateWindowContract {
    const tz = timezoneInput || 'Asia/Ho_Chi_Minh';
    
    // Validate timezone string
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch (e) {
      throw new BadRequestException(`Múi giờ '${tz}' không phải là IANA timezone hợp lệ`);
    }

    const now = new Date();

    let startUtc: Date;
    let endUtc: Date;

    if (startDateInput && endDateInput) {
      const parsedStart = new Date(startDateInput);
      const parsedEnd = new Date(endDateInput);

      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        throw new BadRequestException('Định dạng ngày startDate hoặc endDate không hợp lệ ISO 8601');
      }

      if (parsedStart > parsedEnd) {
        throw new BadRequestException('startDate không được lớn hơn endDate');
      }

      startUtc = this.getStartOfDayInTimezone(parsedStart, tz);
      // endExclusive is start of next day after endDate
      endUtc = this.getStartOfNextDayInTimezone(parsedEnd, tz);

    } else if (startDateInput && !endDateInput) {
      const parsedStart = new Date(startDateInput);
      if (isNaN(parsedStart.getTime())) {
        throw new BadRequestException('Định dạng startDate không hợp lệ ISO 8601');
      }
      startUtc = this.getStartOfDayInTimezone(parsedStart, tz);
      endUtc = new Date(startUtc.getTime() + 30 * 86400000);

    } else if (!startDateInput && endDateInput) {
      const parsedEnd = new Date(endDateInput);
      if (isNaN(parsedEnd.getTime())) {
        throw new BadRequestException('Định dạng endDate không hợp lệ ISO 8601');
      }
      endUtc = this.getStartOfNextDayInTimezone(parsedEnd, tz);
      startUtc = new Date(endUtc.getTime() - 30 * 86400000);

    } else {
      // Default: Last 30 days up to end of today
      endUtc = this.getStartOfNextDayInTimezone(now, tz);
      startUtc = new Date(endUtc.getTime() - 30 * 86400000);
    }

    // Range duration validation
    const diffDays = (endUtc.getTime() - startUtc.getTime()) / (1000 * 3600 * 24);
    if (diffDays > maxRangeDays) {
      throw new BadRequestException(`Khoảng thời gian báo cáo không được vượt quá ${maxRangeDays} ngày`);
    }

    return {
      startInclusive: startUtc.toISOString(),
      endExclusive: endUtc.toISOString(),
    };
  }

  /**
   * Helper: Get start of day in specified timezone as a UTC Date instance
   */
  private getStartOfDayInTimezone(date: Date, tz: string): Date {
    // Format YYYY-MM-DD in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')!.value;
    const month = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;

    const localIsoStr = `${year}-${month}-${day}T00:00:00.000`;
    return this.parseLocalIsoInTimezone(localIsoStr, tz);
  }

  /**
   * Helper: Get start of next day in specified timezone as a UTC Date instance
   */
  private getStartOfNextDayInTimezone(date: Date, tz: string): Date {
    const startOfToday = this.getStartOfDayInTimezone(date, tz);
    return new Date(startOfToday.getTime() + 24 * 3600 * 1000);
  }

  /**
   * Parse a local ISO datetime string (e.g. 2026-07-01T00:00:00.000) in target timezone to UTC Date object
   */
  private parseLocalIsoInTimezone(localIso: string, tz: string): Date {
    const dateWithoutTz = new Date(`${localIso}Z`);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter.formatToParts(dateWithoutTz);
    const y = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
    const m = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
    const d = parseInt(parts.find((p) => p.type === 'day')!.value, 10);
    let h = parseInt(parts.find((p) => p.type === 'hour')!.value, 10);
    if (h === 24) h = 0;
    const min = parseInt(parts.find((p) => p.type === 'minute')!.value, 10);
    const s = parseInt(parts.find((p) => p.type === 'second')!.value, 10);

    const utcAsLocal = Date.UTC(y, m, d, h, min, s);
    const offsetMs = utcAsLocal - dateWithoutTz.getTime();
    return new Date(dateWithoutTz.getTime() - offsetMs);
  }
}
