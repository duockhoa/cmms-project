export const NotificationEvents = {
  // Maintenance Requests
  REQUEST_CREATED: 'request.created',
  REQUEST_APPROVED: 'request.approved',
  REQUEST_REJECTED: 'request.rejected',
  REQUEST_RETURNED: 'request.returned',

  // Work Orders
  WORK_ORDER_STATUS_CHANGED: 'work_order.status_changed',

  // Fabrication & Modification Orders
  FABRICATION_ASSIGNED: 'fabrication.assigned',
  FABRICATION_UPDATED: 'fabrication.updated',

  // Preventive Maintenance Schedules
  SCHEDULE_WO_GENERATED: 'schedule.wo_generated',

  // Inventory & Spare Parts
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
} as const;
