"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyWorkOrder = classifyWorkOrder;
const analytics_constants_1 = require("../analytics.constants");
function classifyWorkOrder(wo) {
    const hasSchedule = Boolean(wo.scheduleId && String(wo.scheduleId).trim().length > 0);
    const hasRequest = Boolean(wo.requestId && String(wo.requestId).trim().length > 0);
    if (hasSchedule && !hasRequest) {
        return analytics_constants_1.WORK_ORDER_CLASSIFICATION.PREVENTIVE;
    }
    if (hasRequest && !hasSchedule) {
        return analytics_constants_1.WORK_ORDER_CLASSIFICATION.CORRECTIVE;
    }
    if (!hasSchedule && !hasRequest) {
        return analytics_constants_1.WORK_ORDER_CLASSIFICATION.UNCLASSIFIED;
    }
    return analytics_constants_1.WORK_ORDER_CLASSIFICATION.CONFLICTED;
}
//# sourceMappingURL=kpi-classifier.utility.js.map