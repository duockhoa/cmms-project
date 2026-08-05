/**
 * Standardized Round Half Up utility to N decimal places.
 * Example:
 *   roundHalfUp(1.005) === 1.01
 *   roundHalfUp(2.675) === 2.68
 *   roundHalfUp(0.004) === 0.00
 */
export function roundHalfUp(value: number, decimals = 2): number {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  // Add Number.EPSILON to handle floating point representation edge cases correctly
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
