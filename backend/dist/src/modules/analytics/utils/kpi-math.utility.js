"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundHalfUp = roundHalfUp;
function roundHalfUp(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return 0;
    }
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
//# sourceMappingURL=kpi-math.utility.js.map