# Ma trận route xác thực và quyền QLTB

Sinh từ controller và route-policy.ts bằng `node -r ts-node/register scripts/export-auth-route-matrix.ts`. Phạm vi chi tiết cần đối chiếu service và nghiệm thu theo vai trò.

Vai trò được phép: ADMIN/SUPER_ADMIN có hiệu lực hoặc tài khoản có ít nhất một quyền trong cột Quyền. Nhóm vô hiệu hóa không cấp quyền; tài khoản khóa bị từ chối. Route Public là ngoại lệ được khai báo rõ.

Tổng số route HTTP: 255.

| Phương thức | Đường dẫn | Xác thực | Quyền | Nơi kiểm tra phạm vi |
| --- | --- | --- | --- | --- |
| GET | /api/v1/analytics/dashboard | JWT | dashboard:view hoặc reports:view | AnalyticsController.getDashboardSummary; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/analytics/kpis | JWT | dashboard:view hoặc reports:view | AnalyticsController.getKpiSummary; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/analytics/operation-logs-report | JWT | reports:view hoặc operation_logs:view | AnalyticsController.getOperationLogsReport; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/attachments | JWT | Phiên hợp lệ | AttachmentsController.uploadFile; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/attachments | JWT | Phiên hợp lệ | AttachmentsController.getAttachments; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/attachments/:id/download | JWT | Phiên hợp lệ | AttachmentsController.downloadFile; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/attachments/:id/view | JWT | Phiên hợp lệ | AttachmentsController.viewFile; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/attachments/:id | JWT | Phiên hợp lệ | AttachmentsController.deleteFile; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/auth/login | Mật khẩu HRM + Origin | — | AuthController.login; BrowserSessionService |
| POST | /api/v1/auth/logout | Cookie HttpOnly + CSRF + Origin | — | AuthController.logout; BrowserSessionService |
| POST | /api/v1/auth/refresh | Cookie HttpOnly + CSRF + Origin | — | AuthController.refresh; BrowserSessionService |
| GET | /api/v1/auth/session | Cookie HttpOnly | — | AuthController.getSession; BrowserSessionService |
| POST | /api/v1/auth/session | Bearer SSO + refresh cùng chủ thể + Origin | — | AuthController.adoptSession; BrowserSessionService |
| GET | /api/v1/auth/me | JWT | Phiên hợp lệ | AuthController.getMe; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/checklist-executions | JWT | checklists:create | ChecklistExecutionsController.createExecution; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:id/checklist-executions | JWT | checklists:view | ChecklistExecutionsController.getExecutions; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/checklist-executions/:executionId | JWT | checklists:view | ChecklistExecutionsController.getExecutionById; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/checklist-executions/:executionId/items | JWT | checklists:execute | ChecklistExecutionsController.updateItem; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/checklist-executions/:executionId/complete | JWT | checklists:approve | ChecklistExecutionsController.completeExecution; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/checklist-executions/:executionId/cancel | JWT | checklists:edit | ChecklistExecutionsController.cancelExecution; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/checklist-templates | JWT | checklists:view hoặc schedules:view | ChecklistTemplatesController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/checklist-templates/:id | JWT | checklists:view hoặc schedules:view | ChecklistTemplatesController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/checklist-templates | JWT | checklists:create | ChecklistTemplatesController.create; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/checklist-templates/:id | JWT | checklists:edit | ChecklistTemplatesController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/checklist-templates/:id | JWT | checklists:edit | ChecklistTemplatesController.remove; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/checklist-templates/:id/items | JWT | checklists:edit | ChecklistTemplatesController.addItems; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/checklist-templates/:id/items/:itemId | JWT | checklists:edit | ChecklistTemplatesController.removeItem; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/checklist-templates/:id/items/reorder | JWT | checklists:edit | ChecklistTemplatesController.reorderItems; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/parameters | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | EquipmentParametersController.getParameters; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/parameters | JWT | equipment:edit | EquipmentParametersController.createParameter; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/parameters/bulk-assign | JWT | equipment:edit | EquipmentParametersController.bulkAssign; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/parameters/sync | JWT | equipment:edit | EquipmentParametersController.sync; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/equipment/:equipmentId/parameters/batch | JWT | equipment:edit | EquipmentParametersController.batchUpdate; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/equipment/:equipmentId/parameters/reorder | JWT | equipment:reorder_parameters | EquipmentParametersController.reorder; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/equipment/:equipmentId/parameters/:id | JWT | equipment:edit | EquipmentParametersController.updateParameter; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment/:equipmentId/parameters/:id | JWT | equipment:edit | EquipmentParametersController.deleteParameter; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/technical-specs | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | EquipmentTechnicalSpecsController.getSpecs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/technical-specs | JWT | equipment:edit | EquipmentTechnicalSpecsController.createSpec; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/technical-specs/bulk-assign | JWT | equipment:edit | EquipmentTechnicalSpecsController.bulkAssign; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/technical-specs/sync | JWT | equipment:edit | EquipmentTechnicalSpecsController.sync; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/equipment/:equipmentId/technical-specs/batch | JWT | equipment:edit | EquipmentTechnicalSpecsController.batchUpdate; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/equipment/:equipmentId/technical-specs/:id | JWT | equipment:edit | EquipmentTechnicalSpecsController.updateSpec; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment/:equipmentId/technical-specs/:id | JWT | equipment:edit | EquipmentTechnicalSpecsController.deleteSpec; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | EquipmentController.findAll; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/sync-statuses | JWT | settings:system | EquipmentController.syncStatuses; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/departments | JWT | Phiên hợp lệ | EquipmentController.getDepartments; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:id | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | EquipmentController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:id/spare-parts | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | EquipmentController.getSpareParts; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:id/spare-parts | JWT | equipment:edit | EquipmentController.addSparePart; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment/:id/spare-parts/:linkId | JWT | equipment:edit | EquipmentController.removeSparePart; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment | JWT | equipment:create | EquipmentController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/equipment/:id | JWT | equipment:edit | EquipmentController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment/:id | JWT | equipment:delete | EquipmentController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/functional-unit-library | JWT | Phiên hợp lệ | FunctionalUnitLibraryController.getLibrary; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/functional-unit-library | JWT | equipment:edit | FunctionalUnitLibraryController.createLibraryItem; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/functional-unit-library/:id | JWT | equipment:edit | FunctionalUnitLibraryController.updateLibraryItem; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/functional-unit-library/:id | JWT | equipment:edit | FunctionalUnitLibraryController.deleteLibraryItem; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/functional-units | JWT | equipment:view hoặc requests:create hoặc work_orders:create hoặc schedules:view hoặc operation_logs:view hoặc operation_logs:create | FunctionalUnitsController.getByEquipment; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/functional-units | JWT | equipment:edit | FunctionalUnitsController.createForEquipment; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/functional-units/batch | JWT | equipment:edit | FunctionalUnitsController.createBatchForEquipment; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/equipment/:equipmentId/functional-units/:id | JWT | equipment:edit | FunctionalUnitsController.updateForEquipment; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/functional-units/clone | JWT | equipment:edit | FunctionalUnitsController.cloneFromEquipment; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment/:equipmentId/functional-units/:id | JWT | equipment:edit | FunctionalUnitsController.deleteForEquipment; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/oee-records/shift-context | JWT | operation_logs:view | EquipmentOeeRecordsController.getShiftContext; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/oee-records | JWT | operation_logs:view | EquipmentOeeRecordsController.getRecordsByEquipment; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/oee-records | JWT | operation_logs:create | EquipmentOeeRecordsController.submitOeeRecord; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/equipment/:equipmentId/oee-records/config | JWT | equipment:edit | EquipmentOeeRecordsController.updateOeeConfig; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/oee-records | JWT | operation_logs:view | GlobalOeeRecordsController.getAllRecords; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/oee-records/analytics | JWT | operation_logs:view | GlobalOeeRecordsController.getOeeAnalyticsSummary; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/oee-records/:recordId/void | JWT | operation_logs:void | GlobalOeeRecordsController.voidRecord; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment/:equipmentId/operation-logs | JWT | operation_logs:view | OperationLogsController.getLogs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/operation-logs | JWT | operation_logs:create | OperationLogsController.submitLogs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment/:equipmentId/operation-logs/void-session | JWT | operation_logs:void | OperationLogsController.voidSession; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/operation-logs | JWT | operation_logs:view | GlobalOperationLogsController.getAllLogs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/fabrication-orders | JWT | fabrication:create | FabricationController.create; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/stats | JWT | fabrication:view | FabricationController.getStats; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders | JWT | fabrication:view | FabricationController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/:id | JWT | fabrication:view | FabricationController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/:id/history | JWT | fabrication:view | FabricationController.getHistory; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/:id/progress-logs | JWT | fabrication:view | FabricationController.getProgressLogs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/fabrication-orders/:id/progress-logs | JWT | fabrication:edit | FabricationController.createProgressLog; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/fabrication-orders/:id/progress-logs/:logId | JWT | fabrication:edit | FabricationController.deleteProgressLog; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/:id/sessions/active | JWT | fabrication:view | FabricationController.getActiveSession; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/fabrication-orders/:id/sessions/start | JWT | fabrication:edit | FabricationController.startSession; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/fabrication-orders/:id/sessions/:sessionId/stop | JWT | fabrication:edit | FabricationController.stopSession; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/fabrication-orders/:id/sessions | JWT | fabrication:view | FabricationController.getWorkSessions; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/fabrication-orders/:id | JWT | fabrication:edit hoặc fabrication:close | FabricationController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/fabrication-orders/:id | JWT | fabrication:delete | FabricationController.remove; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/feedbacks | JWT | feedbacks:create | FeedbacksController.create; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/feedbacks | JWT | feedbacks:view | FeedbacksController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/feedbacks/:id | JWT | feedbacks:view | FeedbacksController.findOne; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/feedbacks/:id | JWT | feedbacks:reply | FeedbacksController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/feedbacks/:id | JWT | feedbacks:delete | FeedbacksController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/health | Public | — | — |
| GET | /api/v1/inventory/report | JWT | inventory:view | InventoryController.getInventoryReport; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/inventory/receipts | JWT | inventory:view | InventoryController.findAllReceipts; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/inventory/receipts/:id | JWT | inventory:view | InventoryController.findReceiptOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory/receipts | JWT | inventory:in | InventoryController.createReceipt; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory/direct-issue | JWT | inventory:out | InventoryController.directIssue; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/inventory | JWT | inventory:view | InventoryController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/inventory/:id | JWT | inventory:view | InventoryController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/inventory/:id/transactions | JWT | inventory:view | InventoryController.getItemTransactions; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory | JWT | inventory:create | InventoryController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/inventory/:id | JWT | inventory:edit | InventoryController.update; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory/:id/adjust | JWT | inventory:adjust | InventoryController.adjustStock; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory/:id/adjust-in | JWT | inventory:adjust | InventoryController.adjustIn; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/inventory/:id/adjust-out | JWT | inventory:adjust | InventoryController.adjustOut; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/inventory/:id | JWT | inventory:delete | InventoryController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/mail/status | JWT | settings:system | MailController.getStatus; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/mail/test-send | JWT | settings:system | MailController.testSend; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/mcp/health | Public | — | — |
| GET | /api/v1/mcp/.well-known/oauth-authorization-server | Public | — | — |
| POST | /api/v1/mcp/oauth/register | Public | — | — |
| GET | /api/v1/mcp/oauth/authorize | Public | — | — |
| GET | /api/v1/mcp/oauth/callback | Public | — | — |
| POST | /api/v1/mcp/oauth/token | Public | — | — |
| POST | /api/v1/mcp | JWT | Phiên hợp lệ | McpController.handlePostRoot; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/mcp/sse | JWT | Phiên hợp lệ | McpController.handlePostSse; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/mcp | JWT | Phiên hợp lệ | McpController.handleSseRoot; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/mcp/sse | JWT | Phiên hợp lệ | McpController.handleSse; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/mcp/messages | JWT | Phiên hợp lệ | McpController.handleMessages; ResourceAccessService và service nghiệp vụ |
| GET | /.well-known/oauth-authorization-server | Public | — | — |
| GET | /.well-known/openid-configuration | Public | — | — |
| GET | /.well-known/oauth-protected-resource | Public | — | — |
| GET | /api/v1/notifications | JWT | Phiên hợp lệ | NotificationsController.getNotifications; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/notifications/:id/read | JWT | Phiên hợp lệ | NotificationsController.markAsRead; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/requests | JWT | requests:view | RequestsController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/requests/:id | JWT | requests:view | RequestsController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/requests/:id/history | JWT | requests:view | RequestsController.getHistory; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests | JWT | requests:create | RequestsController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/requests/:id | JWT | requests:edit | RequestsController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/requests/:id | JWT | requests:delete | RequestsController.delete; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests/:id/approve | JWT | requests:approve | RequestsController.approve; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests/:id/reject | JWT | requests:reject | RequestsController.reject; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests/:id/return | JWT | requests:reject | RequestsController.returnRequest; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests/:id/resubmit | JWT | requests:create hoặc requests:edit | RequestsController.resubmitRequest; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/requests/:id/cancel | JWT | requests:create hoặc requests:cancel | RequestsController.cancelRequest; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/maintenance-schedules | JWT | schedules:view | SchedulesController.findAll; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/process-due | JWT | settings:system | SchedulesController.processDueSchedules; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/maintenance-schedules/:id | JWT | schedules:view | SchedulesController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/maintenance-schedules/:id/history | JWT | schedules:view | SchedulesController.getHistory; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules | JWT | schedules:create | SchedulesController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/maintenance-schedules/:id | JWT | schedules:edit | SchedulesController.update; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/:id/activate | JWT | schedules:pause_resume | SchedulesController.activate; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/:id/pause | JWT | schedules:pause_resume | SchedulesController.pause; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/:id/complete | JWT | schedules:edit | SchedulesController.complete; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/:id/cancel | JWT | schedules:cancel | SchedulesController.cancel; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/maintenance-schedules/:id/generate-work-order | JWT | schedules:edit | SchedulesController.generateWorkOrder; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/maintenance-schedules/:id | JWT | schedules:delete | SchedulesController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/checklist-library | JWT | checklists:view hoặc schedules:view | ChecklistLibraryController.findAll; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/checklist-library | JWT | checklists:edit | ChecklistLibraryController.create; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/checklist-library/:id | JWT | checklists:edit | ChecklistLibraryController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/checklist-library/:id | JWT | checklists:edit | ChecklistLibraryController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/roles | JWT | settings:roles | RolesController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/roles/:id | JWT | settings:roles | RolesController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/roles | JWT | settings:roles | RolesController.create; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/roles/:id | JWT | settings:roles | RolesController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/roles/:id | JWT | settings:roles | RolesController.delete; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment-categories | JWT | Phiên hợp lệ | EquipmentCategoryController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/equipment-categories/:id | JWT | Phiên hợp lệ | EquipmentCategoryController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/equipment-categories | JWT | settings:system | EquipmentCategoryController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/equipment-categories/:id | JWT | settings:system | EquipmentCategoryController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/equipment-categories/:id | JWT | settings:system | EquipmentCategoryController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/locations | JWT | Phiên hợp lệ | LocationController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/locations/:id | JWT | Phiên hợp lệ | LocationController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/locations | JWT | settings:system | LocationController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/locations/:id | JWT | settings:system | LocationController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/locations/:id | JWT | settings:system | LocationController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/production-lines | JWT | Phiên hợp lệ | ProductionLineController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/production-lines/:id | JWT | Phiên hợp lệ | ProductionLineController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/production-lines | JWT | settings:system | ProductionLineController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/production-lines/:id | JWT | settings:system | ProductionLineController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/production-lines/:id | JWT | settings:system | ProductionLineController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/system-settings | JWT | settings:view | SystemSettingController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/system-settings/:key | JWT | settings:view | SystemSettingController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/system-settings | JWT | settings:system | SystemSettingController.update; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/standard-parameters | JWT | Phiên hợp lệ | StandardParametersController.findAll; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/standard-parameters | JWT | settings:system | StandardParametersController.create; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/standard-parameters/:id | JWT | settings:system | StandardParametersController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/standard-parameters/:id | JWT | settings:system | StandardParametersController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/standard-technical-specs | JWT | Phiên hợp lệ | StandardTechnicalSpecsController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/standard-technical-specs/:id | JWT | Phiên hợp lệ | StandardTechnicalSpecsController.findOne; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/standard-technical-specs | JWT | settings:system | StandardTechnicalSpecsController.create; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/standard-technical-specs/:id | JWT | settings:system | StandardTechnicalSpecsController.update; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/standard-technical-specs/:id | JWT | settings:system | StandardTechnicalSpecsController.remove; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/users/merge-preview | JWT | settings:merge_users | UsersController.previewMerge; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/users/merge-confirm | JWT | settings:merge_users | UsersController.confirmMerge; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/:id/merge-history | JWT | settings:merge_users | UsersController.getMergeHistory; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/merge-audits/:auditId | JWT | settings:merge_users | UsersController.getMergeAudit; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/users/sync-hrm | JWT | settings:users | UsersController.syncHrmUsers; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/identity-audit | JWT | settings:users | UsersController.identityAudit; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/users/clean-duplicates | JWT | settings:users | UsersController.cleanDuplicates; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users | JWT | Phiên hợp lệ | UsersController.getUsers; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/assignees | JWT | Phiên hợp lệ | UsersController.getAssignees; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/departments | JWT | Phiên hợp lệ | UsersController.getDepartments; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/users/:id | JWT | Phiên hợp lệ | UsersController.getUserById; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/users/:id/technical-profile | JWT | settings:users | UsersController.updateTechnicalProfile; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/users/:id/availability | JWT | settings:users hoặc work_orders:assign | UsersController.updateAvailability; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/users/:id/role | JWT | settings:roles | UsersController.updateRole; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/users/:id/custom-permissions | JWT | settings:user_perms | UsersController.updateCustomPermissions; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/users | JWT | settings:users | UsersController.createUser; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/users/:id | JWT | settings:users | UsersController.updateUser; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/users/:id | JWT | settings:users | UsersController.deleteUser; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/points | JWT | utilities:view | UtilitiesController.getPoints; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/points/:idOrCode | JWT | utilities:view | UtilitiesController.getPointByIdOrCode; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/points | JWT | utilities:manage_points | UtilitiesController.createPoint; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/utilities/points/:id | JWT | utilities:manage_points | UtilitiesController.updatePoint; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/utilities/points/batch-baselines | JWT | utilities:baseline | UtilitiesController.batchSetBaselines; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/utilities/points/:id/baseline | JWT | utilities:baseline | UtilitiesController.setBaselineReading; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/period-baselines | JWT | utilities:view | UtilitiesController.getPeriodBaselines; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/utilities/period-baselines | JWT | utilities:baseline | UtilitiesController.batchSetPeriodBaselines; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/utilities/points/:id | JWT | utilities:delete_point | UtilitiesController.deletePoint; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/readings | JWT | utilities:record | UtilitiesController.recordReading; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/readings/sync-evn | JWT hoặc EVN key (POST) | utilities:record | UtilitiesController.syncEvnReadings; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/readings | JWT | utilities:view | UtilitiesController.getReadings; ResourceAccessService và service nghiệp vụ |
| PUT | /api/v1/utilities/readings/:id | JWT | utilities:edit_reading | UtilitiesController.updateReading; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/readings/:id/void | JWT | utilities:void_reading | UtilitiesController.voidReading; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/readings/recalculate | JWT | utilities:recalculate | UtilitiesController.recalculateReadings; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/utilities/system-status | JWT | utilities:status_toggle | UtilitiesController.recordSystemStatus; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/system-status/history | JWT | utilities:view | UtilitiesController.getStatusLogs; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/analytics | JWT | utilities:view | UtilitiesController.getAnalytics; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/reports/cumulative | JWT | utilities:view | UtilitiesController.getCumulativeReport; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/utilities/reports/trend-matrix | JWT | utilities:view | UtilitiesController.getTrendMatrixReport; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/by-equipment-qr/:qrToken | JWT | work_orders:view | WorkOrdersController.findByEquipmentQr; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:id/execution-logs | JWT | work_orders:view | WorkOrdersController.getExecutionLogs; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/execution-logs | JWT | work_orders:execute | WorkOrdersController.createExecutionLog; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders | JWT | work_orders:view | WorkOrdersController.findAll; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:id | JWT | work_orders:view | WorkOrdersController.findOne; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:workOrderId/inventory-transactions | JWT | work_orders:view | WorkOrdersController.getWorkOrderTransactions; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders | JWT | work_orders:create | WorkOrdersController.create; ResourceAccessService và service nghiệp vụ |
| PATCH | /api/v1/work-orders/:id/status | JWT | work_orders:edit | WorkOrdersController.updateStatus; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/status | JWT | work_orders:edit | WorkOrdersController.updateStatus; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/assign | JWT | work_orders:assign | WorkOrdersController.assign; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/start | JWT | work_orders:execute | WorkOrdersController.start; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/pause | JWT | work_orders:execute | WorkOrdersController.pause; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/resume | JWT | work_orders:execute | WorkOrdersController.resume; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/complete | JWT | work_orders:execute | WorkOrdersController.complete; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/escalate | JWT | work_orders:edit | WorkOrdersController.escalate; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/classify | JWT | work_orders:edit | WorkOrdersController.classify; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/assign-executor | JWT | work_orders:assign | WorkOrdersController.assignExecutor; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/submit-handover | JWT | work_orders:execute hoặc work_orders:edit | WorkOrdersController.submitHandover; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/accept-handover | JWT | work_orders:close | WorkOrdersController.acceptHandover; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/reject-handover | JWT | work_orders:close | WorkOrdersController.rejectHandover; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/qa-verify | JWT | work_orders:close | WorkOrdersController.qaVerify; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/qa-reject | JWT | work_orders:close | WorkOrdersController.qaReject; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/verify | JWT | work_orders:close | WorkOrdersController.verify; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/close | JWT | work_orders:close | WorkOrdersController.close; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/cancel | JWT | work_orders:cancel | WorkOrdersController.cancel; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/items | JWT | inventory:out hoặc work_orders:edit | WorkOrdersController.addItem; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:workOrderId/material-returns | JWT | inventory:in | WorkOrdersController.materialReturn; ResourceAccessService và service nghiệp vụ |
| DELETE | /api/v1/work-orders/:id | JWT | work_orders:delete | WorkOrdersController.remove; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:id/sessions/active | JWT | work_orders:view | WorkOrdersController.getActiveSession; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/sessions/start | JWT | work_orders:execute | WorkOrdersController.startSession; ResourceAccessService và service nghiệp vụ |
| POST | /api/v1/work-orders/:id/sessions/stop | JWT | work_orders:execute | WorkOrdersController.stopSession; ResourceAccessService và service nghiệp vụ |
| GET | /api/v1/work-orders/:id/sessions | JWT | work_orders:view | WorkOrdersController.getSessions; ResourceAccessService và service nghiệp vụ |
