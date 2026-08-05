"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsDateWindowService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsDateWindowService = class AnalyticsDateWindowService {
    resolveDateWindow(startDateInput, endDateInput, timezoneInput = 'Asia/Ho_Chi_Minh', maxRangeDays = 366) {
        const tz = timezoneInput || 'Asia/Ho_Chi_Minh';
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
        }
        catch (e) {
            throw new common_1.BadRequestException(`Múi giờ '${tz}' không phải là IANA timezone hợp lệ`);
        }
        const now = new Date();
        let startUtc;
        let endUtc;
        if (startDateInput && endDateInput) {
            const parsedStart = new Date(startDateInput);
            const parsedEnd = new Date(endDateInput);
            if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
                throw new common_1.BadRequestException('Định dạng ngày startDate hoặc endDate không hợp lệ ISO 8601');
            }
            if (parsedStart > parsedEnd) {
                throw new common_1.BadRequestException('startDate không được lớn hơn endDate');
            }
            startUtc = this.getStartOfDayInTimezone(parsedStart, tz);
            endUtc = this.getStartOfNextDayInTimezone(parsedEnd, tz);
        }
        else if (startDateInput && !endDateInput) {
            const parsedStart = new Date(startDateInput);
            if (isNaN(parsedStart.getTime())) {
                throw new common_1.BadRequestException('Định dạng startDate không hợp lệ ISO 8601');
            }
            startUtc = this.getStartOfDayInTimezone(parsedStart, tz);
            endUtc = new Date(startUtc.getTime() + 30 * 86400000);
        }
        else if (!startDateInput && endDateInput) {
            const parsedEnd = new Date(endDateInput);
            if (isNaN(parsedEnd.getTime())) {
                throw new common_1.BadRequestException('Định dạng endDate không hợp lệ ISO 8601');
            }
            endUtc = this.getStartOfNextDayInTimezone(parsedEnd, tz);
            startUtc = new Date(endUtc.getTime() - 30 * 86400000);
        }
        else {
            endUtc = this.getStartOfNextDayInTimezone(now, tz);
            startUtc = new Date(endUtc.getTime() - 30 * 86400000);
        }
        const diffDays = (endUtc.getTime() - startUtc.getTime()) / (1000 * 3600 * 24);
        if (diffDays > maxRangeDays) {
            throw new common_1.BadRequestException(`Khoảng thời gian báo cáo không được vượt quá ${maxRangeDays} ngày`);
        }
        return {
            startInclusive: startUtc.toISOString(),
            endExclusive: endUtc.toISOString(),
        };
    }
    getStartOfDayInTimezone(date, tz) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find((p) => p.type === 'year').value;
        const month = parts.find((p) => p.type === 'month').value;
        const day = parts.find((p) => p.type === 'day').value;
        const localIsoStr = `${year}-${month}-${day}T00:00:00.000`;
        return this.parseLocalIsoInTimezone(localIsoStr, tz);
    }
    getStartOfNextDayInTimezone(date, tz) {
        const startOfToday = this.getStartOfDayInTimezone(date, tz);
        return new Date(startOfToday.getTime() + 24 * 3600 * 1000);
    }
    parseLocalIsoInTimezone(localIso, tz) {
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
        const y = parseInt(parts.find((p) => p.type === 'year').value, 10);
        const m = parseInt(parts.find((p) => p.type === 'month').value, 10) - 1;
        const d = parseInt(parts.find((p) => p.type === 'day').value, 10);
        let h = parseInt(parts.find((p) => p.type === 'hour').value, 10);
        if (h === 24)
            h = 0;
        const min = parseInt(parts.find((p) => p.type === 'minute').value, 10);
        const s = parseInt(parts.find((p) => p.type === 'second').value, 10);
        const utcAsLocal = Date.UTC(y, m, d, h, min, s);
        const offsetMs = utcAsLocal - dateWithoutTz.getTime();
        return new Date(dateWithoutTz.getTime() - offsetMs);
    }
};
exports.AnalyticsDateWindowService = AnalyticsDateWindowService;
exports.AnalyticsDateWindowService = AnalyticsDateWindowService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsDateWindowService);
//# sourceMappingURL=analytics-date-window.service.js.map