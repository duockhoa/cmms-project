export declare const SCHEDULE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly ACTIVE: "ACTIVE";
    readonly PAUSED: "PAUSED";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
export type ScheduleStatus = typeof SCHEDULE_STATUS[keyof typeof SCHEDULE_STATUS];
export declare const SCHEDULE_FREQUENCY_TYPE: {
    readonly DAILY: "DAILY";
    readonly WEEKLY: "WEEKLY";
    readonly MONTHLY: "MONTHLY";
    readonly QUARTERLY: "QUARTERLY";
    readonly YEARLY: "YEARLY";
    readonly OPERATING_HOURS: "OPERATING_HOURS";
};
export type ScheduleFrequencyType = typeof SCHEDULE_FREQUENCY_TYPE[keyof typeof SCHEDULE_FREQUENCY_TYPE];
