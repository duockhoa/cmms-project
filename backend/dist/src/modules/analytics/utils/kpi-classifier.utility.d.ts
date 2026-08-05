import { WORK_ORDER_CLASSIFICATION } from '../analytics.constants';
export interface WorkOrderClassifierInput {
    scheduleId?: string | null;
    requestId?: string | null;
}
export declare function classifyWorkOrder(wo: WorkOrderClassifierInput): WORK_ORDER_CLASSIFICATION;
