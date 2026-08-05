import { DateWindowContract } from '../contracts/analytics-response.contract';
export declare class AnalyticsDateWindowService {
    resolveDateWindow(startDateInput?: string, endDateInput?: string, timezoneInput?: string, maxRangeDays?: number): DateWindowContract;
    private getStartOfDayInTimezone;
    private getStartOfNextDayInTimezone;
    private parseLocalIsoInTimezone;
}
