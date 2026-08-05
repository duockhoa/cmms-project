import { WORK_ORDER_CLASSIFICATION } from '../analytics.constants';

export interface WorkOrderClassifierInput {
  scheduleId?: string | null;
  requestId?: string | null;
}

/**
 * Shared uniform WorkOrderClassifier logic across all CMMS KPI calculations.
 * Exactly 4 states: PREVENTIVE, CORRECTIVE, UNCLASSIFIED, CONFLICTED.
 */
export function classifyWorkOrder(wo: WorkOrderClassifierInput): WORK_ORDER_CLASSIFICATION {
  const hasSchedule = Boolean(wo.scheduleId && String(wo.scheduleId).trim().length > 0);
  const hasRequest = Boolean(wo.requestId && String(wo.requestId).trim().length > 0);

  if (hasSchedule && !hasRequest) {
    return WORK_ORDER_CLASSIFICATION.PREVENTIVE;
  }

  if (hasRequest && !hasSchedule) {
    return WORK_ORDER_CLASSIFICATION.CORRECTIVE;
  }

  if (!hasSchedule && !hasRequest) {
    return WORK_ORDER_CLASSIFICATION.UNCLASSIFIED;
  }

  // Both scheduleId and requestId exist -> CONFLICTED
  return WORK_ORDER_CLASSIFICATION.CONFLICTED;
}
