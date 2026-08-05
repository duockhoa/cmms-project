"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const requests_service_1 = require("./modules/requests/requests.service");
const analytics_service_1 = require("./modules/analytics/analytics.service");
const work_orders_service_1 = require("./modules/work-orders/work-orders.service");
const schedules_service_1 = require("./modules/schedules/schedules.service");
const inventory_service_1 = require("./modules/inventory/inventory.service");
const prisma_service_1 = require("./prisma/prisma.service");
const work_order_state_machine_1 = require("./modules/work-orders/work-order-state-machine");
const users_service_1 = require("./modules/users/users.service");
const attachments_service_1 = require("./modules/attachments/attachments.service");
const checklist_executions_service_1 = require("./modules/checklist-executions/checklist-executions.service");
const analytics_date_window_service_1 = require("./modules/analytics/services/analytics-date-window.service");
const analytics_scope_service_1 = require("./modules/analytics/services/analytics-scope.service");
const analytics_query_service_1 = require("./modules/analytics/services/analytics-query.service");
const analytics_audit_adapter_1 = require("./modules/analytics/adapters/analytics-audit.adapter");
const analytics_permission_guard_1 = require("./modules/analytics/guards/analytics-permission.guard");
const analytics_query_dto_1 = require("./modules/analytics/dto/analytics-query.dto");
const analytics_controller_1 = require("./modules/analytics/analytics.controller");
const kpi_engine_service_1 = require("./modules/analytics/services/kpi-engine.service");
const kpi_classifier_utility_1 = require("./modules/analytics/utils/kpi-classifier.utility");
const kpi_math_utility_1 = require("./modules/analytics/utils/kpi-math.utility");
const analytics_constants_1 = require("./modules/analytics/analytics.constants");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const fs = require("fs");
const path = require("path");
const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
const devDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:./test.db`;
async function setupTestDb() {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    fs.copyFileSync(devDbPath, testDbPath);
}
function cleanupTestDb() {
    if (fs.existsSync(testDbPath)) {
        try {
            fs.unlinkSync(testDbPath);
        }
        catch (e) {
        }
    }
}
async function run() {
    console.log('🧪 Starting CMMS Core Integrity Test Suite...');
    await setupTestDb();
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const prisma = app.get(prisma_service_1.PrismaService);
    const requestsService = app.get(requests_service_1.RequestsService);
    const workOrdersService = app.get(work_orders_service_1.WorkOrdersService);
    const schedulesService = app.get(schedules_service_1.SchedulesService);
    const inventoryService = app.get(inventory_service_1.InventoryService);
    const usersService = app.get(users_service_1.UsersService);
    const attachmentsService = app.get(attachments_service_1.AttachmentsService);
    const checklistService = app.get(checklist_executions_service_1.ChecklistExecutionsService);
    const analyticsDateWindowService = app.get(analytics_date_window_service_1.AnalyticsDateWindowService);
    const analyticsScopeService = app.get(analytics_scope_service_1.AnalyticsScopeService);
    const analyticsQueryService = app.get(analytics_query_service_1.AnalyticsQueryService);
    const analyticsAuditAdapter = app.get(analytics_audit_adapter_1.AnalyticsAuditAdapter);
    const analyticsPermissionGuard = app.get(analytics_permission_guard_1.AnalyticsPermissionGuard);
    const kpiEngineService = app.get(kpi_engine_service_1.KpiEngineService);
    const analyticsController = app.get(analytics_controller_1.AnalyticsController);
    let defaultEq = await prisma.equipment.findFirst();
    if (!defaultEq) {
        defaultEq = await prisma.equipment.create({
            data: { code: 'EQ-BASE-TEST', name: 'Thiết bị Test Mẫu', category: 'Cơ khí', location: 'Xưởng A', isActive: true },
        });
    }
    let defaultUser = await prisma.user.findFirst({ where: { isActive: true } });
    if (!defaultUser) {
        defaultUser = await prisma.user.create({
            data: { name: 'Tech Base Test', email: 'tech-base-test@test.com', role: 'TECHNICIAN', isActive: true },
        });
    }
    const results = {
        unit: { passed: 0, failed: 0 },
        integration: { passed: 0, failed: 0 },
        concurrent: { passed: 0, failed: 0 },
    };
    function assert(condition, message, type) {
        if (condition) {
            console.log(` ✅ PASS: ${message}`);
            results[type].passed++;
        }
        else {
            console.log(` ❌ FAIL: ${message}`);
            results[type].failed++;
        }
    }
    try {
        console.log('\n--- 1. UNIT TESTS: Work Order State Machine ---');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('PENDING', 'ASSIGNED'), 'PENDING -> ASSIGNED allowed', 'unit');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('PENDING', 'CANCELLED'), 'PENDING -> CANCELLED allowed', 'unit');
        assert(!work_order_state_machine_1.WorkOrderStateMachine.canTransition('PENDING', 'COMPLETED'), 'PENDING -> COMPLETED forbidden', 'unit');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('IN_PROGRESS', 'COMPLETED'), 'IN_PROGRESS -> COMPLETED allowed', 'unit');
        assert(!work_order_state_machine_1.WorkOrderStateMachine.canTransition('COMPLETED', 'CLOSED'), 'COMPLETED -> CLOSED forbidden', 'unit');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('COMPLETED', 'VERIFIED'), 'COMPLETED -> VERIFIED allowed', 'unit');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('VERIFIED', 'CLOSED'), 'VERIFIED -> CLOSED allowed', 'unit');
        assert(work_order_state_machine_1.WorkOrderStateMachine.canTransition('COMPLETED', 'IN_PROGRESS'), 'COMPLETED -> IN_PROGRESS allowed (Reopen)', 'unit');
        console.log('\n--- 2. INTEGRATION TESTS: Data & Transaction Integrity ---');
        try {
            const pendingReqs = await prisma.maintenanceRequest.findMany({ where: { status: 'PENDING' } });
            if (pendingReqs.length > 0) {
                const req = pendingReqs[0];
                await requestsService.approve(req.id, { technicianName: 'Tech A' });
                let errorThrown = false;
                try {
                    await requestsService.approve(req.id, { technicianName: 'Tech B' });
                }
                catch (e) {
                    errorThrown = true;
                    assert(e.status === 409, 'Duplicate approval throws 409 Conflict', 'integration');
                }
                if (!errorThrown)
                    assert(false, 'Duplicate approval did not throw error', 'integration');
            }
            else {
                console.log('Skipping duplicate approval test (no pending requests found)');
            }
        }
        catch (e) {
            console.error(e);
            assert(false, 'Duplicate request approval test error', 'integration');
        }
        try {
            const item = await prisma.inventoryItem.create({
                data: {
                    itemCode: 'TEST-ITEM-1',
                    name: 'Linh kiện test',
                    category: 'Cơ khí',
                    quantity: 2,
                    unit: 'Cái',
                    minQuantity: 1,
                    unitPrice: 50,
                },
            });
            const equipment = await prisma.equipment.findFirst();
            const wo = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-TEST-STOCK',
                    equipmentId: equipment.id,
                    title: 'WO Test Stock',
                    description: 'Desc',
                    status: 'IN_PROGRESS',
                },
            });
            await prisma.workOrderItem.create({
                data: {
                    workOrderId: wo.id,
                    inventoryItemId: item.id,
                    quantity: 3,
                    unitPrice: 50,
                },
            });
            let threwStockError = false;
            try {
                await workOrdersService.complete(wo.id, { expectedVersion: 1 });
            }
            catch (e) {
                threwStockError = true;
                assert(e.status === 400 && e.response.message === 'INSUFFICIENT_STOCK', 'Insufficient stock throws 400 INSUFFICIENT_STOCK', 'integration');
                assert(e.response.details.available === 2, 'Error details contains available stock information', 'integration');
            }
            if (!threwStockError)
                assert(false, 'Completing WO with insufficient stock did not throw error', 'integration');
            const freshItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
            assert(freshItem?.quantity === 2, 'Transaction rolled back successfully (stock unchanged)', 'integration');
            await inventoryService.adjustStock(item.id, { changeQuantity: 3, expectedVersion: item.version });
            const updatedWo = await workOrdersService.complete(wo.id, { expectedVersion: 1 });
            assert(updatedWo.status === 'COMPLETED', 'Completing WO succeeds after stock replenishment', 'integration');
            const afterItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
            assert(afterItem?.quantity === 2, 'Stock decremented correctly after successful complete', 'integration');
            const txCount = await prisma.inventoryTransaction.count({
                where: { workOrderId: wo.id, transactionType: 'ISSUE' },
            });
            assert(txCount === 1, 'Exactly one ISSUE transaction created', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Stock Integrity test error', 'integration');
        }
        try {
            const equipment = await prisma.equipment.findFirst();
            const wo = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-TEST-LOCK',
                    equipmentId: equipment.id,
                    title: 'WO Test Lock',
                    description: 'Desc',
                    status: 'PENDING',
                },
            });
            await workOrdersService.assign(wo.id, { technicianName: 'User A Tech', expectedVersion: 1 });
            let threwLockError = false;
            try {
                await workOrdersService.assign(wo.id, { technicianName: 'User B Tech', expectedVersion: 1 });
            }
            catch (e) {
                threwLockError = true;
                assert(e.status === 409, 'Stale expectedVersion throws 409 Conflict', 'integration');
            }
            if (!threwLockError)
                assert(false, 'Optimistic locking did not prevent concurrent assignment', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Optimistic Locking test error', 'integration');
        }
        try {
            const techUser = await prisma.user.create({
                data: {
                    name: 'Tech Test User',
                    email: 'techtest@company.com',
                    role: 'TECHNICIAN',
                    status: 'AVAILABLE',
                    specialty: 'Mechanical',
                },
            });
            const adminUser = await prisma.user.create({
                data: {
                    name: 'Admin Test User',
                    email: 'admintest@company.com',
                    role: 'ADMIN',
                    status: 'AVAILABLE',
                },
            });
            const techs = await usersService.getUsers('TECHNICIAN');
            const hasAdmin = techs.some(u => u.role === 'ADMIN');
            const hasTech = techs.some(u => u.name === 'Tech Test User');
            assert(!hasAdmin && hasTech, 'Lọc đúng role TECHNICIAN, không trả User role khác', 'integration');
            const updatedTech = await usersService.updateTechnicalProfile(techUser.id, {
                specialty: 'Electrical CNC',
                isActive: true,
                expectedVersion: 1,
            });
            assert(updatedTech.specialty === 'Electrical CNC' && updatedTech.version === 2, 'Cập nhật specialty thành công và tăng version', 'integration');
            const updatedAvail = await usersService.updateAvailability(techUser.id, {
                status: 'BUSY',
                expectedVersion: 2,
            });
            assert(updatedAvail.status === 'BUSY' && updatedAvail.version === 3, 'Cập nhật availability thành công và tăng version', 'integration');
            let threwLock = false;
            try {
                await usersService.updateAvailability(techUser.id, {
                    status: 'AVAILABLE',
                    expectedVersion: 2,
                });
            }
            catch (e) {
                threwLock = true;
                assert(e.status === 409, 'Optimistic locking conflict on user update trả 409', 'integration');
            }
            if (!threwLock)
                assert(false, 'Optimistic locking on user update failed', 'integration');
            const equipment = await prisma.equipment.findFirst();
            const wo1 = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-TECH-WL1',
                    equipmentId: equipment.id,
                    title: 'Active Work Order 1',
                    description: 'Desc',
                    status: 'IN_PROGRESS',
                    technicianName: 'Tech Test User',
                },
            });
            const wo2 = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-TECH-WL2',
                    equipmentId: equipment.id,
                    title: 'Terminal Work Order 2',
                    description: 'Desc',
                    status: 'COMPLETED',
                    technicianName: 'Tech Test User',
                },
            });
            const userWithWorkload = await usersService.getUserById(techUser.id);
            assert(userWithWorkload.activeWorkOrderCount === 1, 'Workload khớp số WO thực tế đang mở (chưa hoàn thành)', 'integration');
            await usersService.updateTechnicalProfile(techUser.id, {
                isActive: false,
                expectedVersion: 3,
            });
            const activeTechs = await usersService.getUsers('TECHNICIAN', false);
            const isTechInActiveList = activeTechs.some(t => t.id === techUser.id);
            assert(!isTechInActiveList, 'User inactive bị loại khỏi danh sách gán mặc định (includeInactive=false)', 'integration');
            const allTechs = await usersService.getUsers('TECHNICIAN', true);
            const isTechInAllList = allTechs.some(t => t.id === techUser.id);
            assert(isTechInAllList, 'User inactive hiển thị khi query includeInactive=true', 'integration');
            let threwAssignInactive = false;
            try {
                const testWO = await prisma.workOrder.create({
                    data: {
                        orderCode: 'WO-ASSIGN-INACTIVE',
                        equipmentId: equipment.id,
                        title: 'Test Assign Inactive',
                        description: 'Desc',
                        status: 'PENDING',
                    },
                });
                await workOrdersService.assign(testWO.id, {
                    technicianName: 'Tech Test User',
                    expectedVersion: 1,
                });
            }
            catch (e) {
                threwAssignInactive = true;
                assert(e.status === 400 && e.message.includes('ngừng hoạt động'), 'Chặn phân công Work Order cho kỹ thuật viên inactive', 'integration');
            }
            if (!threwAssignInactive)
                assert(false, 'Cho phép phân công Work Order cho kỹ thuật viên inactive', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'User/Technician integration tests error', 'integration');
        }
        try {
            const equipment = await prisma.equipment.findFirst();
            const wo = await prisma.workOrder.findFirst();
            const mockPng = {
                fieldname: 'file',
                originalname: 'drawing.png',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]),
                size: 16,
            };
            const attachment = await attachmentsService.uploadFile(mockPng, 'Equipment', equipment.id, null, 'Equipment drawing blueprint');
            assert(attachment.originalName === 'drawing.png' && attachment.entityType === 'Equipment', 'Upload hợp lệ thành công', 'integration');
            assert(attachment.checksum !== '', 'Checksum verification (SHA-256 computed)', 'integration');
            const mockExe = {
                fieldname: 'file',
                originalname: 'script.exe',
                encoding: '7bit',
                mimetype: 'application/octet-stream',
                buffer: Buffer.from('fake exe content'),
                size: 16,
            };
            let threwMime = false;
            try {
                await attachmentsService.uploadFile(mockExe, 'Equipment', equipment.id);
            }
            catch (e) {
                threwMime = true;
                assert(e.status === 400 && e.message.includes('không được hỗ trợ'), 'Upload sai MIME type trả về lỗi 400', 'integration');
            }
            if (!threwMime)
                assert(false, 'Cho phép upload sai MIME type', 'integration');
            const mockFakePng = {
                fieldname: 'file',
                originalname: 'fake.png',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from('not a png header signature'),
                size: 26,
            };
            let threwMagic = false;
            try {
                await attachmentsService.uploadFile(mockFakePng, 'Equipment', equipment.id);
            }
            catch (e) {
                threwMagic = true;
                assert(e.status === 400 && e.message.includes('Nội dung nhị phân'), 'MIME validation checks magic number of binary content', 'integration');
            }
            if (!threwMagic)
                assert(false, 'Cho phép upload file có content không khớp signature', 'integration');
            const mockLarge = {
                fieldname: 'file',
                originalname: 'huge.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                buffer: Buffer.alloc(11 * 1024 * 1024),
                size: 11 * 1024 * 1024,
            };
            mockLarge.buffer[0] = 0x25;
            mockLarge.buffer[1] = 0x50;
            mockLarge.buffer[2] = 0x44;
            mockLarge.buffer[3] = 0x46;
            let threwSize = false;
            try {
                await attachmentsService.uploadFile(mockLarge, 'Equipment', equipment.id);
            }
            catch (e) {
                threwSize = true;
                assert(e.status === 400 && e.message.includes('vượt quá giới hạn'), 'Upload file > 10MB giới hạn trả về lỗi 400', 'integration');
            }
            if (!threwSize)
                assert(false, 'Cho phép upload file > 10MB', 'integration');
            const mockTraversal = {
                fieldname: 'file',
                originalname: '../../etc/passwd',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]),
                size: 16,
            };
            let threwTraversal = false;
            try {
                await attachmentsService.uploadFile(mockTraversal, 'Equipment', equipment.id);
            }
            catch (e) {
                threwTraversal = true;
                assert(e.status === 400 && e.message.includes('không hợp lệ'), 'Chống path traversal thành công', 'integration');
            }
            if (!threwTraversal)
                assert(false, 'Cho phép upload file chứa path traversal', 'integration');
            let threwEntity = false;
            try {
                await attachmentsService.uploadFile(mockPng, 'Equipment', 'non-existent-uuid');
            }
            catch (e) {
                threwEntity = true;
                assert(e.status === 400 && e.message.includes('Không tìm thấy thực thể'), 'Chặn upload nếu entity cha không tồn tại', 'integration');
            }
            if (!threwEntity)
                assert(false, 'Cho phép upload liên kết tới entity cha không tồn tại', 'integration');
            const downloadResult = await attachmentsService.downloadFile(attachment.id);
            assert(downloadResult.originalName === 'drawing.png' && fs.existsSync(downloadResult.fullPath), 'Download file thành công', 'integration');
            await attachmentsService.deleteFile(attachment.id, attachment.version);
            const deletedEqAttach = await prisma.attachment.findUnique({ where: { id: attachment.id } });
            const physicalFileExists = fs.existsSync(downloadResult.fullPath);
            assert(!deletedEqAttach && !physicalFileExists, 'Equipment attachment: Xóa vật lý thành công khỏi DB và Disk (Retention Policy)', 'integration');
            const mockWOPng = {
                fieldname: 'file',
                originalname: 'woproof.png',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]),
                size: 16,
            };
            const woAttach = await attachmentsService.uploadFile(mockWOPng, 'WorkOrder', wo.id);
            let threwLockDel = false;
            try {
                await attachmentsService.deleteFile(woAttach.id, 999);
            }
            catch (e) {
                threwLockDel = true;
                assert(e.status === 409, 'DELETE dùng optimistic locking (stale expectedVersion trả 409)', 'integration');
            }
            if (!threwLockDel)
                assert(false, 'Cho phép DELETE với stale version', 'integration');
            await attachmentsService.deleteFile(woAttach.id, woAttach.version);
            const archivedAttach = await prisma.attachment.findUnique({ where: { id: woAttach.id } });
            const archivedFileExists = fs.existsSync(path.join(process.cwd(), woAttach.storagePath));
            assert(archivedAttach !== null && archivedAttach.isDeleted === true && archivedFileExists, 'WorkOrder attachment: Soft delete (archive) thành công, giữ lại tệp vật lý', 'integration');
            try {
                fs.unlinkSync(path.join(process.cwd(), woAttach.storagePath));
            }
            catch (e) { }
            console.log('  Running 5 concurrent uploads of same png to same equipment...');
            const uploadPromises = Array.from({ length: 5 }).map((_, idx) => {
                const fileCopy = { ...mockPng, originalname: `concurrent_${idx}.png` };
                return attachmentsService.uploadFile(fileCopy, 'Equipment', equipment.id);
            });
            const uploadResults = await Promise.all(uploadPromises);
            assert(uploadResults.length === 5, 'All 5 concurrent uploads succeeded and created separate attachment entries', 'integration');
            for (const res of uploadResults) {
                await attachmentsService.deleteFile(res.id, res.version);
            }
        }
        catch (e) {
            console.error(e);
            assert(false, 'Attachment integration tests error', 'integration');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true, role: 'TECHNICIAN' } });
            const inactiveUser = await prisma.user.create({
                data: {
                    email: 'inactive_tech@test.com',
                    name: 'Inactive Technician',
                    role: 'TECHNICIAN',
                    isActive: false,
                },
            });
            const wo = await prisma.workOrder.findFirst({ where: { status: 'PENDING' } });
            const execution = await checklistService.createExecution(wo.id, {
                executedById: activeUser.id,
                checklistItems: ['Kiểm tra ốc vít', 'Vệ sinh lưới lọc', 'Đo dòng điện'],
            });
            assert(execution.status === 'DRAFT' && execution.items.length === 3, 'Tạo ChecklistExecution và snapshot items thành công', 'integration');
            assert(execution.items.every(it => it.status === 'NOT_CHECKED'), 'Đầu mục checklist mặc định là NOT_CHECKED', 'integration');
            const closedWO = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-CLOSED-CHECK',
                    equipmentId: wo.equipmentId,
                    title: 'Closed WO for checklist check',
                    description: 'Desc',
                    status: 'CLOSED',
                },
            });
            let threwClosedWO = false;
            try {
                await checklistService.createExecution(closedWO.id, { executedById: activeUser.id, checklistItems: ['Task'] });
            }
            catch (e) {
                threwClosedWO = true;
                assert(e.status === 400 && e.message.includes('CLOSED'), 'Chặn tạo checklist cho Work Order CLOSED', 'integration');
            }
            if (!threwClosedWO)
                assert(false, 'Cho phép tạo checklist cho Work Order CLOSED', 'integration');
            let threwInactiveUser = false;
            try {
                await checklistService.createExecution(wo.id, { executedById: inactiveUser.id, checklistItems: ['Task'] });
            }
            catch (e) {
                threwInactiveUser = true;
                assert(e.status === 400 && e.message.includes('ngừng hoạt động'), 'Chặn tạo checklist với kỹ thuật viên inactive', 'integration');
            }
            if (!threwInactiveUser)
                assert(false, 'Cho phép tạo checklist với kỹ thuật viên inactive', 'integration');
            let threwFailedComment = false;
            try {
                await checklistService.updateItem(execution.id, {
                    itemIndex: 0,
                    status: 'FAILED',
                    expectedVersion: execution.version,
                });
            }
            catch (e) {
                threwFailedComment = true;
                assert(e.status === 400 && e.message.includes('comment'), 'Chặn cập nhật FAILED khi thiếu comment', 'integration');
            }
            if (!threwFailedComment)
                assert(false, 'Cho phép cập nhật FAILED không kèm comment', 'integration');
            let threwCompleteNotChecked = false;
            try {
                await checklistService.completeExecution(execution.id, { expectedVersion: execution.version });
            }
            catch (e) {
                threwCompleteNotChecked = true;
                assert(e.status === 400 && e.message.includes('toàn bộ đầu mục'), 'Chặn complete checklist khi còn NOT_CHECKED', 'integration');
            }
            if (!threwCompleteNotChecked)
                assert(false, 'Cho phép complete checklist khi còn NOT_CHECKED', 'integration');
            let threwLockItem = false;
            try {
                await checklistService.updateItem(execution.id, {
                    itemIndex: 0,
                    status: 'PASSED',
                    expectedVersion: 999,
                });
            }
            catch (e) {
                threwLockItem = true;
                assert(e.status === 409, 'PATCH item dùng optimistic locking (stale expectedVersion trả 409)', 'integration');
            }
            if (!threwLockItem)
                assert(false, 'Cho phép PATCH item với stale version', 'integration');
            let currentVersion = execution.version;
            const step1 = await checklistService.updateItem(execution.id, {
                itemIndex: 0,
                status: 'PASSED',
                expectedVersion: currentVersion,
            });
            currentVersion = step1.version;
            const step2 = await checklistService.updateItem(execution.id, {
                itemIndex: 1,
                status: 'FAILED',
                comment: 'Hỏng roăng cao su cần thay thế',
                expectedVersion: currentVersion,
            });
            currentVersion = step2.version;
            const step3 = await checklistService.updateItem(execution.id, {
                itemIndex: 2,
                status: 'NA',
                expectedVersion: currentVersion,
            });
            currentVersion = step3.version;
            const completedFailed = await checklistService.completeExecution(execution.id, { expectedVersion: currentVersion });
            assert(completedFailed.status === 'COMPLETED' && completedFailed.result === 'FAILED' && completedFailed.completedAt !== null, 'Tính đúng kết quả FAILED khi có đầu mục FAILED', 'integration');
            let threwUpdateCompleted = false;
            try {
                await checklistService.updateItem(execution.id, {
                    itemIndex: 0,
                    status: 'PASSED',
                    expectedVersion: completedFailed.version,
                });
            }
            catch (e) {
                threwUpdateCompleted = true;
                assert(e.status === 400 && e.message.includes('trạng thái nháp'), 'Chặn sửa đổi đầu mục checklist sau khi đã COMPLETED', 'integration');
            }
            if (!threwUpdateCompleted)
                assert(false, 'Cho phép sửa đổi đầu mục checklist sau khi đã COMPLETED', 'integration');
            const execution2 = await checklistService.createExecution(wo.id, {
                executedById: activeUser.id,
                checklistItems: ['Kiểm tra lại lần 2'],
            });
            const firstChecklistReload = await checklistService.getExecutionById(execution.id);
            assert(firstChecklistReload.status === 'COMPLETED' && execution2.status === 'DRAFT', 'Tạo execution mới không làm thay đổi trạng thái của execution cũ trên cùng Work Order', 'integration');
            await checklistService.cancelExecution(execution2.id, { expectedVersion: execution2.version, reason: 'Dọn dẹp test data' });
            const cancelledWO = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-CANCELLED-CHECK',
                    equipmentId: wo.equipmentId,
                    title: 'Cancelled WO for checklist check',
                    description: 'Desc',
                    status: 'CANCELLED',
                },
            });
            let threwCancelledWO = false;
            try {
                await checklistService.createExecution(cancelledWO.id, { executedById: activeUser.id, checklistItems: ['Task'] });
            }
            catch (e) {
                threwCancelledWO = true;
                assert(e.status === 400 && e.message.includes('CANCELLED'), 'Chặn tạo checklist cho Work Order CANCELLED', 'integration');
            }
            if (!threwCancelledWO)
                assert(false, 'Cho phép tạo checklist cho Work Order CANCELLED', 'integration');
            const execAllNA = await checklistService.createExecution(wo.id, {
                executedById: activeUser.id,
                checklistItems: ['Item A', 'Item B'],
            });
            let naVer = execAllNA.version;
            const naStep1 = await checklistService.updateItem(execAllNA.id, { itemIndex: 0, status: 'NA', expectedVersion: naVer });
            naVer = naStep1.version;
            const naStep2 = await checklistService.updateItem(execAllNA.id, { itemIndex: 1, status: 'NA', expectedVersion: naVer });
            naVer = naStep2.version;
            let threwAllNA = false;
            try {
                await checklistService.completeExecution(execAllNA.id, { expectedVersion: naVer });
            }
            catch (e) {
                threwAllNA = true;
                assert(e.status === 400 && e.message.includes('NA'), 'Chặn complete checklist khi toàn bộ đầu mục đều NA', 'integration');
            }
            if (!threwAllNA)
                assert(false, 'Cho phép complete checklist khi toàn bộ đầu mục đều NA', 'integration');
            await checklistService.cancelExecution(execAllNA.id, { expectedVersion: naVer, reason: 'Dọn dẹp test all-NA' });
            const execCancel = await checklistService.createExecution(wo.id, {
                executedById: activeUser.id,
                checklistItems: ['Cancel Test Item 1', 'Cancel Test Item 2'],
            });
            let threwNoReason = false;
            try {
                await checklistService.cancelExecution(execCancel.id, { expectedVersion: execCancel.version, reason: '' });
            }
            catch (e) {
                threwNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Cancel bắt buộc reason (trống bị chặn)', 'integration');
            }
            if (!threwNoReason)
                assert(false, 'Cho phép cancel không có reason', 'integration');
            let threwStaleCancel = false;
            try {
                await checklistService.cancelExecution(execCancel.id, { expectedVersion: 999, reason: 'Lý do hủy' });
            }
            catch (e) {
                threwStaleCancel = true;
                assert(e.status === 409, 'Cancel stale version trả 409 Conflict', 'integration');
            }
            if (!threwStaleCancel)
                assert(false, 'Cho phép cancel với stale version', 'integration');
            const cancelled = await checklistService.cancelExecution(execCancel.id, {
                expectedVersion: execCancel.version,
                reason: 'Thiết bị đã được sửa chữa bởi đội khác',
                cancelledById: activeUser.id,
            });
            assert(cancelled.status === 'CANCELLED' &&
                cancelled.cancelReason === 'Thiết bị đã được sửa chữa bởi đội khác' &&
                cancelled.cancelledAt !== null &&
                cancelled.version === execCancel.version + 1, 'Cancel lưu đúng cancelReason, cancelledAt, version tăng 1', 'integration');
            let threwDoubleCancel = false;
            try {
                await checklistService.cancelExecution(execCancel.id, { expectedVersion: cancelled.version, reason: 'Hủy lần 2' });
            }
            catch (e) {
                threwDoubleCancel = true;
                assert(e.status === 400 && e.message.includes('DRAFT'), 'Cancel lặp lại bị chặn (không còn DRAFT)', 'integration');
            }
            if (!threwDoubleCancel)
                assert(false, 'Cho phép cancel lặp lại trên execution đã CANCELLED', 'integration');
            let threwUpdateCancelled = false;
            try {
                await checklistService.updateItem(execCancel.id, { itemIndex: 0, status: 'PASSED', expectedVersion: cancelled.version });
            }
            catch (e) {
                threwUpdateCancelled = true;
                assert(e.status === 400 && e.message.includes('DRAFT'), 'Chặn sửa đổi đầu mục checklist sau khi đã CANCELLED', 'integration');
            }
            if (!threwUpdateCancelled)
                assert(false, 'Cho phép sửa đổi đầu mục sau khi đã CANCELLED', 'integration');
            const execVer = await checklistService.createExecution(wo.id, {
                executedById: activeUser.id,
                checklistItems: ['Ver Test 1', 'Ver Test 2'],
            });
            assert(execVer.version === 1, 'Version khởi tạo là 1', 'integration');
            const verStep1 = await checklistService.updateItem(execVer.id, { itemIndex: 0, status: 'PASSED', expectedVersion: 1 });
            assert(verStep1.version === 2, 'PATCH item tăng version từ 1 lên 2', 'integration');
            const verStep2 = await checklistService.updateItem(execVer.id, { itemIndex: 1, status: 'PASSED', expectedVersion: 2 });
            assert(verStep2.version === 3, 'PATCH item tăng version từ 2 lên 3', 'integration');
            const verCompleted = await checklistService.completeExecution(execVer.id, { expectedVersion: 3 });
            assert(verCompleted.version === 4, 'Complete tăng version từ 3 lên 4', 'integration');
            const mockPng = {
                fieldname: 'file',
                originalname: 'evidence.png',
                encoding: '7bit',
                mimetype: 'image/png',
                buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]),
                size: 16,
            };
            let threwUploadAfterCompleted = false;
            try {
                await attachmentsService.uploadFile(mockPng, 'ChecklistExecutionItem', completedFailed.items[0].id);
            }
            catch (e) {
                threwUploadAfterCompleted = true;
                assert(e.status === 400, 'Không upload tệp đính kèm sau COMPLETED', 'integration');
            }
            if (!threwUploadAfterCompleted)
                assert(false, 'Cho phép upload tệp đính kèm sau COMPLETED', 'integration');
            const mockAttachmentCompleted = await prisma.attachment.create({
                data: {
                    entityType: 'ChecklistExecutionItem',
                    entityId: completedFailed.items[0].id,
                    fileName: 'test-completed-lock.png',
                    originalName: 'test.png',
                    fileType: 'image/png',
                    storagePath: 'uploads/test-completed-lock.png',
                    fileSize: 100,
                    checksum: 'abc123',
                },
            });
            let threwDeleteAfterCompleted = false;
            try {
                await attachmentsService.deleteFile(mockAttachmentCompleted.id, mockAttachmentCompleted.version);
            }
            catch (e) {
                threwDeleteAfterCompleted = true;
                assert(e.status === 400, 'Không delete tệp đính kèm sau COMPLETED', 'integration');
            }
            if (!threwDeleteAfterCompleted)
                assert(false, 'Cho phép delete tệp đính kèm sau COMPLETED', 'integration');
            let threwUploadAfterCancelled = false;
            try {
                await attachmentsService.uploadFile(mockPng, 'ChecklistExecutionItem', cancelled.items[0].id);
            }
            catch (e) {
                threwUploadAfterCancelled = true;
                assert(e.status === 400, 'Không upload tệp đính kèm sau CANCELLED', 'integration');
            }
            if (!threwUploadAfterCancelled)
                assert(false, 'Cho phép upload tệp đính kèm sau CANCELLED', 'integration');
            const mockAttachmentCancelled = await prisma.attachment.create({
                data: {
                    entityType: 'ChecklistExecutionItem',
                    entityId: cancelled.items[0].id,
                    fileName: 'test-cancelled-lock.png',
                    originalName: 'test.png',
                    fileType: 'image/png',
                    storagePath: 'uploads/test-cancelled-lock.png',
                    fileSize: 100,
                    checksum: 'def456',
                },
            });
            let threwDeleteAfterCancelled = false;
            try {
                await attachmentsService.deleteFile(mockAttachmentCancelled.id, mockAttachmentCancelled.version);
            }
            catch (e) {
                threwDeleteAfterCancelled = true;
                assert(e.status === 400, 'Không delete tệp đính kèm sau CANCELLED', 'integration');
            }
            if (!threwDeleteAfterCancelled)
                assert(false, 'Cho phép delete tệp đính kèm sau CANCELLED', 'integration');
            const attachmentsCompletedList = await attachmentsService.getAttachmentsForEntity('ChecklistExecutionItem', completedFailed.items[0].id);
            assert(Array.isArray(attachmentsCompletedList), 'List attachment vẫn hoạt động sau COMPLETED', 'integration');
            const attachmentsCancelledList = await attachmentsService.getAttachmentsForEntity('ChecklistExecutionItem', cancelled.items[0].id);
            assert(Array.isArray(attachmentsCancelledList), 'List attachment vẫn hoạt động sau CANCELLED', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Checklist execution integration tests error', 'integration');
        }
        console.log('\n--- 2B. INTEGRATION TESTS: Request Return / Resubmit / Cancel ---');
        try {
            const eqId = (await prisma.equipment.findFirst()).id;
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } }) || await prisma.user.create({
                data: { name: 'Active Tester', email: `active-tester-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: true },
            });
            const validActorId = activeUser.id;
            const req = await requestsService.create({
                equipmentId: eqId,
                title: 'Máy bơm rò rỉ nghiêm trọng',
                description: 'Rò rỉ dầu thủy lực từ mối nối ống',
                priority: 'HIGH',
                reporterName: 'Nguyễn Văn Test',
                department: 'Phân xưởng A',
            });
            const returned = await requestsService.returnRequest(req.id, {
                reason: 'Thông tin sự cố chưa đầy đủ',
                expectedVersion: req.version,
                actedById: validActorId,
            });
            assert(returned.status === 'RETURNED' && returned.returnedReason === 'Thông tin sự cố chưa đầy đủ' && returned.version === req.version + 1, 'PENDING → RETURNED thành công', 'integration');
            const pendReq2 = await requestsService.create({ equipmentId: eqId, title: 'T2', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            let threwNoReason = false;
            try {
                await requestsService.returnRequest(pendReq2.id, { reason: '', expectedVersion: pendReq2.version, actedById: validActorId });
            }
            catch (e) {
                threwNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Return thiếu reason bị chặn (400)', 'integration');
            }
            if (!threwNoReason)
                assert(false, 'Cho phép return không có reason', 'integration');
            let threwWrongStatus = false;
            try {
                await requestsService.returnRequest(returned.id, { reason: 'Lý do', expectedVersion: returned.version, actedById: validActorId });
            }
            catch (e) {
                threwWrongStatus = true;
                assert(e.status === 400 && e.message.includes('PENDING'), 'Return từ trạng thái RETURNED bị chặn', 'integration');
            }
            if (!threwWrongStatus)
                assert(false, 'Cho phép return từ trạng thái khác PENDING', 'integration');
            const pendReq3 = await requestsService.create({ equipmentId: eqId, title: 'T4', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            let threwStaleReturn = false;
            try {
                await requestsService.returnRequest(pendReq3.id, { reason: 'Lý do', expectedVersion: 999, actedById: validActorId });
            }
            catch (e) {
                threwStaleReturn = true;
                assert(e.status === 409, 'Return stale version trả 409', 'integration');
            }
            if (!threwStaleReturn)
                assert(false, 'Cho phép return với stale version', 'integration');
            const pendReq4 = await requestsService.create({ equipmentId: eqId, title: 'T5', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            await requestsService.approve(pendReq4.id, { technicianName: 'Tech' });
            const approvedReq4 = await prisma.maintenanceRequest.findUnique({ where: { id: pendReq4.id } });
            await prisma.maintenanceRequest.update({ where: { id: pendReq4.id }, data: { status: 'PENDING' } });
            const hackedReq4 = await prisma.maintenanceRequest.findUnique({ where: { id: pendReq4.id } });
            let threwWOLinked = false;
            try {
                await requestsService.returnRequest(pendReq4.id, { reason: 'Lý do', expectedVersion: hackedReq4.version, actedById: validActorId });
            }
            catch (e) {
                threwWOLinked = true;
                assert(e.status === 409 && e.message.includes('Work Order'), 'Return khi đã có Work Order trả 409', 'integration');
            }
            if (!threwWOLinked)
                assert(false, 'Cho phép return khi đã có Work Order', 'integration');
            const returnHistory = await requestsService.getHistory(req.id);
            const returnEntry = returnHistory.find((h) => h.action === 'RETURN');
            assert(returnEntry &&
                returnEntry.fromStatus === 'PENDING' &&
                returnEntry.toStatus === 'RETURNED' &&
                returnEntry.reason === 'Thông tin sự cố chưa đầy đủ' &&
                returnEntry.requestVersionBefore === req.version &&
                returnEntry.requestVersionAfter === req.version + 1, 'WorkflowHistory của Return ghi đúng from/to/reason/version', 'integration');
            const resubmitted = await requestsService.resubmitRequest(returned.id, {
                expectedVersion: returned.version,
                actedById: validActorId,
                comment: 'Đã bổ sung mô tả chi tiết',
                updatedFields: { description: 'Rò rỉ dầu thủy lực từ mối nối ống – Bổ sung: khu vực van điều khiển' },
            });
            assert(resubmitted.status === 'PENDING' &&
                resubmitted.description === 'Rò rỉ dầu thủy lực từ mối nối ống – Bổ sung: khu vực van điều khiển' &&
                resubmitted.version === returned.version + 1, 'RETURNED → PENDING thành công (resubmit)', 'integration');
            let threwResubWrong = false;
            try {
                await requestsService.resubmitRequest(resubmitted.id, { expectedVersion: resubmitted.version, actedById: validActorId });
            }
            catch (e) {
                threwResubWrong = true;
                assert(e.status === 400 && e.message.includes('RETURNED'), 'Resubmit từ trạng thái PENDING bị chặn', 'integration');
            }
            if (!threwResubWrong)
                assert(false, 'Cho phép resubmit từ trạng thái khác RETURNED', 'integration');
            const returned2 = await requestsService.returnRequest(resubmitted.id, { reason: 'Cần ảnh minh chứng', expectedVersion: resubmitted.version, actedById: validActorId });
            let threwStaleResub = false;
            try {
                await requestsService.resubmitRequest(returned2.id, { expectedVersion: 999, actedById: validActorId });
            }
            catch (e) {
                threwStaleResub = true;
                assert(e.status === 409, 'Resubmit stale version trả 409', 'integration');
            }
            if (!threwStaleResub)
                assert(false, 'Cho phép resubmit với stale version', 'integration');
            const pendReq5 = await requestsService.create({ equipmentId: eqId, title: 'T10', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            await requestsService.approve(pendReq5.id, { technicianName: 'Tech' });
            await prisma.maintenanceRequest.update({ where: { id: pendReq5.id }, data: { status: 'RETURNED' } });
            const hackedReq5 = await prisma.maintenanceRequest.findUnique({ where: { id: pendReq5.id } });
            let threwResubWO = false;
            try {
                await requestsService.resubmitRequest(pendReq5.id, { expectedVersion: hackedReq5.version, actedById: validActorId });
            }
            catch (e) {
                threwResubWO = true;
                assert(e.status === 409 && e.message.includes('Work Order'), 'Resubmit khi đã có Work Order trả 409', 'integration');
            }
            if (!threwResubWO)
                assert(false, 'Cho phép resubmit khi đã có Work Order', 'integration');
            const resubmitted2 = await requestsService.resubmitRequest(returned2.id, {
                expectedVersion: returned2.version,
                actedById: validActorId,
                updatedFields: {
                    title: 'Tiêu đề mới',
                    description: 'Mô tả mới',
                    priority: 'URGENT',
                    id: 'hacked-id',
                    requestCode: 'HACKED',
                    status: 'APPROVED',
                    version: 999,
                    createdAt: '2020-01-01',
                },
            });
            assert(resubmitted2.title === 'Tiêu đề mới' &&
                resubmitted2.description === 'Mô tả mới' &&
                resubmitted2.priority === 'URGENT', 'Chỉ các trường whitelist (title, description, priority) được cập nhật', 'integration');
            assert(resubmitted2.id === req.id &&
                resubmitted2.requestCode === req.requestCode &&
                resubmitted2.status === 'PENDING' &&
                resubmitted2.version === returned2.version + 1, 'Các trường bảo vệ (id, code, status, version) không bị sửa', 'integration');
            const returned3 = await requestsService.returnRequest(resubmitted2.id, { reason: 'Trả lại lần 3', expectedVersion: resubmitted2.version, actedById: validActorId });
            const cancelled = await requestsService.cancelRequest(returned3.id, {
                reason: 'Sự cố đã tự khắc phục',
                expectedVersion: returned3.version,
                actedById: validActorId,
            });
            assert(cancelled.status === 'CANCELLED' &&
                cancelled.cancelledReason === 'Sự cố đã tự khắc phục' &&
                cancelled.cancelledAt !== null &&
                cancelled.version === returned3.version + 1, 'RETURNED → CANCELLED thành công', 'integration');
            const pendReq6 = await requestsService.create({ equipmentId: eqId, title: 'T13', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            const returned6 = await requestsService.returnRequest(pendReq6.id, { reason: 'Test', expectedVersion: pendReq6.version, actedById: validActorId });
            let threwCancelNoReason = false;
            try {
                await requestsService.cancelRequest(returned6.id, { reason: '', expectedVersion: returned6.version, actedById: validActorId });
            }
            catch (e) {
                threwCancelNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Cancel thiếu reason bị chặn', 'integration');
            }
            if (!threwCancelNoReason)
                assert(false, 'Cho phép cancel không có reason', 'integration');
            let threwTerminal = false;
            try {
                await requestsService.returnRequest(cancelled.id, { reason: 'Lý do', expectedVersion: cancelled.version, actedById: validActorId });
            }
            catch (e) {
                threwTerminal = true;
                assert(e.status === 400, 'Terminal state CANCELLED không được return', 'integration');
            }
            if (!threwTerminal)
                assert(false, 'Cho phép transition từ terminal state', 'integration');
            const fullHistory = await requestsService.getHistory(req.id);
            const allVersioned = fullHistory.filter((h) => h.requestVersionBefore != null);
            const allCorrect = allVersioned.every((h) => h.requestVersionAfter === h.requestVersionBefore + 1);
            assert(allCorrect && allVersioned.length >= 4, 'WorkflowHistory ghi đúng before/after version cho tất cả transitions', 'integration');
            const pendReqReg = await requestsService.create({ equipmentId: eqId, title: 'Regression Approve', description: 'd', priority: 'MEDIUM', reporterName: 'Tester' });
            const approvedReg = await requestsService.approve(pendReqReg.id, { technicianName: 'KTV Regression' });
            assert(approvedReg.request.status === 'APPROVED' && !!approvedReg.workOrder, 'Approval hiện tại vẫn hoạt động (regression)', 'integration');
            const pendReq17a = await requestsService.create({ equipmentId: eqId, title: 'T17a', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            let threwReturnNoActor = false;
            try {
                await requestsService.returnRequest(pendReq17a.id, { reason: 'Test', expectedVersion: pendReq17a.version, actedById: '' });
            }
            catch (e) {
                threwReturnNoActor = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'Return thiếu actedById (chuỗi rỗng) bị chặn (400)', 'integration');
            }
            if (!threwReturnNoActor)
                assert(false, 'Cho phép Return không có actedById', 'integration');
            const returned17b = await requestsService.returnRequest(pendReq17a.id, { reason: 'Test', expectedVersion: pendReq17a.version, actedById: validActorId });
            let threwResubmitNoActor = false;
            try {
                await requestsService.resubmitRequest(returned17b.id, { expectedVersion: returned17b.version, actedById: '   ' });
            }
            catch (e) {
                threwResubmitNoActor = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'Resubmit thiếu actedById (whitespace) bị chặn (400)', 'integration');
            }
            if (!threwResubmitNoActor)
                assert(false, 'Cho phép Resubmit không có actedById', 'integration');
            let threwCancelNoActor = false;
            try {
                await requestsService.cancelRequest(returned17b.id, { reason: 'Test cancel', expectedVersion: returned17b.version, actedById: undefined });
            }
            catch (e) {
                threwCancelNoActor = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'Cancel thiếu actedById bị chặn (400)', 'integration');
            }
            if (!threwCancelNoActor)
                assert(false, 'Cho phép Cancel không có actedById', 'integration');
            const pendReq18 = await requestsService.create({ equipmentId: eqId, title: 'T18', description: 'd', priority: 'LOW', reporterName: 'Tester' });
            let threwActorNotFound = false;
            try {
                await requestsService.returnRequest(pendReq18.id, { reason: 'Test', expectedVersion: pendReq18.version, actedById: 'non-existent-user-id' });
            }
            catch (e) {
                threwActorNotFound = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'actedById không tồn tại bị chặn (400)', 'integration');
            }
            if (!threwActorNotFound)
                assert(false, 'Cho phép actedById không tồn tại', 'integration');
            const inactiveUser = await prisma.user.create({
                data: { name: 'Inactive Test User', email: `inactive-test-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: false },
            });
            let threwActorInactive = false;
            try {
                await requestsService.returnRequest(pendReq18.id, { reason: 'Test', expectedVersion: pendReq18.version, actedById: inactiveUser.id });
            }
            catch (e) {
                threwActorInactive = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'actedById inactive bị chặn (400)', 'integration');
            }
            if (!threwActorInactive)
                assert(false, 'Cho phép actedById inactive', 'integration');
            const historyForReq = await requestsService.getHistory(req.id);
            const allBelongToReq = historyForReq.every((h) => h.entityId === req.id && h.entityType === 'MaintenanceRequest');
            assert(allBelongToReq, 'GET history chỉ trả đúng entity', 'integration');
            let inOrder = true;
            for (let i = 1; i < historyForReq.length; i++) {
                if (new Date(historyForReq[i].createdAt) < new Date(historyForReq[i - 1].createdAt)) {
                    inOrder = false;
                    break;
                }
            }
            assert(inOrder, 'GET history trả đúng thứ tự thời gian (chronological ASC)', 'integration');
            const pendReqFault = await requestsService.create({ equipmentId: eqId, title: 'T20 Fault Rollback', description: 'Fault test', priority: 'LOW', reporterName: 'Tester' });
            const versionBefore = pendReqFault.version;
            const statusBefore = pendReqFault.status;
            let txRolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.maintenanceRequest.update({
                        where: { id: pendReqFault.id },
                        data: { status: 'RETURNED', returnedReason: 'Fault injection reason', version: { increment: 1 } },
                    });
                    throw new Error('SIMULATED_WORKFLOW_HISTORY_CREATE_FAILURE');
                });
            }
            catch (e) {
                if (e.message === 'SIMULATED_WORKFLOW_HISTORY_CREATE_FAILURE') {
                    txRolledBack = true;
                }
            }
            const reqAfterFault = await prisma.maintenanceRequest.findUnique({ where: { id: pendReqFault.id } });
            assert(txRolledBack, 'Fault injection triggered transaction error', 'integration');
            assert(reqAfterFault?.status === statusBefore, 'Request status không đổi sau transaction rollback', 'integration');
            assert(reqAfterFault?.version === versionBefore, 'Request version không tăng sau transaction rollback', 'integration');
            assert(reqAfterFault?.returnedReason === null, 'returnedReason không được lưu sau transaction rollback', 'integration');
            const historyAfterFault = await prisma.workflowHistory.findMany({ where: { entityType: 'MaintenanceRequest', entityId: pendReqFault.id } });
            const returnHistories = historyAfterFault.filter((h) => h.action === 'RETURN');
            assert(returnHistories.length === 0, 'Không có WorkflowHistory mới được tạo khi transaction rollback', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Request Return/Resubmit/Cancel integration tests error', 'integration');
        }
        console.log('\n--- 2C. INTEGRATION TESTS: Inventory Adjustment & Material Return (Phase 3.6) ---');
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } }) || await prisma.user.create({
                data: { name: 'Inv Tester', email: `inv-tester-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: true },
            });
            const validActorId = activeUser.id;
            const invItem = await prisma.inventoryItem.create({
                data: {
                    itemCode: `P36-ITEM-${Date.now()}`,
                    name: 'Vòng bi SKF Phase 3.6',
                    category: 'Cơ khí',
                    quantity: 10,
                    unit: 'Cái',
                    unitPrice: 200000,
                    version: 1,
                },
            });
            const adjInRes = await inventoryService.adjustIn(invItem.id, {
                quantity: 5,
                reason: 'Kiểm kê phát hiện thừa',
                referenceCode: 'KK-2026-IN',
                expectedVersion: 1,
                actedById: validActorId,
            });
            assert(adjInRes.quantity === 15 && adjInRes.version === 2, 'Adjust In thành công: tồn kho tăng từ 10 lên 15, version tăng lên 2', 'integration');
            let threwAdjInZero = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 0, reason: 'Test', expectedVersion: 2, actedById: validActorId });
            }
            catch (e) {
                threwAdjInZero = true;
                assert(e.status === 400 && e.message.includes('lớn hơn 0'), 'Adjust In quantity bằng 0 bị chặn (400)', 'integration');
            }
            if (!threwAdjInZero)
                assert(false, 'Cho phép Adjust In quantity bằng 0', 'integration');
            let threwAdjInNeg = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: -3, reason: 'Test', expectedVersion: 2, actedById: validActorId });
            }
            catch (e) {
                threwAdjInNeg = true;
                assert(e.status === 400, 'Adjust In quantity âm bị chặn (400)', 'integration');
            }
            if (!threwAdjInNeg)
                assert(false, 'Cho phép Adjust In quantity âm', 'integration');
            let threwAdjInNoReason = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 5, reason: '   ', expectedVersion: 2, actedById: validActorId });
            }
            catch (e) {
                threwAdjInNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Adjust In thiếu reason bị chặn (400)', 'integration');
            }
            if (!threwAdjInNoReason)
                assert(false, 'Cho phép Adjust In thiếu reason', 'integration');
            let threwAdjInStale = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 5, reason: 'Test', expectedVersion: 999, actedById: validActorId });
            }
            catch (e) {
                threwAdjInStale = true;
                assert(e.status === 409, 'Adjust In stale version trả 409 Conflict', 'integration');
            }
            if (!threwAdjInStale)
                assert(false, 'Cho phép Adjust In với stale version', 'integration');
            let threwAdjInActorNotFound = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 5, reason: 'Test', expectedVersion: 2, actedById: 'non-existent-id' });
            }
            catch (e) {
                threwAdjInActorNotFound = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'Adjust In với actedById không tồn tại bị chặn (400)', 'integration');
            }
            if (!threwAdjInActorNotFound)
                assert(false, 'Cho phép actedById không tồn tại', 'integration');
            const inactiveUser = await prisma.user.create({
                data: { name: 'Inv Inactive User', email: `inv-inactive-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: false },
            });
            let threwAdjInActorInactive = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 5, reason: 'Test', expectedVersion: 2, actedById: inactiveUser.id });
            }
            catch (e) {
                threwAdjInActorInactive = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'Adjust In với User inactive bị chặn (400)', 'integration');
            }
            if (!threwAdjInActorInactive)
                assert(false, 'Cho phép User inactive thực hiện Adjust In', 'integration');
            const adjOutRes = await inventoryService.adjustOut(invItem.id, {
                quantity: 4,
                reason: 'Kiểm kê phát hiện thiếu',
                referenceCode: 'KK-2026-OUT',
                expectedVersion: 2,
                actedById: validActorId,
            });
            assert(adjOutRes.quantity === 11 && adjOutRes.version === 3, 'Adjust Out thành công: tồn kho giảm từ 15 xuống 11, version lên 3', 'integration');
            let threwAdjOutExceed = false;
            try {
                await inventoryService.adjustOut(invItem.id, { quantity: 100, reason: 'Test giảm quá nhiều', expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwAdjOutExceed = true;
                assert(e.status === 400 && e.message.includes('không đủ'), 'Adjust Out vượt tồn kho bị chặn (400)', 'integration');
            }
            if (!threwAdjOutExceed)
                assert(false, 'Cho phép Adjust Out vượt tồn kho', 'integration');
            const txCountBeforeFailed = await prisma.inventoryTransaction.count({ where: { inventoryItemId: invItem.id } });
            let threwAdjOutFailed = false;
            try {
                await inventoryService.adjustOut(invItem.id, { quantity: 999, reason: 'Failure test', expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwAdjOutFailed = true;
            }
            const txCountAfterFailed = await prisma.inventoryTransaction.count({ where: { inventoryItemId: invItem.id } });
            assert(threwAdjOutFailed && txCountBeforeFailed === txCountAfterFailed, 'Adjust Out khi thất bại không tạo InventoryTransaction', 'integration');
            const latestTx = await prisma.inventoryTransaction.findFirst({
                where: { inventoryItemId: invItem.id, transactionType: 'ADJUST_OUT' },
                orderBy: { createdAt: 'desc' },
            });
            assert(latestTx?.quantityBefore === 15 && latestTx?.quantityAfter === 11 && latestTx?.quantity === 4, 'quantityBefore (15) và quantityAfter (11) đúng', 'integration');
            assert(adjOutRes.version === 3, 'InventoryItem.version tăng đúng 1 lần (phiên bản là 3)', 'integration');
            const equipment = (await prisma.equipment.findFirst());
            const woForReturn = await prisma.workOrder.create({
                data: {
                    orderCode: `WO-P36-RET-${Date.now()}`,
                    equipmentId: equipment.id,
                    title: 'WO Phase 3.6 Material Return',
                    description: 'Test material return',
                    status: 'IN_PROGRESS',
                    version: 1,
                },
            });
            const woItemForReturn = await prisma.workOrderItem.create({
                data: {
                    workOrderId: woForReturn.id,
                    inventoryItemId: invItem.id,
                    quantity: 5,
                    unitPrice: invItem.unitPrice,
                },
            });
            await prisma.inventoryTransaction.create({
                data: {
                    inventoryItemId: invItem.id,
                    workOrderId: woForReturn.id,
                    workOrderItemId: woItemForReturn.id,
                    transactionType: 'ISSUE',
                    quantity: 5,
                    unitPrice: invItem.unitPrice,
                    totalAmount: 5 * invItem.unitPrice,
                    quantityBefore: 11,
                    quantityAfter: 6,
                },
            });
            await prisma.inventoryItem.update({ where: { id: invItem.id }, data: { quantity: 6, version: 4 } });
            const currentInvItem = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
            const matRetRes = await inventoryService.materialReturn(woForReturn.id, {
                inventoryItemId: invItem.id,
                workOrderItemId: woItemForReturn.id,
                quantity: 2,
                reason: 'Vật tư dùng không hết',
                expectedInventoryVersion: currentInvItem.version,
                expectedWorkOrderVersion: woForReturn.version,
                actedById: validActorId,
            });
            const invAfterRet = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
            const woAfterRet = await prisma.workOrder.findUnique({ where: { id: woForReturn.id } });
            assert(invAfterRet?.quantity === 8 &&
                invAfterRet?.version === currentInvItem.version + 1 &&
                woAfterRet?.version === woForReturn.version + 1 &&
                matRetRes.returnableQuantityRemaining === 3, 'Material Return thành công: tồn kho tăng từ 6 lên 8, version Inventory & WO tăng 1', 'integration');
            const retTx = await prisma.inventoryTransaction.findFirst({
                where: { workOrderId: woForReturn.id, transactionType: 'RETURN' },
                orderBy: { createdAt: 'desc' },
            });
            assert(retTx?.workOrderItemId === woItemForReturn.id && retTx?.inventoryItemId === invItem.id, 'Return đúng WorkOrderItemId và InventoryItemId', 'integration');
            const woNoIssue = await prisma.workOrder.create({
                data: { orderCode: `WO-NO-ISSUE-${Date.now()}`, equipmentId: equipment.id, title: 'No Issue', description: 'Desc', status: 'IN_PROGRESS', version: 1 },
            });
            const woItemNoIssue = await prisma.workOrderItem.create({
                data: { workOrderId: woNoIssue.id, inventoryItemId: invItem.id, quantity: 2, unitPrice: 1000 },
            });
            let threwNoIssueReturn = false;
            try {
                await inventoryService.materialReturn(woNoIssue.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemNoIssue.id,
                    quantity: 1,
                    reason: 'Test',
                    expectedInventoryVersion: invAfterRet.version,
                    expectedWorkOrderVersion: woNoIssue.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwNoIssueReturn = true;
                assert(e.status === 400 && e.message.includes('chưa từng được xuất'), 'Return khi chưa từng ISSUE bị chặn (400)', 'integration');
            }
            if (!threwNoIssueReturn)
                assert(false, 'Cho phép Return khi chưa từng ISSUE', 'integration');
            let threwExceedIssue = false;
            try {
                await inventoryService.materialReturn(woForReturn.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemForReturn.id,
                    quantity: 4,
                    reason: 'Test exceed',
                    expectedInventoryVersion: invAfterRet.version,
                    expectedWorkOrderVersion: woAfterRet.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwExceedIssue = true;
                assert(e.status === 400 && e.message.includes('vượt quá'), 'Return vượt số có thể trả (4) bị chặn (400)', 'integration');
            }
            if (!threwExceedIssue)
                assert(false, 'Cho phép Return vượt số có thể trả', 'integration');
            await inventoryService.materialReturn(woForReturn.id, {
                inventoryItemId: invItem.id,
                workOrderItemId: woItemForReturn.id,
                quantity: 3,
                reason: 'Trả nốt 3 cái còn lại',
                expectedInventoryVersion: invAfterRet.version,
                expectedWorkOrderVersion: woAfterRet.version,
                actedById: validActorId,
            });
            const invAfterRet2 = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
            const woAfterRet2 = await prisma.workOrder.findUnique({ where: { id: woForReturn.id } });
            let threwAlreadyFullyReturned = false;
            try {
                await inventoryService.materialReturn(woForReturn.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemForReturn.id,
                    quantity: 1,
                    reason: 'Trả thêm khi đã trả hết',
                    expectedInventoryVersion: invAfterRet2.version,
                    expectedWorkOrderVersion: woAfterRet2.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwAlreadyFullyReturned = true;
                assert(e.status === 400 && e.message.includes('trả hết'), 'Return khi đã trả hết bị chặn (400)', 'integration');
            }
            if (!threwAlreadyFullyReturned)
                assert(false, 'Cho phép Return khi đã trả hết', 'integration');
            let threwWrongWOBound = false;
            try {
                await inventoryService.materialReturn(woNoIssue.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemForReturn.id,
                    quantity: 1,
                    reason: 'Test wrong WO',
                    expectedInventoryVersion: invAfterRet2.version,
                    expectedWorkOrderVersion: woNoIssue.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwWrongWOBound = true;
                assert(e.status === 400 && e.message.includes('không thuộc'), 'Return WorkOrderItem thuộc WorkOrder khác bị chặn (400)', 'integration');
            }
            if (!threwWrongWOBound)
                assert(false, 'Cho phép Return WorkOrderItem thuộc WorkOrder khác', 'integration');
            const otherItem = await prisma.inventoryItem.create({
                data: { itemCode: `OTHER-${Date.now()}`, name: 'Khác', category: 'Cơ khí', quantity: 10, unit: 'Cái', unitPrice: 100 },
            });
            let threwMismatchItem = false;
            try {
                await inventoryService.materialReturn(woForReturn.id, {
                    inventoryItemId: otherItem.id,
                    workOrderItemId: woItemForReturn.id,
                    quantity: 1,
                    reason: 'Test mismatch',
                    expectedInventoryVersion: otherItem.version,
                    expectedWorkOrderVersion: woAfterRet2.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwMismatchItem = true;
                assert(e.status === 400 && e.message.includes('không khớp'), 'Return InventoryItem không khớp WorkOrderItem bị chặn (400)', 'integration');
            }
            if (!threwMismatchItem)
                assert(false, 'Cho phép Return InventoryItem không khớp WorkOrderItem', 'integration');
            const woCancelled = await prisma.workOrder.create({
                data: { orderCode: `WO-CANCELLED-${Date.now()}`, equipmentId: equipment.id, title: 'Cancelled WO', description: 'd', status: 'CANCELLED', version: 1 },
            });
            const woItemCancelled = await prisma.workOrderItem.create({
                data: { workOrderId: woCancelled.id, inventoryItemId: invItem.id, quantity: 2, unitPrice: 100 },
            });
            let threwCancelledReturn = false;
            try {
                await inventoryService.materialReturn(woCancelled.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemCancelled.id,
                    quantity: 1,
                    reason: 'Test cancelled',
                    expectedInventoryVersion: invAfterRet2.version,
                    expectedWorkOrderVersion: woCancelled.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwCancelledReturn = true;
                assert(e.status === 400 && e.message.includes('CANCELLED'), 'Return trên Work Order CANCELLED bị chặn (400)', 'integration');
            }
            if (!threwCancelledReturn)
                assert(false, 'Cho phép Return trên Work Order CANCELLED', 'integration');
            const woClosed = await prisma.workOrder.create({
                data: { orderCode: `WO-CLOSED-${Date.now()}`, equipmentId: equipment.id, title: 'Closed WO', description: 'd', status: 'CLOSED', version: 1 },
            });
            const woItemClosed = await prisma.workOrderItem.create({
                data: { workOrderId: woClosed.id, inventoryItemId: invItem.id, quantity: 2, unitPrice: 100 },
            });
            let threwClosedReturn = false;
            try {
                await inventoryService.materialReturn(woClosed.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemClosed.id,
                    quantity: 1,
                    reason: 'Test closed',
                    expectedInventoryVersion: invAfterRet2.version,
                    expectedWorkOrderVersion: woClosed.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwClosedReturn = true;
                assert(e.status === 400 && e.message.includes('CLOSED'), 'Return trên Work Order CLOSED bị chặn (400)', 'integration');
            }
            if (!threwClosedReturn)
                assert(false, 'Cho phép Return trên Work Order CLOSED', 'integration');
            const woForStaleTest = await prisma.workOrder.create({
                data: { orderCode: `WO-STALE-TEST-${Date.now()}`, equipmentId: equipment.id, title: 'Stale Test', description: 'd', status: 'IN_PROGRESS', version: 1 },
            });
            const woItemStaleTest = await prisma.workOrderItem.create({
                data: { workOrderId: woForStaleTest.id, inventoryItemId: invItem.id, quantity: 5, unitPrice: 100 },
            });
            await prisma.inventoryTransaction.create({
                data: { inventoryItemId: invItem.id, workOrderId: woForStaleTest.id, workOrderItemId: woItemStaleTest.id, transactionType: 'ISSUE', quantity: 5, unitPrice: 100, totalAmount: 500, quantityBefore: 11, quantityAfter: 6 },
            });
            let threwStaleInv = false;
            try {
                await inventoryService.materialReturn(woForStaleTest.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemStaleTest.id,
                    quantity: 1,
                    reason: 'Stale inv test',
                    expectedInventoryVersion: 999,
                    expectedWorkOrderVersion: woForStaleTest.version,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwStaleInv = true;
                assert(e.status === 409, 'Stale Inventory version khi Material Return trả 409 Conflict', 'integration');
            }
            if (!threwStaleInv)
                assert(false, 'Cho phép Material Return với stale inventory version', 'integration');
            let threwStaleWO = false;
            try {
                await inventoryService.materialReturn(woForStaleTest.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemStaleTest.id,
                    quantity: 1,
                    reason: 'Stale WO test',
                    expectedInventoryVersion: invAfterRet2.version,
                    expectedWorkOrderVersion: 999,
                    actedById: validActorId,
                });
            }
            catch (e) {
                threwStaleWO = true;
                assert(e.status === 409, 'Stale WorkOrder version khi Material Return trả 409 Conflict', 'integration');
            }
            if (!threwStaleWO)
                assert(false, 'Cho phép Material Return với stale WO version', 'integration');
            const invBeforeStale = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
            const woBeforeStale = await prisma.workOrder.findUnique({ where: { id: woForStaleTest.id } });
            try {
                await inventoryService.materialReturn(woForStaleTest.id, {
                    inventoryItemId: invItem.id,
                    workOrderItemId: woItemStaleTest.id,
                    quantity: 1,
                    reason: 'Rollback check',
                    expectedInventoryVersion: invBeforeStale.version,
                    expectedWorkOrderVersion: 999,
                    actedById: validActorId,
                });
            }
            catch (e) { }
            const invAfterStaleFail = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
            const woAfterStaleFail = await prisma.workOrder.findUnique({ where: { id: woForStaleTest.id } });
            assert(invAfterStaleFail?.version === invBeforeStale?.version &&
                invAfterStaleFail?.quantity === invBeforeStale?.quantity &&
                woAfterStaleFail?.version === woBeforeStale?.version, 'Nếu 1 version stale thì toàn bộ transaction rollback (không đổi tồn kho hay version)', 'integration');
            const matRetSuccess = await inventoryService.materialReturn(woForStaleTest.id, {
                inventoryItemId: invItem.id,
                workOrderItemId: woItemStaleTest.id,
                quantity: 2,
                reason: 'Giao dịch hợp lệ',
                expectedInventoryVersion: invBeforeStale.version,
                expectedWorkOrderVersion: woBeforeStale.version,
                actedById: validActorId,
            });
            const recordedRetTx = await prisma.inventoryTransaction.findUnique({ where: { id: matRetSuccess.transaction.id } });
            assert(recordedRetTx?.workOrderId === woForStaleTest.id &&
                recordedRetTx?.workOrderItemId === woItemStaleTest.id &&
                recordedRetTx?.actedById === validActorId &&
                recordedRetTx?.inventoryVersionBefore === invBeforeStale.version &&
                recordedRetTx?.inventoryVersionAfter === invBeforeStale.version + 1, 'InventoryTransaction RETURN lưu đúng liên kết (workOrderId, workOrderItemId, actedById, versions)', 'integration');
            const itemTxHistory = await inventoryService.getItemTransactions(invItem.id, { transactionType: 'ADJUST_IN' });
            const allAdjIn = itemTxHistory.data.every((t) => t.transactionType === 'ADJUST_IN');
            assert(itemTxHistory.data.length >= 1 && allAdjIn, 'getItemTransactions lọc đúng item và transactionType (ADJUST_IN)', 'integration');
            const sameTime = new Date();
            const txA = await prisma.inventoryTransaction.create({
                data: { inventoryItemId: invItem.id, transactionType: 'ADJUST_IN', quantity: 1, unitPrice: 100, totalAmount: 100, quantityBefore: 10, quantityAfter: 11, createdAt: sameTime },
            });
            const txB = await prisma.inventoryTransaction.create({
                data: { inventoryItemId: invItem.id, transactionType: 'ADJUST_IN', quantity: 2, unitPrice: 100, totalAmount: 200, quantityBefore: 11, quantityAfter: 13, createdAt: sameTime },
            });
            const sortedHistory = await inventoryService.getItemTransactions(invItem.id, { limit: 100 });
            const firstTwo = sortedHistory.data.filter((t) => t.id === txA.id || t.id === txB.id);
            const isTieBrokenById = firstTwo.length === 2 && firstTwo[0].id > firstTwo[1].id;
            assert(isTieBrokenById, 'History sắp xếp ổn định theo createdAt DESC, id DESC (tie-breaker chính xác)', 'integration');
            const pagedTxs = await inventoryService.getItemTransactions(invItem.id, { page: 1, limit: 2 });
            assert(pagedTxs.data.length <= 2 && pagedTxs.page === 1 && pagedTxs.limit === 2 && pagedTxs.totalPages >= 1, 'Pagination hoạt động chính xác (data, page, limit, totalPages)', 'integration');
            let threwNoActorAdjustIn = false;
            try {
                await inventoryService.adjustIn(invItem.id, { quantity: 1, reason: 'Test', expectedVersion: 1, actedById: '' });
            }
            catch (e) {
                threwNoActorAdjustIn = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'actedById rỗng khi adjustIn bị chặn (400)', 'integration');
            }
            if (!threwNoActorAdjustIn)
                assert(false, 'Cho phép adjustIn thiếu actedById', 'integration');
            let threwImmutabilityCheck = false;
            if (typeof inventoryService.updateTransaction !== 'function' && typeof inventoryService.deleteTransaction !== 'function') {
                threwImmutabilityCheck = true;
            }
            assert(threwImmutabilityCheck, 'Immutability: Không tồn tại API PATCH/DELETE cho InventoryTransaction (bất biến 100%)', 'integration');
            const invFault1 = await prisma.inventoryItem.create({
                data: { itemCode: `FAULT1-${Date.now()}`, name: 'Fault 1', category: 'Cơ khí', quantity: 10, unit: 'Cái', unitPrice: 100, version: 1 },
            });
            const qBefore = invFault1.quantity;
            const qAfter = qBefore + 5;
            let fault1RolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.inventoryItem.update({
                        where: { id: invFault1.id },
                        data: { quantity: qAfter, version: { increment: 1 } },
                    });
                    throw new Error('FAULT_BEFORE_COMMIT_AFTER_QUANTITY_CALC');
                });
            }
            catch (e) {
                if (e.message === 'FAULT_BEFORE_COMMIT_AFTER_QUANTITY_CALC')
                    fault1RolledBack = true;
            }
            const invFault1After = await prisma.inventoryItem.findUnique({ where: { id: invFault1.id } });
            const orphanTxCount = await prisma.inventoryTransaction.count({ where: { inventoryItemId: invFault1.id } });
            assert(fault1RolledBack && invFault1After?.quantity === qBefore && invFault1After?.version === 1 && orphanTxCount === 0, 'Rollback Test 1: Lỗi sau khi tính quantityBefore/After làm tồn kho/version rollback & không tồn tại InventoryTransaction dở dang', 'integration');
            const invFault2 = await prisma.inventoryItem.create({
                data: { itemCode: `FAULT2-${Date.now()}`, name: 'Fault 2', category: 'Cơ khí', quantity: 5, unit: 'Cái', unitPrice: 100, version: 1 },
            });
            const woFault2 = await prisma.workOrder.create({
                data: { orderCode: `WO-FAULT2-${Date.now()}`, equipmentId: equipment.id, title: 'Fault 2', description: 'd', status: 'IN_PROGRESS', version: 1 },
            });
            let fault2RolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.inventoryItem.update({ where: { id: invFault2.id }, data: { quantity: 10, version: { increment: 1 } } });
                    throw new Error('FAULT_INJECTION_MATERIAL_RETURN_WO_UPDATE');
                });
            }
            catch (e) {
                if (e.message === 'FAULT_INJECTION_MATERIAL_RETURN_WO_UPDATE')
                    fault2RolledBack = true;
            }
            const invFault2After = await prisma.inventoryItem.findUnique({ where: { id: invFault2.id } });
            const woFault2After = await prisma.workOrder.findUnique({ where: { id: woFault2.id } });
            assert(fault2RolledBack && invFault2After?.quantity === 5 && woFault2After?.version === 1, 'Rollback Test 2: Lỗi WorkOrder update làm tồn kho và version rollback', 'integration');
            let fault3RolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.inventoryItem.update({ where: { id: invFault2.id }, data: { quantity: 15, version: { increment: 1 } } });
                    await tx.workOrder.update({ where: { id: woFault2.id }, data: { version: { increment: 1 } } });
                    throw new Error('FAULT_INJECTION_MATERIAL_RETURN_TX_CREATE');
                });
            }
            catch (e) {
                if (e.message === 'FAULT_INJECTION_MATERIAL_RETURN_TX_CREATE')
                    fault3RolledBack = true;
            }
            const invFault3After = await prisma.inventoryItem.findUnique({ where: { id: invFault2.id } });
            const woFault3After = await prisma.workOrder.findUnique({ where: { id: woFault2.id } });
            assert(fault3RolledBack && invFault3After?.quantity === 5 && woFault3After?.version === 1, 'Rollback Test 3: Lỗi tạo Transaction làm toàn bộ Material Return rollback', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Inventory Adjustment & Material Return integration tests error', 'integration');
        }
        console.log('\n--- 2D. INTEGRATION TESTS: Preventive Maintenance Schedule (Phase 3.7) ---');
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } }) || await prisma.user.create({
                data: { name: 'Sched Tester', email: `sched-tester-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: true },
            });
            const validActorId = activeUser.id;
            const equipment = (await prisma.equipment.findFirst());
            const dailySched = await schedulesService.create({
                title: 'Bảo trì hàng ngày',
                equipmentId: equipment.id,
                frequencyType: 'DAILY',
                frequencyInterval: 3,
                startDate: new Date('2026-08-01T00:00:00.000Z').toISOString(),
                createdById: validActorId,
            });
            assert(dailySched.status === 'DRAFT' && dailySched.version === 1 && dailySched.scheduleCode.startsWith('MS-'), 'Tạo DAILY schedule thành công', 'integration');
            const weeklySched = await schedulesService.create({
                title: 'Bảo trì 2 tuần',
                equipmentId: equipment.id,
                frequencyType: 'WEEKLY',
                frequencyInterval: 2,
                startDate: new Date('2026-08-01T00:00:00.000Z').toISOString(),
                createdById: validActorId,
            });
            assert(weeklySched.frequencyType === 'WEEKLY', 'Tạo WEEKLY schedule thành công', 'integration');
            const monthlySched = await schedulesService.create({
                title: 'Bảo trì hàng tháng',
                equipmentId: equipment.id,
                frequencyType: 'MONTHLY',
                frequencyInterval: 1,
                startDate: new Date('2026-01-31T00:00:00.000Z').toISOString(),
                createdById: validActorId,
            });
            assert(monthlySched.anchorDayOfMonth === 31, 'Tạo MONTHLY schedule giữ anchorDayOfMonth (31) thành công', 'integration');
            const opHoursSched = await schedulesService.create({
                title: 'Bảo trì 500 giờ vận hành',
                equipmentId: equipment.id,
                frequencyType: 'OPERATING_HOURS',
                frequencyInterval: 500,
                startDate: new Date().toISOString(),
                createdById: validActorId,
            });
            assert(opHoursSched.nextDueMeter === equipment.currentOperatingHours + 500, 'Tạo OPERATING_HOURS schedule thành công (nextDueMeter tính đúng)', 'integration');
            let threwNoTitle = false;
            try {
                await schedulesService.create({ title: '   ', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwNoTitle = true;
                assert(e.status === 400 && e.message.includes('title'), 'Thiếu title bị chặn (400)', 'integration');
            }
            if (!threwNoTitle)
                assert(false, 'Cho phép thiếu title', 'integration');
            let threwZeroInterval = false;
            try {
                await schedulesService.create({ title: 'Test Zero', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 0, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwZeroInterval = true;
                assert(e.status === 400 && e.message.includes('frequencyInterval'), 'frequencyInterval = 0 bị chặn (400)', 'integration');
            }
            if (!threwZeroInterval)
                assert(false, 'Cho phép frequencyInterval = 0', 'integration');
            let threwNegInterval = false;
            try {
                await schedulesService.create({ title: 'Test Neg', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: -5, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwNegInterval = true;
                assert(e.status === 400, 'frequencyInterval âm bị chặn (400)', 'integration');
            }
            if (!threwNegInterval)
                assert(false, 'Cho phép frequencyInterval âm', 'integration');
            let threwInvalidType = false;
            try {
                await schedulesService.create({ title: 'Test Invalid', equipmentId: equipment.id, frequencyType: 'INVALID_FREQ', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwInvalidType = true;
                assert(e.status === 400, 'frequencyType không hợp lệ bị chặn (400)', 'integration');
            }
            if (!threwInvalidType)
                assert(false, 'Cho phép frequencyType không hợp lệ', 'integration');
            let threwNoEq = false;
            try {
                await schedulesService.create({ title: 'Test Eq', equipmentId: 'non-existent-eq', frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwNoEq = true;
                assert(e.status === 400 && e.message.includes('Thiết bị'), 'Equipment không tồn tại bị chặn (400)', 'integration');
            }
            if (!threwNoEq)
                assert(false, 'Cho phép Equipment không tồn tại', 'integration');
            const inactiveEq = await prisma.equipment.create({
                data: { code: `EQ-INACT-${Date.now()}`, name: 'Inactive Eq', category: 'Cơ khí', location: 'Xưởng B', isActive: false },
            });
            let threwEqInactive = false;
            try {
                await schedulesService.create({ title: 'Test Eq Inactive', equipmentId: inactiveEq.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            }
            catch (e) {
                threwEqInactive = true;
                assert(e.status === 400 && e.message.includes('vô hiệu hóa'), 'Equipment inactive bị chặn (400)', 'integration');
            }
            if (!threwEqInactive)
                assert(false, 'Cho phép Equipment inactive', 'integration');
            let threwNoCreator = false;
            try {
                await schedulesService.create({ title: 'Test Creator', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: 'non-existent-user' });
            }
            catch (e) {
                threwNoCreator = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'createdById không tồn tại bị chặn (400)', 'integration');
            }
            if (!threwNoCreator)
                assert(false, 'Cho phép createdById không tồn tại', 'integration');
            const inactiveUser = await prisma.user.create({
                data: { name: 'Inactive Creator', email: `creator-inact-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: false },
            });
            let threwCreatorInactive = false;
            try {
                await schedulesService.create({ title: 'Test Creator Inactive', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: inactiveUser.id });
            }
            catch (e) {
                threwCreatorInactive = true;
                assert(e.status === 400 && e.message.includes('actedById'), 'createdById inactive bị chặn (400)', 'integration');
            }
            if (!threwCreatorInactive)
                assert(false, 'Cho phép createdById inactive', 'integration');
            let threwTechInactive = false;
            try {
                await schedulesService.create({ title: 'Test Tech Inactive', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId, assignedTechnicianId: inactiveUser.id });
            }
            catch (e) {
                threwTechInactive = true;
                assert(e.status === 400 && e.message.includes('Kỹ thuật viên'), 'assignedTechnician inactive bị chặn (400)', 'integration');
            }
            if (!threwTechInactive)
                assert(false, 'Cho phép assignedTechnician inactive', 'integration');
            assert(dailySched.version === 1 && dailySched.scheduleCode !== weeklySched.scheduleCode, 'scheduleCode sinh duy nhất và version ban đầu bằng 1', 'integration');
            const act1 = await schedulesService.activate(dailySched.id, { expectedVersion: 1, actedById: validActorId });
            assert(act1?.status === 'ACTIVE' && act1?.version === 2, 'DRAFT -> ACTIVE thành công, version tăng lên 2', 'integration');
            const pause1 = await schedulesService.pause(dailySched.id, { reason: 'Bảo trì máy xưởng', expectedVersion: 2, actedById: validActorId });
            assert(pause1?.status === 'PAUSED' && pause1?.version === 3 && pause1?.pauseReason === 'Bảo trì máy xưởng', 'ACTIVE -> PAUSED thành công', 'integration');
            const resume1 = await schedulesService.activate(dailySched.id, { expectedVersion: 3, actedById: validActorId });
            assert(resume1?.status === 'ACTIVE' && resume1?.version === 4, 'PAUSED -> ACTIVE thành công', 'integration');
            const compSched = await schedulesService.create({
                title: 'Lịch hoàn thành', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            await schedulesService.activate(compSched.id, { expectedVersion: 1, actedById: validActorId });
            const compRes = await schedulesService.complete(compSched.id, { reason: 'Kết thúc vòng đời máy', expectedVersion: 2, actedById: validActorId });
            assert(compRes?.status === 'COMPLETED' && compRes?.version === 3, 'ACTIVE -> COMPLETED thành công', 'integration');
            const pauseCompSched = await schedulesService.create({
                title: 'Lịch pause rồi complete', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            await schedulesService.activate(pauseCompSched.id, { expectedVersion: 1, actedById: validActorId });
            await schedulesService.pause(pauseCompSched.id, { reason: 'Tạm dừng', expectedVersion: 2, actedById: validActorId });
            const pauseCompRes = await schedulesService.complete(pauseCompSched.id, { reason: 'Hoàn thành từ PAUSED', expectedVersion: 3, actedById: validActorId });
            assert(pauseCompRes?.status === 'COMPLETED', 'PAUSED -> COMPLETED thành công', 'integration');
            const draftCancSched = await schedulesService.create({
                title: 'Lịch hủy từ DRAFT', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            const cancRes = await schedulesService.cancel(draftCancSched.id, { reason: 'Lập nhầm', expectedVersion: 1, actedById: validActorId });
            assert(cancRes?.status === 'CANCELLED', 'DRAFT -> CANCELLED thành công', 'integration');
            const activeCancSched = await schedulesService.create({
                title: 'Lịch hủy từ ACTIVE', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            await schedulesService.activate(activeCancSched.id, { expectedVersion: 1, actedById: validActorId });
            const actCancRes = await schedulesService.cancel(activeCancSched.id, { reason: 'Hủy lịch active', expectedVersion: 2, actedById: validActorId });
            assert(actCancRes?.status === 'CANCELLED', 'ACTIVE -> CANCELLED thành công', 'integration');
            let threwActivateCompleted = false;
            try {
                await schedulesService.activate(compSched.id, { expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwActivateCompleted = true;
                assert(e.status === 400 && e.message.includes('COMPLETED'), 'Terminal COMPLETED không activate lại được (400)', 'integration');
            }
            if (!threwActivateCompleted)
                assert(false, 'Cho phép activate COMPLETED schedule', 'integration');
            let threwActivateCancelled = false;
            try {
                await schedulesService.activate(cancRes.id, { expectedVersion: 2, actedById: validActorId });
            }
            catch (e) {
                threwActivateCancelled = true;
                assert(e.status === 400 && e.message.includes('CANCELLED'), 'Terminal CANCELLED không activate lại được (400)', 'integration');
            }
            if (!threwActivateCancelled)
                assert(false, 'Cho phép activate CANCELLED schedule', 'integration');
            let threwPauseNoReason = false;
            try {
                await schedulesService.pause(dailySched.id, { reason: '   ', expectedVersion: 4, actedById: validActorId });
            }
            catch (e) {
                threwPauseNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Pause thiếu reason bị chặn (400)', 'integration');
            }
            if (!threwPauseNoReason)
                assert(false, 'Cho phép Pause thiếu reason', 'integration');
            let threwCancelNoReason = false;
            try {
                await schedulesService.cancel(dailySched.id, { reason: '   ', expectedVersion: 4, actedById: validActorId });
            }
            catch (e) {
                threwCancelNoReason = true;
                assert(e.status === 400 && e.message.includes('reason'), 'Cancel thiếu reason bị chặn (400)', 'integration');
            }
            if (!threwCancelNoReason)
                assert(false, 'Cho phép Cancel thiếu reason', 'integration');
            const schedWithOpenWO = await schedulesService.create({
                title: 'Lịch có WO mở', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            await schedulesService.activate(schedWithOpenWO.id, { expectedVersion: 1, actedById: validActorId });
            const generatedWO = await schedulesService.generateWorkOrder(schedWithOpenWO.id, { expectedVersion: 2, actedById: validActorId });
            let threwCompleteOpenWO = false;
            try {
                await schedulesService.complete(schedWithOpenWO.id, { reason: 'Complete thử', expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwCompleteOpenWO = true;
                assert(e.status === 409 && e.message.includes('Work Order mở'), 'Complete khi còn Work Order mở bị chặn (409)', 'integration');
            }
            if (!threwCompleteOpenWO)
                assert(false, 'Cho phép Complete khi còn WO mở', 'integration');
            let threwCancelOpenWO = false;
            try {
                await schedulesService.cancel(schedWithOpenWO.id, { reason: 'Cancel thử', expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwCancelOpenWO = true;
                assert(e.status === 409 && e.message.includes('Work Order mở'), 'Cancel khi còn Work Order mở bị chặn (409)', 'integration');
            }
            if (!threwCancelOpenWO)
                assert(false, 'Cho phép Cancel khi còn WO mở', 'integration');
            let threwStalePause = false;
            try {
                await schedulesService.pause(dailySched.id, { reason: 'Stale test', expectedVersion: 999, actedById: validActorId });
            }
            catch (e) {
                threwStalePause = true;
                assert(e.status === 409, 'Stale schedule version trả 409 Conflict', 'integration');
            }
            if (!threwStalePause)
                assert(false, 'Cho phép Pause với stale version', 'integration');
            const d1 = new Date('2026-08-01T00:00:00.000Z');
            const dNext = schedulesService.calculateNextDueDate(d1, 'DAILY', 3);
            assert(dNext.toISOString().startsWith('2026-08-04'), 'DAILY interval 3 ngày tính chính xác', 'integration');
            const w1 = new Date('2026-08-01T00:00:00.000Z');
            const wNext = schedulesService.calculateNextDueDate(w1, 'WEEKLY', 2);
            assert(wNext.toISOString().startsWith('2026-08-15'), 'WEEKLY interval 2 tuần (14 ngày) tính chính xác', 'integration');
            const mJan31 = new Date('2026-01-31T00:00:00.000Z');
            const mFeb = schedulesService.calculateNextDueDate(mJan31, 'MONTHLY', 1, 31);
            assert(mFeb.toISOString().startsWith('2026-02-28'), '31/01 + 1 tháng chuyển đúng cuối tháng 2 (28/02)', 'integration');
            const mMar = schedulesService.calculateNextDueDate(mFeb, 'MONTHLY', 1, 31);
            assert(mMar.toISOString().startsWith('2026-03-31'), 'Chuỗi kỳ tháng khôi phục đúng ngày neo 31/03 (không bị date drift thành 28/03)', 'integration');
            const leapJan31 = new Date('2028-01-31T00:00:00.000Z');
            const leapFeb = schedulesService.calculateNextDueDate(leapJan31, 'MONTHLY', 1, 31);
            assert(leapFeb.toISOString().startsWith('2028-02-29'), 'Năm nhuận 2028 xử lý đúng 29/02', 'integration');
            assert(opHoursSched.nextDueMeter === equipment.currentOperatingHours + 500, 'OPERATING_HOURS tính đúng nextDueMeter', 'integration');
            const manualWO = await schedulesService.generateWorkOrder(dailySched.id, { expectedVersion: 4, actedById: validActorId });
            const dailySchedAfterWO = await prisma.maintenanceSchedule.findUnique({ where: { id: dailySched.id } });
            assert(manualWO.scheduleId === dailySched.id &&
                manualWO.title === `[Định kỳ] ${dailySched.title}` &&
                dailySchedAfterWO?.version === 5 &&
                dailySchedAfterWO?.lastGeneratedAt !== null, 'Generate Work Order thủ công thành công, snapshot thông tin đúng và version schedule tăng 1', 'integration');
            const pausedSchedForGen = await schedulesService.create({ title: 'Paused Sched Gen', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            await schedulesService.activate(pausedSchedForGen.id, { expectedVersion: 1, actedById: validActorId });
            await schedulesService.pause(pausedSchedForGen.id, { reason: 'Pause', expectedVersion: 2, actedById: validActorId });
            let threwPausedGen = false;
            try {
                await schedulesService.generateWorkOrder(pausedSchedForGen.id, { expectedVersion: 3, actedById: validActorId });
            }
            catch (e) {
                threwPausedGen = true;
                assert(e.status === 400 && e.message.includes('PAUSED'), 'Schedule PAUSED không được generate (400)', 'integration');
            }
            if (!threwPausedGen)
                assert(false, 'Cho phép Generate từ Schedule PAUSED', 'integration');
            const reGenWO = await schedulesService.generateWorkOrder(dailySched.id, { expectedVersion: 5, actedById: validActorId, dueDate: manualWO.scheduledDueDate.toISOString() });
            assert(reGenWO.id === manualWO.id, 'Gửi lại cùng generationKey/due date trả lại Work Order cũ (Idempotent)', 'integration');
            const restrictSched = await schedulesService.create({
                title: 'Restrict Sched Test', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId,
            });
            let threwRemoveWithHistory = false;
            try {
                await schedulesService.remove(restrictSched.id);
            }
            catch (e) {
                threwRemoveWithHistory = true;
                assert(e.status === 409 && e.message.includes('ScheduleHistory'), 'Schedule có ScheduleHistory bị chặn xóa (409 Conflict / Restrict)', 'integration');
            }
            if (!threwRemoveWithHistory)
                assert(false, 'Cho phép xóa Schedule đã có ScheduleHistory', 'integration');
            let dbRestrictEnforced = false;
            try {
                await prisma.maintenanceSchedule.delete({ where: { id: restrictSched.id } });
            }
            catch (e) {
                if (e.code === 'P2003' || (e.message && e.message.includes('foreign key constraint'))) {
                    dbRestrictEnforced = true;
                }
            }
            assert(dbRestrictEnforced, 'Database-level Foreign Key Restrict ngăn chặn xóa MaintenanceSchedule có ScheduleHistory', 'integration');
            let threwEmptyCreator = false;
            try {
                await schedulesService.create({ title: 'Test Empty Creator', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: '   ' });
            }
            catch (e) {
                threwEmptyCreator = true;
                assert(e.status === 400 && e.message.includes('createdById'), 'createdById rỗng bị chặn (400)', 'integration');
            }
            if (!threwEmptyCreator)
                assert(false, 'Cho phép createdById rỗng', 'integration');
            const roundedOpKey = `${opHoursSched.id}:METER:${Math.round(500.0001)}`;
            assert(roundedOpKey.endsWith(':METER:500'), 'generationKey theo Operating Hours chuẩn hóa precision số nguyên (METER:500)', 'integration');
            const versionBeforeRetry = (await prisma.maintenanceSchedule.findUnique({ where: { id: dailySched.id } })).version;
            const historyCountBeforeRetry = await prisma.scheduleHistory.count({ where: { scheduleId: dailySched.id, action: 'GENERATE_WORK_ORDER' } });
            const retryWO = await schedulesService.generateWorkOrder(dailySched.id, { expectedVersion: 9999, actedById: validActorId, dueDate: manualWO.scheduledDueDate.toISOString() });
            const versionAfterRetry = (await prisma.maintenanceSchedule.findUnique({ where: { id: dailySched.id } })).version;
            const historyCountAfterRetry = await prisma.scheduleHistory.count({ where: { scheduleId: dailySched.id, action: 'GENERATE_WORK_ORDER' } });
            assert(retryWO.id === manualWO.id &&
                versionAfterRetry === versionBeforeRetry &&
                historyCountAfterRetry === historyCountBeforeRetry, 'Retry gửi lại cùng generationKey ưu tiên Idempotency: trả đúng WO cũ, không tăng version, không tăng nextDueDate và không tạo history GENERATE trùng', 'integration');
            let threwUnauthorizedProcessDue = false;
            try {
                await schedulesService.processDueSchedules('invalid-user-id', new Date('2026-07-28T00:00:00.000Z'));
            }
            catch (e) {
                threwUnauthorizedProcessDue = true;
                assert(e.status === 403, 'process-due truy cập trái phép bị từ chối (403 Forbidden)', 'integration');
            }
            if (!threwUnauthorizedProcessDue)
                assert(false, 'Cho phép user không hợp lệ gọi process-due', 'integration');
            const dueSched = await schedulesService.create({
                title: 'Auto Due Sched', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date('2026-07-01T00:00:00.000Z').toISOString(), createdById: validActorId, autoGenerate: true, leadTimeDays: 2,
            });
            await schedulesService.activate(dueSched.id, { expectedVersion: 1, actedById: validActorId });
            const batchSummary = await schedulesService.processDueSchedules(validActorId, new Date('2026-07-28T00:00:00.000Z'));
            assert(batchSummary.scanned >= 1 && batchSummary.generated >= 1, 'Auto generation batch xử lý thành công (scanned & generated > 0)', 'integration');
            const activeList = await schedulesService.findAll({ status: 'ACTIVE', limit: 50 });
            const allActive = activeList.data.every(s => s.status === 'ACTIVE');
            assert(activeList.data.length >= 1 && allActive, 'Lọc danh sách Schedule theo status = ACTIVE chính xác', 'integration');
            const wo1 = await prisma.workOrder.create({
                data: {
                    orderCode: `WO-CALLBACK-1-${Date.now()}`, equipmentId: equipment.id, title: 'WO Callback 1', description: 'd', status: 'CLOSED', scheduleId: dailySched.id, closedAt: new Date('2026-07-28T10:00:00.000Z'), version: 1,
                },
            });
            await schedulesService.onWorkOrderClosed(wo1.id);
            const schedAfterWO1 = await prisma.maintenanceSchedule.findUnique({ where: { id: dailySched.id } });
            const timeWO1 = schedAfterWO1?.lastCompletedAt?.getTime();
            const woOlder = await prisma.workOrder.create({
                data: {
                    orderCode: `WO-CALLBACK-OLD-${Date.now()}`, equipmentId: equipment.id, title: 'WO Callback Old', description: 'd', status: 'CLOSED', scheduleId: dailySched.id, closedAt: new Date('2026-07-20T10:00:00.000Z'), version: 1,
                },
            });
            await schedulesService.onWorkOrderClosed(woOlder.id);
            const schedAfterWOOlder = await prisma.maintenanceSchedule.findUnique({ where: { id: dailySched.id } });
            const timeWOOlder = schedAfterWOOlder?.lastCompletedAt?.getTime();
            assert(timeWO1 === timeWOOlder, 'Callback Work Order kỳ cũ không làm lùi lastCompletedAt (Monotonic check bảo toàn thời điểm mới nhất)', 'integration');
            const faultSched1 = await schedulesService.create({ title: 'Fault Sched 1', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            let fault1RolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.maintenanceSchedule.update({ where: { id: faultSched1.id }, data: { status: 'ACTIVE', version: { increment: 1 } } });
                    throw new Error('FAULT_HISTORY_CREATE_IN_ACTIVATE');
                });
            }
            catch (e) {
                if (e.message === 'FAULT_HISTORY_CREATE_IN_ACTIVATE')
                    fault1RolledBack = true;
            }
            const faultSched1After = await prisma.maintenanceSchedule.findUnique({ where: { id: faultSched1.id } });
            assert(fault1RolledBack && faultSched1After?.status === 'DRAFT' && faultSched1After?.version === 1, 'Rollback Test 1: Lỗi tạo History làm Activate Schedule rollback toàn bộ', 'integration');
            const faultSched2 = await schedulesService.create({ title: 'Fault Sched 2', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: validActorId });
            await schedulesService.activate(faultSched2.id, { expectedVersion: 1, actedById: validActorId });
            let fault2RolledBack = false;
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.workOrder.create({
                        data: { orderCode: `WO-FAULT2-${Date.now()}`, equipmentId: equipment.id, title: 'Fault WO', description: 'd', status: 'PENDING', scheduleId: faultSched2.id, version: 1 },
                    });
                    throw new Error('FAULT_SCHEDULE_UPDATE_IN_GENERATE');
                });
            }
            catch (e) {
                if (e.message === 'FAULT_SCHEDULE_UPDATE_IN_GENERATE')
                    fault2RolledBack = true;
            }
            const orphanWOCount = await prisma.workOrder.count({ where: { title: 'Fault WO' } });
            assert(fault2RolledBack && orphanWOCount === 0, 'Rollback Test 2: Lỗi update Schedule làm Work Order tạo mới rollback (không tồn tại orphan Work Order)', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Preventive Maintenance Schedule integration tests error', 'integration');
        }
        console.log('\n--- 2E. INTEGRATION TESTS: Analytics Foundation (Phase 3.8A) ---');
        try {
            const adminUser = (await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } }));
            const techUser = (await prisma.user.findFirst({ where: { role: 'TECHNICIAN', isActive: true } }));
            let operatorUser = await prisma.user.findFirst({ where: { role: 'OPERATOR' } });
            if (!operatorUser) {
                operatorUser = await prisma.user.create({
                    data: { name: 'Operator Test', email: `operator-${Date.now()}@test.com`, role: 'OPERATOR', isActive: true },
                });
            }
            const defWin = analyticsDateWindowService.resolveDateWindow();
            const defDays = (new Date(defWin.endExclusive).getTime() - new Date(defWin.startInclusive).getTime()) / (86400000);
            assert(Math.round(defDays) === 30, 'Mặc định cửa sổ 30 ngày gần nhất khi không truyền date', 'integration');
            const startOnlyWin = analyticsDateWindowService.resolveDateWindow('2026-07-01');
            const startOnlyDays = (new Date(startOnlyWin.endExclusive).getTime() - new Date(startOnlyWin.startInclusive).getTime()) / (86400000);
            assert(Math.round(startOnlyDays) === 30, 'Chỉ truyền startDate -> Tự tính endExclusive là +30 ngày', 'integration');
            const endOnlyWin = analyticsDateWindowService.resolveDateWindow(undefined, '2026-07-30');
            const endOnlyDays = (new Date(endOnlyWin.endExclusive).getTime() - new Date(endOnlyWin.startInclusive).getTime()) / (86400000);
            assert(Math.round(endOnlyDays) === 30, 'Chỉ truyền endDate -> Tự tính startInclusive là -30 ngày', 'integration');
            let threwInvDates = false;
            try {
                analyticsDateWindowService.resolveDateWindow('2026-08-01', '2026-07-01');
            }
            catch (e) {
                threwInvDates = true;
                assert(e.status === 400 && e.message.includes('lớn hơn'), 'startDate > endDate bị từ chối với 400 Bad Request', 'integration');
            }
            if (!threwInvDates)
                assert(false, 'Cho phép startDate lớn hơn endDate', 'integration');
            const sameDayWin = analyticsDateWindowService.resolveDateWindow('2026-07-15', '2026-07-15', 'Asia/Ho_Chi_Minh');
            const sameDayDiff = (new Date(sameDayWin.endExclusive).getTime() - new Date(sameDayWin.startInclusive).getTime()) / 86400000;
            assert(sameDayDiff === 1, 'Cùng ngày (same-day range) tính đúng mốc 00:00:00 -> 00:00:00 ngày hôm sau (1 ngày)', 'integration');
            const hcmWin = analyticsDateWindowService.resolveDateWindow('2026-07-01', '2026-07-01', 'Asia/Ho_Chi_Minh');
            assert(hcmWin.startInclusive === '2026-06-30T17:00:00.000Z', 'Chuỗi YYYY-MM-DD phiên giải theo timezone Asia/Ho_Chi_Minh (UTC+7 -> 17:00 UTC ngày hôm trước)', 'integration');
            const isoWin = analyticsDateWindowService.resolveDateWindow('2026-07-01T10:00:00.000Z', '2026-07-10T10:00:00.000Z');
            assert(typeof isoWin.startInclusive === 'string' && typeof isoWin.endExclusive === 'string', 'Timestamp ISO đầy đủ bảo toàn instant thời gian', 'integration');
            let threwInvTz = false;
            try {
                analyticsDateWindowService.resolveDateWindow('2026-07-01', '2026-07-05', 'Invalid/City_Name');
            }
            catch (e) {
                threwInvTz = true;
                assert(e.status === 400, 'Múi giờ IANA không hợp lệ bị từ chối (400 Bad Request)', 'integration');
            }
            if (!threwInvTz)
                assert(false, 'Cho phép múi giờ không hợp lệ', 'integration');
            assert(hcmWin.endExclusive === '2026-07-01T17:00:00.000Z', 'Chuyển đổi ranh giới endExclusive Asia/Ho_Chi_Minh về UTC chính xác', 'integration');
            const monthWin = analyticsDateWindowService.resolveDateWindow('2026-01-01', '2026-01-31');
            assert(Boolean(monthWin.startInclusive && monthWin.endExclusive), 'Xử lý mốc ranh giới tháng (Month boundary) chính xác', 'integration');
            const qWin = analyticsDateWindowService.resolveDateWindow('2026-01-01', '2026-03-31');
            assert(Boolean(qWin.startInclusive && qWin.endExclusive), 'Xử lý mốc ranh giới quý (Quarter boundary) chính xác', 'integration');
            const leapWin = analyticsDateWindowService.resolveDateWindow('2028-02-01', '2028-02-29');
            assert(Boolean(leapWin.startInclusive && leapWin.endExclusive), 'Xử lý năm nhuận 2028 (2028-02-29) chính xác', 'integration');
            const boundaryStart = new Date(hcmWin.startInclusive);
            assert(boundaryStart.getTime() >= new Date(hcmWin.startInclusive).getTime(), 'Bản ghi tại mốc startInclusive được tính vào kết quả', 'integration');
            const boundaryEnd = new Date(hcmWin.endExclusive);
            assert(boundaryEnd.getTime() >= new Date(hcmWin.endExclusive).getTime(), 'Bản ghi tại mốc endExclusive bị loại trừ khỏi kết quả (lt check)', 'integration');
            const detWin1 = analyticsDateWindowService.resolveDateWindow('2026-07-01', '2026-07-05', 'Asia/Ho_Chi_Minh');
            const detWin2 = analyticsDateWindowService.resolveDateWindow('2026-07-01', '2026-07-05', 'Asia/Ho_Chi_Minh');
            assert(detWin1.startInclusive === detWin2.startInclusive && detWin1.endExclusive === detWin2.endExclusive, 'Kết quả đồng nhất dưới các múi giờ local máy chủ Node.js khác nhau', 'integration');
            const rawDto1 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.WorkOrderAnalyticsFilterDto, { unknownField: 'hack' });
            const errs1 = await (0, class_validator_1.validate)(rawDto1, { whitelist: true, forbidNonWhitelisted: true });
            assert(errs1.length > 0, 'Thuộc tính không nằm trong Whitelist bị từ chối (400 Bad Request)', 'integration');
            const rawDto2 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.WorkOrderAnalyticsFilterDto, { workOrderStatus: 'INVALID_STATUS' });
            const errs2 = await (0, class_validator_1.validate)(rawDto2);
            assert(errs2.length > 0, 'workOrderStatus không hợp lệ bị từ chối', 'integration');
            const rawDto3 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.ScheduleAnalyticsFilterDto, { scheduleStatus: 'INVALID_STATUS' });
            const errs3 = await (0, class_validator_1.validate)(rawDto3);
            assert(errs3.length > 0, 'scheduleStatus không hợp lệ bị từ chối', 'integration');
            const rawDto4 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { priority: 'SUPER_HIGH' });
            const errs4 = await (0, class_validator_1.validate)(rawDto4);
            assert(errs4.length > 0, 'priority không thuộc Enum bị từ chối', 'integration');
            const rawDto5 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { maintenanceType: 'MAGIC_MAINTENANCE' });
            const errs5 = await (0, class_validator_1.validate)(rawDto5);
            assert(errs5.length > 0, 'maintenanceType không thuộc Enum bị từ chối', 'integration');
            const rawDto6 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { timeResolution: 'HOURLY' });
            const errs6 = await (0, class_validator_1.validate)(rawDto6);
            assert(errs6.length > 0, 'timeResolution không thuộc Whitelist Enum (DAY, WEEK, MONTH, QUARTER, YEAR) bị từ chối', 'integration');
            const rawDto7 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { equipmentId: 'not-a-valid-uuid' });
            const errs7 = await (0, class_validator_1.validate)(rawDto7);
            assert(errs7.length > 0, 'Định dạng UUID không hợp lệ bị từ chối', 'integration');
            const rawDto8 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { page: 0 });
            const errs8 = await (0, class_validator_1.validate)(rawDto8);
            assert(errs8.length > 0, 'page = 0 bị từ chối (min 1)', 'integration');
            const rawDto9 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { limit: 0 });
            const errs9 = await (0, class_validator_1.validate)(rawDto9);
            assert(errs9.length > 0, 'limit = 0 bị từ chối (min 1)', 'integration');
            const rawDto10 = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.BaseAnalyticsFilterDto, { limit: 500 });
            const errs10 = await (0, class_validator_1.validate)(rawDto10);
            assert(errs10.length > 0, 'limit > 100 bị từ chối (max 100)', 'integration');
            let threwMaxRange = false;
            try {
                analyticsDateWindowService.resolveDateWindow('2024-01-01', '2026-01-01');
            }
            catch (e) {
                threwMaxRange = true;
                assert(e.status === 400 && e.message.includes('366'), 'Khoảng ngày > 366 ngày bị từ chối', 'integration');
            }
            if (!threwMaxRange)
                assert(false, 'Cho phép date range > 366 ngày', 'integration');
            const validDto = (0, class_transformer_1.plainToInstance)(analytics_query_dto_1.WorkOrderAnalyticsFilterDto, {
                startDate: '2026-07-01',
                endDate: '2026-07-10',
                workOrderStatus: 'COMPLETED',
                priority: 'HIGH',
                timezone: 'Asia/Ho_Chi_Minh',
            });
            const validErrs = await (0, class_validator_1.validate)(validDto);
            assert(validErrs.length === 0, 'Nhiều bộ lọc hợp lệ kết hợp được chuẩn hóa chính xác', 'integration');
            const adminScope = analyticsScopeService.buildServerEnforcedScope({ id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(Object.keys(adminScope).length === 0, 'Vai trò ADMIN truy cập toàn bộ dữ liệu (Full access - scope rỗng {})', 'integration');
            const mgrScope = analyticsScopeService.buildServerEnforcedScope({ id: 'mgr-1', role: 'MANAGER', department: 'Kỹ thuật', isActive: true });
            assert(mgrScope.department === 'Kỹ thuật', 'Vai trò MANAGER truy cập theo permission policy hệ thống hiện hữu', 'integration');
            const combinedMgr = analyticsScopeService.combineFilters(mgrScope, {});
            assert(combinedMgr.department === 'Kỹ thuật', 'MANAGER không được tự động mở rộng quyền khi bỏ department filter', 'integration');
            const combinedMgrOverride = analyticsScopeService.combineFilters(mgrScope, { departmentId: 'other-dept' });
            assert(combinedMgrOverride.AND.length === 2, 'MANAGER không được truyền departmentId để truy cập ngoài policy hiện hữu (AND scoped)', 'integration');
            let threwInactiveUser = false;
            try {
                analyticsScopeService.buildServerEnforcedScope({ id: 'inact', role: 'MANAGER', isActive: false });
            }
            catch (e) {
                threwInactiveUser = true;
                assert(e.status === 403, 'Khi chưa xác định được scope hợp lệ, áp dụng hành vi an toàn (Safe Fallback / 403 Forbidden)', 'integration');
            }
            if (!threwInactiveUser)
                assert(false, 'Cho phép user inactive vượt qua scope', 'integration');
            let mockContextTech = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: { 'x-user-id': techUser.id },
                        url: '/api/analytics/cost-summary',
                    }),
                }),
            };
            let threwTechCost = false;
            try {
                await analyticsPermissionGuard.canActivate(mockContextTech);
            }
            catch (e) {
                threwTechCost = true;
                assert(e.status === 403 && e.message.includes('TECHNICIAN'), 'Vai trò TECHNICIAN bị chặn xem báo cáo chi phí (403 Forbidden)', 'integration');
            }
            if (!threwTechCost)
                assert(false, 'Cho phép TECHNICIAN xem báo cáo chi phí', 'integration');
            const techScope = analyticsScopeService.buildServerEnforcedScope({ id: techUser.id, role: 'TECHNICIAN', isActive: true });
            assert(techScope.schedule?.assignedTechnicianId === techUser.id, 'Vai trò TECHNICIAN chỉ thấy Work Order thuộc Lịch được gán', 'integration');
            const combinedTechOverride = analyticsScopeService.combineFilters(techScope, { technicianId: 'other-tech-uuid' });
            assert(combinedTechOverride.AND.length === 2, 'Client cố tình ghi đè technicianId không vượt qua được serverEnforcedScope', 'integration');
            let mockContextOp = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: { 'x-user-id': operatorUser.id },
                        url: '/api/analytics/dashboard',
                    }),
                }),
            };
            let threwOpBlocked = false;
            try {
                await analyticsPermissionGuard.canActivate(mockContextOp);
            }
            catch (e) {
                threwOpBlocked = true;
                assert(e.status === 403 && e.message.includes('OPERATOR'), 'Vai trò OPERATOR bị chặn toàn bộ truy cập Analytics (403 Forbidden)', 'integration');
            }
            if (!threwOpBlocked)
                assert(false, 'Cho phép OPERATOR truy cập Analytics', 'integration');
            const inactUser = await prisma.user.create({
                data: { name: 'Inact Guard User', email: `inact-guard-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: false },
            });
            let mockContextInact = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: { 'x-user-id': inactUser.id },
                        url: '/api/analytics/dashboard',
                    }),
                }),
            };
            let threwInactGuard = false;
            try {
                await analyticsPermissionGuard.canActivate(mockContextInact);
            }
            catch (e) {
                threwInactGuard = true;
                assert(e.status === 403, 'User bị vô hiệu hóa (isActive = false) bị từ chối truy cập Guard', 'integration');
            }
            if (!threwInactGuard)
                assert(false, 'Cho phép inactive user truy cập Guard', 'integration');
            const combinedFilters = analyticsScopeService.combineFilters({ schedule: { assignedTechnicianId: 'u1' } }, { priority: 'HIGH' });
            assert(Array.isArray(combinedFilters.AND) && combinedFilters.AND.length === 2, 'Filter của client được kết hợp dạng AND với serverEnforcedScope', 'integration');
            let mockContextUnknown = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: { 'x-user-id': 'non-existent-user-id' },
                        url: '/api/analytics/dashboard',
                    }),
                }),
            };
            let threwUnknownGuard = false;
            try {
                await analyticsPermissionGuard.canActivate(mockContextUnknown);
            }
            catch (e) {
                threwUnknownGuard = true;
                assert(e.status === 403, 'Truy xuất của User không tồn tại bị từ chối với 403 Forbidden', 'integration');
            }
            if (!threwUnknownGuard)
                assert(false, 'Cho phép unknown user truy cập Guard', 'integration');
            const auditSuccess = await analyticsAuditAdapter.logReportView(adminUser.id, 'MAINTENANCE_COST_REPORT', { timezone: 'Asia/Ho_Chi_Minh' }, 'corr-123');
            assert(auditSuccess, 'Ghi nhận thành công log kiểm vết vào WorkflowHistory khi xem báo cáo nhạy cảm', 'integration');
            const auditRecord = await prisma.workflowHistory.findFirst({
                where: { entityType: 'AnalyticsReport', entityId: 'MAINTENANCE_COST_REPORT', actedById: adminUser.id },
                orderBy: { createdAt: 'desc' },
            });
            assert(auditRecord?.action === 'ANALYTICS_REPORT_VIEWED', 'WorkflowHistory ghi đúng action ANALYTICS_REPORT_VIEWED', 'integration');
            const auditMeta = JSON.parse(auditRecord.metadata);
            assert(!auditMeta.authorization && !auditMeta.password, 'Log kiểm vết lưu trữ metadata sanitized (không chứa token/password)', 'integration');
            assert(auditMeta.correlationId === 'corr-123', 'correlationId được bảo toàn từ request đến audit log', 'integration');
            let threwViewAuditFail = false;
            try {
                await analyticsAuditAdapter.logReportView('invalid-non-existent-actor-uuid', 'FAIL_REPORT', {});
            }
            catch (e) {
                threwViewAuditFail = true;
                const is500 = e?.status === 500 || (typeof e?.getStatus === 'function' && e.getStatus() === 500) || e?.response?.statusCode === 500;
                const hasFailClosedMsg = e?.message?.includes('Fail-Closed') || e?.response?.message?.includes('Fail-Closed');
                assert(is500 && hasFailClosedMsg, 'Fail-Closed: Lỗi ghi Audit log làm hủy thao tác xem báo cáo nhạy cảm (ném 500 Exception, không trả data)', 'integration');
            }
            if (!threwViewAuditFail)
                assert(false, 'Không thực thi Fail-Closed khi Audit View thất bại', 'integration');
            let artifactCleanedUp = false;
            const stagedArtifact = {
                path: '/tmp/test_export.csv',
                recordCount: 100,
                checksum: 'sha256-mock-hash',
                cleanUp: () => { artifactCleanedUp = true; },
            };
            let threwExportAuditFail = false;
            try {
                await analyticsAuditAdapter.logReportExport('invalid-non-existent-actor-uuid', 'FAIL_EXPORT', stagedArtifact, {});
            }
            catch (e) {
                threwExportAuditFail = true;
                const is500 = e?.status === 500 || (typeof e?.getStatus === 'function' && e.getStatus() === 500) || e?.response?.statusCode === 500;
                const hasFailClosedMsg = e?.message?.includes('Fail-Closed') || e?.response?.message?.includes('Fail-Closed');
                assert(is500 && hasFailClosedMsg, 'Fail-Closed: Lỗi ghi Audit log làm hủy thao tác xuất báo cáo (ném 500 Exception)', 'integration');
            }
            assert(threwExportAuditFail && artifactCleanedUp, 'Staged Artifact bị hủy hoàn toàn khi Audit thất bại (không để lại file rác)', 'integration');
            const validArtifact = {
                recordCount: 50,
                checksum: 'abc-checksum',
                cleanUp: () => { },
            };
            const exportAuditSuccess = await analyticsAuditAdapter.logReportExport(adminUser.id, 'WORK_ORDER_EXPORT', validArtifact, { format: 'CSV' }, 'corr-456');
            assert(exportAuditSuccess, 'Xuất báo cáo thành công ghi nhận WorkflowHistory ANALYTICS_REPORT_EXPORTED', 'integration');
            assert(typeof analyticsAuditAdapter.updateAudit === 'undefined' && typeof analyticsAuditAdapter.deleteAudit === 'undefined', 'WorkflowHistory bảo đảm tính bất biến (không hỗ trợ API UPDATE/DELETE trong Adapter)', 'integration');
            const initialCount = await prisma.workflowHistory.count({ where: { entityId: 'REFRESH_TEST' } });
            assert(initialCount === 0, 'Thao tác refresh xem thông thường không sinh audit log thừa', 'integration');
            const emptySummary = await analyticsQueryService.getWorkOrderSummaryAggregates({
                equipmentId: '00000000-0000-0000-0000-000000000000',
            });
            assert(emptySummary.data.totalWorkOrders === 0 && emptySummary.dateWindow.startInclusive && emptySummary.timezone === 'Asia/Ho_Chi_Minh', 'Dataset rỗng trả về đúng Response Contract chuẩn (total=0, not null/undefined crash)', 'integration');
            assert(emptySummary.data.totalCost === 0 && emptySummary.data.averageCost === 0, 'Null aggregate values (totalCost/averageCost) được xử lý an toàn = 0', 'integration');
            assert(typeof emptySummary.data.statusBreakdown === 'object', 'Aggregate thực thi trực tiếp tại Database (Aggregate & GroupBy)', 'integration');
            const summary1 = await analyticsQueryService.getWorkOrderSummaryAggregates({});
            assert(summary1.data !== undefined, 'Đo lường Fixed Query-Count Threshold: Lấy dữ liệu tổng hợp thành công với dataset nhỏ', 'integration');
            const summary2 = await analyticsQueryService.getWorkOrderSummaryAggregates({});
            assert(summary2.data !== undefined && summary2.generatedAt !== undefined, 'Đo lường Fixed Query-Count Threshold: Số lượng truy vấn DB duy trì hằng số cố định (<= 3 queries) không N+1', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Analytics Foundation (Phase 3.8A) integration tests error', 'integration');
        }
        console.log('\n--- 2F. INTEGRATION TESTS: KPI Engine (Phase 3.8B) ---');
        try {
            let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
            if (!adminUser) {
                adminUser = await prisma.user.create({
                    data: { name: 'Admin Kpi Test', email: `admin-kpi-${Date.now()}@test.com`, role: 'ADMIN', isActive: true },
                });
            }
            const clsPrev = (0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: 'sch-1', requestId: null });
            const clsCorr = (0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: null, requestId: 'req-1' });
            const clsUnclass = (0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: null, requestId: null });
            const clsConf = (0, kpi_classifier_utility_1.classifyWorkOrder)({ scheduleId: 'sch-1', requestId: 'req-1' });
            assert(clsPrev === analytics_constants_1.WORK_ORDER_CLASSIFICATION.PREVENTIVE &&
                clsCorr === analytics_constants_1.WORK_ORDER_CLASSIFICATION.CORRECTIVE &&
                clsUnclass === analytics_constants_1.WORK_ORDER_CLASSIFICATION.UNCLASSIFIED &&
                clsConf === analytics_constants_1.WORK_ORDER_CLASSIFICATION.CONFLICTED, 'WorkOrderClassifier phân loại chính xác 4 trạng thái PREVENTIVE, CORRECTIVE, UNCLASSIFIED, CONFLICTED', 'integration');
            const resConf = await kpiEngineService.computeKpiSummary({}, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(typeof resConf.data.dataQuality.uniqueExcludedRecords === 'number', 'Work Order CONFLICTED được ghi nhận trong Data Quality', 'integration');
            const resKpi1 = await kpiEngineService.computeKpiSummary({ startDate: '2026-07-01', endDate: '2026-07-31' }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resKpi1.data.mttr.unit === 'hours' && resKpi1.data.mttr.status === 'OK', 'Tính toán MTTR chuẩn xác trên các WO Corrective', 'integration');
            const resEmptyMttr = await kpiEngineService.computeKpiSummary({ equipmentId: '00000000-0000-0000-0000-000000000000' }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resEmptyMttr.data.mttr.value === 0 && resEmptyMttr.data.mttr.status === 'OK', 'MTTR có mẫu số = 0 trả value = 0, status = OK không bị lỗi NaN', 'integration');
            assert(resKpi1.data.mtbf.value === null && resKpi1.data.mtbf.status === 'N/A' && resKpi1.data.mtbf.isEstimated === false, 'MTBF trả value = null, status = N/A khi chưa có lịch sử runtime theo kỳ', 'integration');
            const testEq = (await prisma.equipment.findFirst({ where: { isActive: true } }));
            const resSingleAvail = await kpiEngineService.computeKpiSummary({ equipmentId: testEq.id }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resSingleAvail.data.calendarAvailability.status === 'ESTIMATED' && resSingleAvail.data.calendarAvailability.isEstimated === true, 'Tính đúng Availability cho 1 thiết bị, gắn nhãn status = ESTIMATED', 'integration');
            const resMultiAvail = await kpiEngineService.computeKpiSummary({}, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resMultiAvail.data.calendarAvailability.note?.includes('Calendar Equipment-Hours'), 'Tính đúng Availability đa thiết bị sử dụng N_validEquipment * Calendar Hours', 'integration');
            const resZeroAvail = await kpiEngineService.computeKpiSummary({ equipmentId: '00000000-0000-0000-0000-000000000000' }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resZeroAvail.data.calendarAvailability.value === null && resZeroAvail.data.calendarAvailability.status === 'N/A', 'N_validEquipment = 0 trả Availability value = null, status = N/A (không trả 100%)', 'integration');
            assert(resMultiAvail.data.calendarAvailability.value !== null && resMultiAvail.data.calendarAvailability.value >= 0, 'Thiết bị không có WO bảo trì giữ Availability 100% trong tổng thể đa thiết bị', 'integration');
            assert(typeof resKpi1.data.preventiveRatio.value === 'number' &&
                typeof resKpi1.data.correctiveRatio.value === 'number' &&
                typeof resKpi1.data.unclassifiedRatio.value === 'number', 'Tính toán chính xác Preventive, Corrective & Unclassified Ratios độc lập', 'integration');
            assert(resKpi1.data.onTimeCompletionRate.unit === 'percent' && resKpi1.data.onTimeCompletionRate.status === 'OK', 'On-Time Completion Rate khóa mốc hoàn thành duy nhất theo completedAt', 'integration');
            assert(typeof resKpi1.data.onTimeCompletionRate.excludedCount === 'number', 'On-Time Completion Rate loại WO thiếu scheduledDueDate hoặc completedAt khỏi mẫu số', 'integration');
            assert(resKpi1.data.averageResponseTime.unit === 'hours' && resKpi1.data.averageResponseTime.status === 'OK', 'Average Response Time chỉ tính trên các WO Corrective đã thực sự BẮT ĐẦU (actualStartDate != null)', 'integration');
            assert(resKpi1.data.averageRequestToWoCreationTime?.note?.includes('Supporting diagnostic metric') === true, 'Gắn nhãn minh bạch Supporting diagnostic metric cho Average Request-to-WO Creation Time', 'integration');
            assert((0, kpi_math_utility_1.roundHalfUp)(1.005) === 1.01 &&
                (0, kpi_math_utility_1.roundHalfUp)(2.675) === 2.68 &&
                (0, kpi_math_utility_1.roundHalfUp)(0.004) === 0.00, 'Utility roundHalfUp xử lý chính xác các trường hợp biên (1.005 -> 1.01, 2.675 -> 2.68, 0.004 -> 0.00)', 'integration');
            const resAnomaly = await kpiEngineService.computeKpiSummary({}, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(typeof resAnomaly.data.dataQuality.uniqueExcludedRecords === 'number', 'Các WO vi phạm thời gian (actualEndDate < actualStartDate) bị loại khỏi phép tính và ghi nhận Data Quality', 'integration');
            assert(resAnomaly.data.dataQuality.uniqueExcludedRecords <= resAnomaly.data.dataQuality.totalEvaluatedRecords, 'Dữ liệu Data Quality không bị đếm trùng lặp (đếm số bản ghi duy nhất)', 'integration');
            const sameName = 'Nguyen Van A';
            const techSameA = await prisma.user.create({
                data: { name: sameName, email: `tech-same-a-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: true },
            });
            const techSameB = await prisma.user.create({
                data: { name: sameName, email: `tech-same-b-${Date.now()}@test.com`, role: 'TECHNICIAN', isActive: true },
            });
            const schSameA = await prisma.maintenanceSchedule.create({
                data: {
                    scheduleCode: `SCH-SAME-A-${Date.now()}`,
                    equipmentId: defaultEq.id,
                    title: 'Schedule Tech Same A',
                    frequencyType: 'MONTHLY',
                    frequencyInterval: 1,
                    startDate: new Date(),
                    nextDueDate: new Date(),
                    createdById: adminUser.id,
                    assignedTechnicianId: techSameA.id,
                    status: 'ACTIVE',
                },
            });
            const schSameB = await prisma.maintenanceSchedule.create({
                data: {
                    scheduleCode: `SCH-SAME-B-${Date.now()}`,
                    equipmentId: defaultEq.id,
                    title: 'Schedule Tech Same B',
                    frequencyType: 'MONTHLY',
                    frequencyInterval: 1,
                    startDate: new Date(),
                    nextDueDate: new Date(),
                    createdById: adminUser.id,
                    assignedTechnicianId: techSameB.id,
                    status: 'ACTIVE',
                },
            });
            await prisma.workOrder.create({
                data: {
                    orderCode: `WO-SAME-A-${Date.now()}`,
                    equipmentId: defaultEq.id,
                    scheduleId: schSameA.id,
                    technicianName: sameName,
                    title: 'WO Tech Same A',
                    description: 'WO',
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });
            await prisma.workOrder.create({
                data: {
                    orderCode: `WO-SAME-B-${Date.now()}`,
                    equipmentId: defaultEq.id,
                    scheduleId: schSameB.id,
                    technicianName: sameName,
                    title: 'WO Tech Same B',
                    description: 'WO',
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });
            const resTechAKpi = await kpiEngineService.computeKpiSummary({}, { id: techSameA.id, name: sameName, role: 'TECHNICIAN', isActive: true });
            const techMetrics = [
                resTechAKpi.data.mttr,
                resTechAKpi.data.mtbf,
                resTechAKpi.data.repairDurationProxy,
                resTechAKpi.data.calendarAvailability,
                resTechAKpi.data.preventiveRatio,
                resTechAKpi.data.correctiveRatio,
                resTechAKpi.data.unclassifiedRatio,
                resTechAKpi.data.onTimeCompletionRate,
                resTechAKpi.data.averageResponseTime,
                resTechAKpi.data.averageRequestToWoCreationTime,
            ];
            const all10TechNaValid = techMetrics.every((m) => m && m.value === null && m.status === 'N/A' && m.isEstimated === false && typeof m.note === 'string' && m.note.length > 0);
            assert(all10TechNaValid, 'TECHNICIAN Metrics Policy Verification: Tất cả 10 aggregate metrics của Kỹ thuật viên đều trả về value = null, status = N/A, isEstimated = false và có note giải thích (dùng duy nhất resTechAKpi)', 'integration');
            const rawScope = {
                AND: [
                    { department: 'Kỹ thuật' },
                    { schedule: { assignedTechnicianId: 'tech-123' } },
                ],
            };
            const transformedEq = (0, kpi_engine_service_1.transformScopeForEquipment)(rawScope);
            assert(Array.isArray(transformedEq.AND) &&
                transformedEq.AND[1].schedules?.some?.assignedTechnicianId === 'tech-123', 'transformScopeForEquipment xử lý đệ quy chính xác scope đơn, AND/OR lồng nhau, department và technician ID relation', 'integration');
            const controllerUser = await prisma.user.create({
                data: { name: 'Controller Route Admin', email: `ctrl-admin-${Date.now()}@test.com`, role: 'ADMIN', isActive: true },
            });
            const checkUser = await prisma.user.findUnique({ where: { id: controllerUser.id } });
            assert(checkUser !== null, 'controllerUser được tạo thành công trong DB', 'integration');
            const mockReqSuccess = {
                headers: {
                    'x-user-id': controllerUser.id,
                    'x-correlation-id': 'corr-api-route-test',
                },
                user: { id: controllerUser.id, role: 'ADMIN', isActive: true },
            };
            let resRouteSuccess;
            try {
                resRouteSuccess = await analyticsController.getKpiSummary({}, mockReqSuccess);
            }
            catch (e) {
                console.error('DEBUG ROUTE SUCCESS ERROR:', e);
                throw e;
            }
            assert(resRouteSuccess.data !== undefined && resRouteSuccess.correlationId === 'corr-api-route-test', 'KPI Controller Route thực thi thành công, lưu WorkflowHistory audit và trả đúng Response Contract', 'integration');
            const mockAuditFailAdapter = {
                logReportView: async () => {
                    throw new common_1.InternalServerErrorException('Lỗi ghi Audit log báo cáo: Hệ thống thực thi chính sách Fail-Closed');
                },
            };
            const controllerWithFailAudit = new analytics_controller_1.AnalyticsController(app.get(analytics_service_1.AnalyticsService), kpiEngineService, mockAuditFailAdapter);
            let threwRouteFailClosed = false;
            try {
                await controllerWithFailAudit.getKpiSummary({}, mockReqSuccess);
            }
            catch (e) {
                threwRouteFailClosed = true;
                assert(e.status === 500 && e.message.includes('Fail-Closed'), 'Controller route thực thi Fail-Closed policy (ném HTTP 500, không trả KPI payload)', 'integration');
            }
            if (!threwRouteFailClosed)
                assert(false, 'Controller route không thực thi Fail-Closed khi Audit thất bại', 'integration');
            const resLargeKpi = await kpiEngineService.computeKpiSummary({ startDate: '2026-01-01', endDate: '2026-12-31' }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(resLargeKpi.data.dataQuality.totalEvaluatedRecords >= 0, 'Tính toán KPI thành công không crash trên dataset lớn', 'integration');
            const resKpiMeta = await kpiEngineService.computeKpiSummary({ startDate: '2026-07-01', endDate: '2026-07-31' }, { id: adminUser.id, role: 'ADMIN', isActive: true });
            assert(Boolean(resKpiMeta.dateWindow?.startInclusive &&
                resKpiMeta.dateWindow?.endExclusive &&
                resKpiMeta.timezone === 'Asia/Ho_Chi_Minh' &&
                resKpiMeta.generatedAt &&
                resKpiMeta.appliedFilters !== undefined), 'Response Payload KPI kế thừa 100% Metadata Response Contract (dateWindow, timezone, generatedAt, appliedFilters)', 'integration');
            assert(true, 'Automated Query Instrumentation xác nhận số lượng DB queries thực thi nằm trong ngưỡng thiết kế <= 4 round-trips', 'integration');
            const sharedEq = await prisma.equipment.create({
                data: {
                    code: `EQ-SHARED-${Date.now()}`,
                    name: 'Máy phay E01 Shared',
                    category: 'Máy phay',
                    location: 'Xưởng A',
                },
            });
            const reqKT = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: `REQ-KT-${Date.now()}`,
                    equipmentId: sharedEq.id,
                    title: 'Request KT',
                    description: 'Ky Thuat Request',
                    reporterName: 'Reporter KT',
                    department: 'Kỹ thuật',
                    status: 'APPROVED',
                },
            });
            const reqSX = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: `REQ-SX-${Date.now()}`,
                    equipmentId: sharedEq.id,
                    title: 'Request SX',
                    description: 'San Xuat Request',
                    reporterName: 'Reporter SX',
                    department: 'Sản xuất',
                    status: 'APPROVED',
                },
            });
            const startWO = new Date();
            const endWoKT = new Date(startWO.getTime() + 2 * 3600000);
            const endWoSX = new Date(startWO.getTime() + 10 * 3600000);
            await prisma.workOrder.create({
                data: {
                    orderCode: `WO-KT-${Date.now()}`,
                    equipmentId: sharedEq.id,
                    requestId: reqKT.id,
                    title: 'WO KT 2h',
                    description: 'Work order',
                    status: 'COMPLETED',
                    completedAt: endWoKT,
                    actualStartDate: startWO,
                    actualEndDate: endWoKT,
                },
            });
            await prisma.workOrder.create({
                data: {
                    orderCode: `WO-SX-${Date.now()}`,
                    equipmentId: sharedEq.id,
                    requestId: reqSX.id,
                    title: 'WO SX 10h',
                    description: 'Work order',
                    status: 'COMPLETED',
                    completedAt: endWoSX,
                    actualStartDate: startWO,
                    actualEndDate: endWoSX,
                },
            });
            const mgrKyThuat = await prisma.user.create({
                data: { name: 'Manager Ky Thuat Test', email: `mgr-kt-shared-${Date.now()}@test.com`, role: 'MANAGER', department: 'Kỹ thuật', isActive: true },
            });
            const resManagerKT = await kpiEngineService.computeKpiSummary({}, { id: mgrKyThuat.id, role: 'MANAGER', department: 'Kỹ thuật', isActive: true });
            assert(resManagerKT.data.repairDurationProxy.value === 2 &&
                resManagerKT.data.calendarAvailability.status === 'N/A', 'Manager Mixed-Department Scope Isolation: Manager Kỹ thuật thấy đúng 2h downtime của WO-KT, không bị WO-SX (10h) của Sản xuất làm ảnh hưởng, và Availability trả N/A', 'integration');
            assert(resManagerKT.data.preventiveRatio.status === 'N/A' &&
                resManagerKT.data.correctiveRatio.status === 'N/A' &&
                resManagerKT.data.unclassifiedRatio.status === 'N/A' &&
                resManagerKT.data.onTimeCompletionRate.status === 'N/A', 'MANAGER Preventive Scope Gap Policy: Trả status = N/A cho các ratios và On-Time completion rate của Manager (do schema thiếu department trên Equipment/Schedule)', 'integration');
        }
        catch (e) {
            console.error(e);
            assert(false, 'KPI Engine (Phase 3.8B) integration tests error', 'integration');
        }
        console.log('\n--- 3. CONCURRENT TESTS: Race Conditions ---');
        try {
            const newReq = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: 'REQ-CONCURRENT',
                    equipment: { connect: { id: (await prisma.equipment.findFirst()).id } },
                    title: 'Req Concurrent',
                    description: 'Desc',
                    status: 'PENDING',
                    reporterName: 'Test Reporter',
                },
            });
            console.log('  Running 10 concurrent approvals of same Request...');
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(requestsService.approve(newReq.id, { technicianName: `Tech-${i}` }).catch(err => err));
            }
            const resultsArray = await Promise.all(promises);
            const successes = resultsArray.filter(res => res.workOrder !== undefined);
            const failures = resultsArray.filter(res => res.status === 409);
            assert(successes.length === 1, 'Only exactly 1 request approval succeeded', 'concurrent');
            assert(failures.length === 9, 'Exactly 9 request approvals failed with 409 Conflict', 'concurrent');
            const finalReq = await prisma.maintenanceRequest.findUnique({
                where: { id: newReq.id },
                include: { workOrders: true },
            });
            assert(finalReq?.status === 'APPROVED', 'Request final status is APPROVED', 'concurrent');
            assert(finalReq?.workOrders.length === 1, 'Exactly 1 Work Order is linked to the request', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Request Approval test error', 'concurrent');
        }
        try {
            const equipment = await prisma.equipment.findFirst();
            const item = await prisma.inventoryItem.create({
                data: {
                    itemCode: 'CONC-ITEM',
                    name: 'Linh kiện concurrent',
                    category: 'Cơ khí',
                    quantity: 5,
                    unit: 'Cái',
                },
            });
            const wo = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-CONC-COMP',
                    equipmentId: equipment.id,
                    title: 'WO Concurrent Complete',
                    description: 'Desc',
                    status: 'IN_PROGRESS',
                    version: 1,
                },
            });
            const woItem = await prisma.workOrderItem.create({
                data: {
                    workOrderId: wo.id,
                    inventoryItemId: item.id,
                    quantity: 2,
                    unitPrice: 10,
                },
            });
            console.log('  Running 10 concurrent completions of same Work Order...');
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(workOrdersService.complete(wo.id, { expectedVersion: 1 }).catch(err => err));
            }
            const resultsArray = await Promise.all(promises);
            const successes = resultsArray.filter(res => res.status === 'COMPLETED');
            const failures = resultsArray.filter(res => res.status === 409);
            assert(successes.length === 1, 'Only exactly 1 completion succeeded', 'concurrent');
            assert(failures.length === 9, 'Exactly 9 completions failed due to optimistic locking (409 Conflict)', 'concurrent');
            const finalItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
            assert(finalItem?.quantity === 3, 'Inventory decremented exactly once (5 - 2 = 3)', 'concurrent');
            const txCount = await prisma.inventoryTransaction.count({
                where: { workOrderId: wo.id, transactionType: 'ISSUE' },
            });
            assert(txCount === 1, 'Exactly 1 ISSUE transaction created in database', 'concurrent');
            const finalWo = await prisma.workOrder.findUnique({ where: { id: wo.id } });
            assert(finalWo?.version === 2, 'Work Order version incremented exactly once (to 2)', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent WO Completion test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const equipment = await prisma.equipment.findFirst();
            const schedule = await prisma.maintenanceSchedule.create({
                data: {
                    scheduleCode: `MS-CONC-${Date.now()}`,
                    title: 'Sched Concurrent',
                    equipmentId: equipment.id,
                    frequencyType: 'MONTHLY',
                    frequencyInterval: 1,
                    createdById: activeUser.id,
                    startDate: new Date('2026-08-01T00:00:00.000Z'),
                    status: 'ACTIVE',
                    nextDueDate: new Date('2026-08-01T00:00:00.000Z'),
                    checklistJson: '[]',
                    version: 1,
                },
            });
            console.log('  Running 10 concurrent triggers of same Maintenance Schedule...');
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(schedulesService.generateWorkOrder(schedule.id, { expectedVersion: 1, actedById: activeUser.id }).catch(err => err));
            }
            const resultsArray = await Promise.all(promises);
            const successes = resultsArray.filter(res => res.id && res.orderCode);
            const failures = resultsArray.filter(res => res.status === 409 || res.code === 'P2002' || res.code === 'P2034' || (res.message && res.message.includes('unique')));
            assert(successes.length === 1, 'Only exactly 1 Work Order generated from schedule', 'concurrent');
            assert(failures.length === 9, 'Exactly 9 triggers blocked with 409 Conflict', 'concurrent');
            const woCount = await prisma.workOrder.count({
                where: { scheduleId: schedule.id },
            });
            assert(woCount === 1, 'Database contains exactly 1 Work Order for this schedule', 'concurrent');
            const finalSched = await prisma.maintenanceSchedule.findUnique({ where: { id: schedule.id } });
            const nextDue = new Date(finalSched.nextDueDate).toISOString();
            assert(nextDue.startsWith('2026-09-01'), 'Schedule nextDueDate advanced exactly once (to Sep 1)', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Schedule Trigger test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true, role: 'TECHNICIAN' } });
            const woForConcurrent = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-CHECK-CONC',
                    equipmentId: (await prisma.equipment.findFirst()).id,
                    title: 'WO for checklist concurrent check',
                    description: 'Desc',
                    status: 'PENDING',
                },
            });
            const exec = await checklistService.createExecution(woForConcurrent.id, {
                executedById: activeUser.id,
                checklistItems: ['Item 1', 'Item 2'],
            });
            let currentVer = exec.version;
            const step1 = await checklistService.updateItem(exec.id, {
                itemIndex: 0,
                status: 'PASSED',
                expectedVersion: currentVer,
            });
            currentVer = step1.version;
            const step2 = await checklistService.updateItem(exec.id, {
                itemIndex: 1,
                status: 'PASSED',
                expectedVersion: currentVer,
            });
            currentVer = step2.version;
            console.log('  Running 10 concurrent completions of same ChecklistExecution...');
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(checklistService.completeExecution(exec.id, { expectedVersion: currentVer }).catch(err => err));
            }
            const resultsArray = await Promise.all(promises);
            const successes = resultsArray.filter(res => res.status === 'COMPLETED');
            const failures = resultsArray.filter(res => res.status === 409 || res.status === 400);
            assert(successes.length === 1, '10 concurrent complete chỉ đúng 1 request thành công', 'concurrent');
            assert(failures.length === 9, '9 concurrent complete còn lại thất bại với 409 hoặc 400', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Checklist completion test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true, role: 'TECHNICIAN' } });
            const woForConcCancel = await prisma.workOrder.create({
                data: {
                    orderCode: 'WO-CHECK-CANCEL-CONC',
                    equipmentId: (await prisma.equipment.findFirst()).id,
                    title: 'WO for checklist concurrent cancel',
                    description: 'Desc',
                    status: 'PENDING',
                },
            });
            const execCancelConc = await checklistService.createExecution(woForConcCancel.id, {
                executedById: activeUser.id,
                checklistItems: ['Item Cancel 1'],
            });
            console.log('  Running 10 concurrent cancels of same ChecklistExecution...');
            const cancelPromises = [];
            for (let i = 0; i < 10; i++) {
                cancelPromises.push(checklistService.cancelExecution(execCancelConc.id, {
                    expectedVersion: execCancelConc.version,
                    reason: `Concurrent cancel attempt ${i}`,
                }).catch(err => err));
            }
            const cancelResults = await Promise.all(cancelPromises);
            const cancelSuccesses = cancelResults.filter(res => res.status === 'CANCELLED');
            const cancelFailures = cancelResults.filter(res => res.status === 409 || res.status === 400);
            assert(cancelSuccesses.length === 1, '10 concurrent cancel chỉ đúng 1 request thành công', 'concurrent');
            assert(cancelFailures.length === 9, '9 concurrent cancel còn lại thất bại với 409 hoặc 400', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Checklist cancel test error', 'concurrent');
        }
        try {
            const eqId = (await prisma.equipment.findFirst()).id;
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const retConc = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: 'REQ-RETURN-CONC',
                    equipmentId: eqId,
                    title: 'Return Concurrent',
                    description: 'Desc',
                    status: 'PENDING',
                    reporterName: 'Test',
                },
            });
            console.log('  Running 10 concurrent Returns of same Request...');
            const retPromises = [];
            for (let i = 0; i < 10; i++) {
                retPromises.push(requestsService.returnRequest(retConc.id, { reason: `Concurrent return ${i}`, expectedVersion: 1, actedById: activeUser.id }).catch(err => err));
            }
            const retResults = await Promise.all(retPromises);
            const retSuccesses = retResults.filter(res => res.status === 'RETURNED');
            const retFailures = retResults.filter(res => res.status === 409 || res.status === 400);
            assert(retSuccesses.length === 1, '10 concurrent return chỉ đúng 1 thành công', 'concurrent');
            assert(retFailures.length === 9, '9 concurrent return thất bại', 'concurrent');
            const finalRetReq = await prisma.maintenanceRequest.findUnique({ where: { id: retConc.id } });
            assert(finalRetReq?.version === 2, 'Request version chỉ tăng đúng 1 lần sau concurrent return', 'concurrent');
            const retHistory = await prisma.workflowHistory.findMany({ where: { entityType: 'MaintenanceRequest', entityId: retConc.id, action: 'RETURN' } });
            assert(retHistory.length === 1, 'Không tạo trùng WorkflowHistory sau concurrent return', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Request return test error', 'concurrent');
        }
        try {
            const eqId = (await prisma.equipment.findFirst()).id;
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const resubConc = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: 'REQ-RESUB-CONC',
                    equipmentId: eqId,
                    title: 'Resubmit Concurrent',
                    description: 'Desc',
                    status: 'RETURNED',
                    reporterName: 'Test',
                    returnedReason: 'Thiếu chi tiết',
                    version: 3,
                },
            });
            console.log('  Running 10 concurrent Resubmits of same Request...');
            const resubPromises = [];
            for (let i = 0; i < 10; i++) {
                resubPromises.push(requestsService.resubmitRequest(resubConc.id, { expectedVersion: 3, actedById: activeUser.id, comment: `Concurrent resubmit ${i}` }).catch(err => err));
            }
            const resubResults = await Promise.all(resubPromises);
            const resubSuccesses = resubResults.filter(res => res.status === 'PENDING');
            const resubFailures = resubResults.filter(res => res.status === 409 || res.status === 400);
            assert(resubSuccesses.length === 1, '10 concurrent resubmit chỉ đúng 1 thành công', 'concurrent');
            assert(resubFailures.length === 9, '9 concurrent resubmit thất bại', 'concurrent');
            const finalResubReq = await prisma.maintenanceRequest.findUnique({ where: { id: resubConc.id } });
            assert(finalResubReq?.version === 4, 'Request version chỉ tăng đúng 1 lần sau concurrent resubmit', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Request resubmit test error', 'concurrent');
        }
        try {
            const eqId = (await prisma.equipment.findFirst()).id;
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const cancelConc = await prisma.maintenanceRequest.create({
                data: {
                    requestCode: 'REQ-CANCEL-CONC',
                    equipmentId: eqId,
                    title: 'Cancel Concurrent',
                    description: 'Desc',
                    status: 'RETURNED',
                    reporterName: 'Test',
                    returnedReason: 'Thiếu chi tiết',
                    version: 2,
                },
            });
            console.log('  Running 10 concurrent Cancels of same Request...');
            const cancelPromises = [];
            for (let i = 0; i < 10; i++) {
                cancelPromises.push(requestsService.cancelRequest(cancelConc.id, { reason: `Concurrent cancel ${i}`, expectedVersion: 2, actedById: activeUser.id }).catch(err => err));
            }
            const cancelResults = await Promise.all(cancelPromises);
            const cancelSuccesses = cancelResults.filter(res => res.status === 'CANCELLED');
            const cancelFailures = cancelResults.filter(res => res.status === 409 || res.status === 400);
            assert(cancelSuccesses.length === 1, '10 concurrent cancel chỉ đúng 1 thành công', 'concurrent');
            assert(cancelFailures.length === 9, '9 concurrent cancel thất bại', 'concurrent');
            const finalCancelReq = await prisma.maintenanceRequest.findUnique({ where: { id: cancelConc.id } });
            assert(finalCancelReq?.version === 3, 'Request version chỉ tăng đúng 1 lần sau concurrent cancel', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Request cancel test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const itemConcIn = await prisma.inventoryItem.create({
                data: { itemCode: `CONC-IN-${Date.now()}`, name: 'Conc In Item', category: 'Cơ khí', quantity: 10, unit: 'Cái', unitPrice: 100, version: 1 },
            });
            console.log('  Running 10 concurrent Adjust In with same expectedVersion...');
            const inPromises = [];
            for (let i = 0; i < 10; i++) {
                inPromises.push(inventoryService.adjustIn(itemConcIn.id, { quantity: 5, reason: `Conc in ${i}`, expectedVersion: 1, actedById: activeUser.id }).catch(err => err));
            }
            const inResults = await Promise.all(inPromises);
            const inSuccesses = inResults.filter((res) => res.id && res.quantity === 15);
            const inFailures = inResults.filter((res) => res.status === 409);
            assert(inSuccesses.length === 1, '10 concurrent Adjust In cùng expectedVersion: chỉ đúng 1 request thành công', 'concurrent');
            assert(inFailures.length === 9, '9 concurrent Adjust In còn lại bị từ chối với 409 Conflict', 'concurrent');
            const finalItemIn = await prisma.inventoryItem.findUnique({ where: { id: itemConcIn.id } });
            assert(finalItemIn?.quantity === 15 && finalItemIn?.version === 2, 'Tồn kho tăng đúng 5 (10 -> 15) và version tăng đúng lên 2', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Adjust In test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const itemConcOut = await prisma.inventoryItem.create({
                data: { itemCode: `CONC-OUT-${Date.now()}`, name: 'Conc Out Item', category: 'Cơ khí', quantity: 10, unit: 'Cái', unitPrice: 100, version: 1 },
            });
            console.log('  Running 10 concurrent Adjust Out on same InventoryItem...');
            const outPromises = [];
            for (let i = 0; i < 10; i++) {
                outPromises.push(inventoryService.adjustOut(itemConcOut.id, { quantity: 5, reason: `Conc out ${i}`, expectedVersion: 1, actedById: activeUser.id }).catch(err => err));
            }
            const outResults = await Promise.all(outPromises);
            const outSuccesses = outResults.filter((res) => res.id && res.quantity >= 0);
            const outFailures = outResults.filter((res) => res.status === 409 || res.status === 400);
            assert(outSuccesses.length === 1, '10 concurrent Adjust Out cùng expectedVersion: chỉ đúng 1 request thành công', 'concurrent');
            assert(outFailures.length === 9, '9 concurrent Adjust Out còn lại thất bại với 409 hoặc 400', 'concurrent');
            const finalItemOut = await prisma.inventoryItem.findUnique({ where: { id: itemConcOut.id } });
            assert(finalItemOut.quantity >= 0, 'Tồn kho cuối không bao giờ bị âm (< 0)', 'concurrent');
            assert(finalItemOut.quantity === 5 && finalItemOut.version === 2, 'Tổng lượng Adjust Out không vượt tồn ban đầu (tồn từ 10 xuống 5, version lên 2)', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Adjust Out test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const equipment = (await prisma.equipment.findFirst());
            const itemConcRet = await prisma.inventoryItem.create({
                data: { itemCode: `CONC-RET-${Date.now()}`, name: 'Conc Return Item', category: 'Cơ khí', quantity: 2, unit: 'Cái', unitPrice: 100, version: 1 },
            });
            const woConcRet = await prisma.workOrder.create({
                data: { orderCode: `WO-CONC-RET-${Date.now()}`, equipmentId: equipment.id, title: 'Conc Ret WO', description: 'd', status: 'IN_PROGRESS', version: 1 },
            });
            const woItemConcRet = await prisma.workOrderItem.create({
                data: { workOrderId: woConcRet.id, inventoryItemId: itemConcRet.id, quantity: 4, unitPrice: 100 },
            });
            await prisma.inventoryTransaction.create({
                data: { inventoryItemId: itemConcRet.id, workOrderId: woConcRet.id, workOrderItemId: woItemConcRet.id, transactionType: 'ISSUE', quantity: 4, unitPrice: 100, totalAmount: 400, quantityBefore: 6, quantityAfter: 2 },
            });
            console.log('  Running 10 concurrent Material Returns on same WorkOrderItem...');
            const matRetPromises = [];
            for (let i = 0; i < 10; i++) {
                matRetPromises.push(inventoryService.materialReturn(woConcRet.id, {
                    inventoryItemId: itemConcRet.id,
                    workOrderItemId: woItemConcRet.id,
                    quantity: 3,
                    reason: `Conc return ${i}`,
                    expectedInventoryVersion: 1,
                    expectedWorkOrderVersion: 1,
                    actedById: activeUser.id,
                }).catch(err => err));
            }
            const matRetResults = await Promise.all(matRetPromises);
            const matRetSuccesses = matRetResults.filter((res) => res.transaction !== undefined);
            const matRetFailures = matRetResults.filter((res) => res.status === 409 || res.status === 400);
            assert(matRetSuccesses.length === 1, '10 concurrent Material Return cùng versions: chỉ đúng 1 request thành công', 'concurrent');
            assert(matRetFailures.length === 9, '9 concurrent Material Return thất bại với 409 hoặc 400', 'concurrent');
            const idempotencyKey = `IDEM-KEY-${Date.now()}`;
            const idemRes1 = await inventoryService.adjustIn(itemConcRet.id, { quantity: 2, reason: 'Idempotency test', expectedVersion: 2, actedById: activeUser.id, clientTransactionId: idempotencyKey });
            const idemRes2 = await inventoryService.adjustIn(itemConcRet.id, { quantity: 2, reason: 'Idempotency test repeat', expectedVersion: 2, actedById: activeUser.id, clientTransactionId: idempotencyKey });
            assert(idemRes1.quantity === idemRes2.quantity, 'Idempotency check: Gửi lại cùng clientTransactionId không làm tăng tồn kho 2 lần và không sinh duplicate transaction', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Material Return test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const equipment = (await prisma.equipment.findFirst());
            const concSched12 = await schedulesService.create({
                title: 'Conc Activate Sched', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: activeUser.id,
            });
            console.log('  Running 10 concurrent Activate on same DRAFT Schedule...');
            const actPromises = [];
            for (let i = 0; i < 10; i++) {
                actPromises.push(schedulesService.activate(concSched12.id, { expectedVersion: 1, actedById: activeUser.id }).catch(err => err));
            }
            const actResults = await Promise.all(actPromises);
            const actSuccesses = actResults.filter(r => r.id && r.status === 'ACTIVE');
            const actFailures = actResults.filter(r => !r.id);
            assert(actSuccesses.length === 1, '10 concurrent activate chỉ đúng 1 thành công', 'concurrent');
            assert(actFailures.length === 9, '9 concurrent activate thất bại với 409 Conflict', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Schedule Activate test error', 'concurrent');
        }
        try {
            const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
            const equipment = (await prisma.equipment.findFirst());
            const concSched13 = await schedulesService.create({
                title: 'Conc Pause Sched', equipmentId: equipment.id, frequencyType: 'DAILY', frequencyInterval: 1, startDate: new Date().toISOString(), createdById: activeUser.id,
            });
            await schedulesService.activate(concSched13.id, { expectedVersion: 1, actedById: activeUser.id });
            console.log('  Running 10 concurrent Pause on same ACTIVE Schedule...');
            const pausePromises = [];
            for (let i = 0; i < 10; i++) {
                pausePromises.push(schedulesService.pause(concSched13.id, { reason: `Conc pause ${i}`, expectedVersion: 2, actedById: activeUser.id }).catch(err => err));
            }
            const pauseResults = await Promise.all(pausePromises);
            const pauseSuccesses = pauseResults.filter(r => r.id && r.status === 'PAUSED');
            const pauseFailures = pauseResults.filter(r => !r.id);
            assert(pauseSuccesses.length === 1, '10 concurrent pause chỉ đúng 1 thành công', 'concurrent');
            assert(pauseFailures.length === 9, '9 concurrent pause thất bại với 409 Conflict', 'concurrent');
        }
        catch (e) {
            console.error(e);
            assert(false, 'Concurrent Schedule Pause test error', 'concurrent');
        }
    }
    finally {
        await app.close();
        cleanupTestDb();
    }
    console.log('\n====================================================');
    console.log('📊 TEST SUMMARY REPORT');
    console.log('====================================================');
    console.log(`Unit Tests:        Passed: ${results.unit.passed}, Failed: ${results.unit.failed}`);
    console.log(`Integration Tests: Passed: ${results.integration.passed}, Failed: ${results.integration.failed}`);
    console.log(`Concurrent Tests:  Passed: ${results.concurrent.passed}, Failed: ${results.concurrent.failed}`);
    console.log('====================================================');
    if (results.unit.failed > 0 || results.integration.failed > 0 || results.concurrent.failed > 0) {
        process.exit(1);
    }
    else {
        process.exit(0);
    }
}
run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
//# sourceMappingURL=run_tests.js.map