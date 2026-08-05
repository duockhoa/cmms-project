"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderStateMachine = void 0;
const common_1 = require("@nestjs/common");
class WorkOrderStateMachine {
    static canTransition(from, to) {
        const allowed = this.transitions[from] || [];
        return allowed.includes(to);
    }
    static assertTransition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new common_1.ConflictException(`Không thể chuyển đổi trạng thái Work Order từ "${from}" sang "${to}"`);
        }
    }
    static getAllowedTransitions(status) {
        return this.transitions[status] || [];
    }
}
exports.WorkOrderStateMachine = WorkOrderStateMachine;
WorkOrderStateMachine.transitions = {
    PENDING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
    ON_HOLD: ['IN_PROGRESS'],
    COMPLETED: ['VERIFIED', 'IN_PROGRESS'],
    VERIFIED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
};
//# sourceMappingURL=work-order-state-machine.js.map