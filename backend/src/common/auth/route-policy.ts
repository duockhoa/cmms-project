export interface RoutePolicy {
  any?: readonly string[];
  authenticated?: boolean;
  public?: boolean;
  machine?: 'evn';
  scope?: 'equipment' | 'request' | 'workOrder' | 'schedule' | 'fabrication' | 'feedback';
}

/** Explicit route inventory. A new route is denied until it has a reviewed policy. */
export const ROUTE_POLICIES: Record<string, RoutePolicy> = {};
function routes(controller: string, entries: Record<string, RoutePolicy | string | string[]>) {
  for (const [handlers, value] of Object.entries(entries)) {
    const policy = typeof value === 'string' ? { any: [value] } : Array.isArray(value) ? { any: value } : value;
    for (const handler of handlers.split(' ')) ROUTE_POLICIES[`${controller}.${handler}`] = policy;
  }
}
const session = { authenticated: true };
const publicRoute = { public: true };
const equipmentRead = ['equipment:view', 'requests:create', 'work_orders:create', 'schedules:view', 'operation_logs:view', 'operation_logs:create'];
const lookup = { authenticated: true };
routes('AuthController', { 'login refresh logout adoptSession getSession': publicRoute, getMe: session });
routes('HealthController', { check: publicRoute });
routes('WellKnownController', { 'getDiscovery getProtectedResource': publicRoute });
routes('McpController', {
  'getHealth getOAuthDiscovery registerClient handleAuthorize handleAuthorizeSubmit exchangeToken': publicRoute,
  'handlePostRoot handlePostSse handleSseRoot handleSse handleMessages': session,
});
routes('AnalyticsController', {
  'getDashboardSummary getKpiSummary getIncidentResponseKpi': ['dashboard:view', 'reports:view'],
  getOperationLogsReport: ['reports:view', 'operation_logs:view'],
});
// Entity-specific permissions/ownership are additionally enforced inside AttachmentsService.
routes('AttachmentsController', { 'uploadFile getAttachments downloadFile viewFile deleteFile': session });
routes('EquipmentController', {
  'findAll findOne getSpareParts': equipmentRead, 'getDepartments lookup': lookup,
  syncStatuses: 'settings:system', 'update addSparePart removeSparePart importFunctionalUnits': 'equipment:edit', 'create importBulk': 'equipment:create', remove: 'equipment:delete',
});
routes('EquipmentParametersController', {
  getParameters: equipmentRead, 'createParameter bulkAssign sync batchUpdate updateParameter deleteParameter': 'equipment:edit', reorder: 'equipment:reorder_parameters',
});
routes('EquipmentTechnicalSpecsController', { getSpecs: equipmentRead, 'createSpec bulkAssign sync batchUpdate updateSpec deleteSpec': 'equipment:edit' });
routes('FunctionalUnitsController', { getByEquipment: equipmentRead, 'createForEquipment createBatchForEquipment updateForEquipment cloneFromEquipment deleteForEquipment': 'equipment:edit' });
routes('FunctionalUnitLibraryController', { getLibrary: lookup, 'createLibraryItem updateLibraryItem deleteLibraryItem': 'equipment:edit' });
routes('EquipmentOeeRecordsController', { 'getShiftContext getRecordsByEquipment': 'operation_logs:view', submitOeeRecord: 'operation_logs:create', updateOeeConfig: 'equipment:edit' });
routes('GlobalOeeRecordsController', { 'getAllRecords getOeeAnalyticsSummary': 'operation_logs:view', voidRecord: 'operation_logs:void' });
routes('OperationLogsController', { getLogs: 'operation_logs:view', submitLogs: 'operation_logs:create', voidSession: 'operation_logs:void' });
routes('GlobalOperationLogsController', { getAllLogs: 'operation_logs:view' });
routes('RequestsController', {
  'findAll findOne getHistory': 'requests:view', create: 'requests:create', update: 'requests:edit', delete: 'requests:delete',
  approve: 'requests:approve', 'reject returnRequest': 'requests:reject', resubmitRequest: ['requests:create', 'requests:edit'],
  cancelRequest: ['requests:create', 'requests:cancel'],
});
routes('WorkOrdersController', {
  'findByEquipmentQr getExecutionLogs findAll findOne getWorkOrderTransactions getActiveSession getSessions': 'work_orders:view',
  create: 'work_orders:create', 'assign assignExecutor': 'work_orders:assign',
  'createExecutionLog start startWithAssessment pause resume complete startSession stopSession': 'work_orders:execute',
  'updateStatus escalate classify': 'work_orders:edit',
  'submitHandover': ['work_orders:execute', 'work_orders:edit'],
  'acceptHandover rejectHandover qaVerify qaReject verify close': 'work_orders:close',
  cancel: 'work_orders:cancel', addItem: ['inventory:out', 'work_orders:edit'], materialReturn: 'inventory:in', remove: 'work_orders:delete',
});
routes('SchedulesController', {
  'findAll findOne getHistory': 'schedules:view', create: 'schedules:create', 'update complete generateWorkOrder': 'schedules:edit', processDueSchedules: 'settings:system',
  'activate pause': 'schedules:pause_resume', cancel: 'schedules:cancel', remove: 'schedules:delete',
});
routes('FabricationController', {
  'getStats findAll findOne getHistory getProgressLogs getActiveSession getWorkSessions': 'fabrication:view', create: 'fabrication:create',
  'createProgressLog deleteProgressLog startSession stopSession': 'fabrication:edit', update: ['fabrication:edit', 'fabrication:close'], remove: 'fabrication:delete',
});
routes('InventoryController', {
  'getInventoryReport findAllReceipts findReceiptOne findAll findOne getItemTransactions': 'inventory:view', create: 'inventory:create', update: 'inventory:edit',
  createReceipt: 'inventory:in', directIssue: 'inventory:out', 'adjustStock adjustIn adjustOut': 'inventory:adjust', remove: 'inventory:delete',
});
routes('ChecklistTemplatesController', { 'findAll findOne': ['checklists:view', 'schedules:view'], create: 'checklists:create', 'update remove addItems removeItem reorderItems': 'checklists:edit' });
routes('ChecklistExecutionsController', {
  createExecution: 'checklists:create', 'getExecutions getExecutionById': 'checklists:view', updateItem: 'checklists:execute', completeExecution: 'checklists:approve', cancelExecution: 'checklists:edit',
});
routes('ChecklistLibraryController', { findAll: ['checklists:view', 'schedules:view'], 'create update remove': 'checklists:edit' });
routes('FeedbacksController', { create: 'feedbacks:create', 'findAll findOne': 'feedbacks:view', update: 'feedbacks:reply', remove: 'feedbacks:delete' });
routes('RolesController', { 'findAll findOne create update delete': 'settings:roles' });
for (const controller of ['EquipmentCategoryController', 'LocationController', 'ProductionLineController']) {
  routes(controller, { 'findAll findOne': lookup, 'create update remove': 'settings:system' });
}
routes('SystemSettingController', { 'findAll findOne': 'settings:view', update: 'settings:system' });
routes('StandardParametersController', { findAll: lookup, 'create update remove': 'settings:system' });
routes('StandardTechnicalSpecsController', { 'findAll findOne': lookup, 'create update remove': 'settings:system' });
routes('UsersController', {
  'previewMerge confirmMerge getMergeHistory getMergeAudit': 'settings:merge_users',
  'syncHrmUsers identityAudit cleanDuplicates createUser updateUser deleteUser updateTechnicalProfile': 'settings:users',
  'getUsers getAssignees getDepartments getUserById': lookup, updateAvailability: ['settings:users', 'work_orders:assign'],
  updateRole: 'settings:roles', updateCustomPermissions: 'settings:user_perms',
});
routes('NotificationsController', { 'getNotifications markAsRead': session });
routes('UserConnectionsController', { getConnections: 'settings:view', forceDisconnect: 'settings:users' });
routes('MailController', { 'getStatus testSend': 'settings:system' });
routes('UtilitiesController', {
  'getPoints getPointByIdOrCode getPeriodBaselines getReadings getStatusLogs getAnalytics getCumulativeReport getTrendMatrixReport': 'utilities:view',
  'createPoint updatePoint': 'utilities:manage_points', 'batchSetBaselines setBaselineReading batchSetPeriodBaselines': 'utilities:baseline',
  deletePoint: 'utilities:delete_point', recordReading: 'utilities:record', updateReading: 'utilities:edit_reading',
  voidReading: 'utilities:void_reading', recalculateReadings: 'utilities:recalculate', recordSystemStatus: 'utilities:status_toggle',
  syncEvnReadings: { any: ['utilities:record'], machine: 'evn' },
});

export function getRoutePolicy(controller: string, handler: string): RoutePolicy | undefined {
  return ROUTE_POLICIES[`${controller}.${handler}`];
}
export const AUTHENTICATED_REQUEST = Symbol('qltb.authenticated');
