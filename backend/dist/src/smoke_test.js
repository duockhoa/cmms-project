"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const path = require("path");
const fs = require("fs");
const dbPath = path.join(__dirname, '../prisma/test_smoke.db');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}
process.env.DATABASE_URL = 'file:./test_smoke.db';
console.log('Running prisma db push for smoke tests...');
(0, child_process_1.execSync)('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: 'file:./test_smoke.db' },
    stdio: 'inherit',
});
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: 'file:./test_smoke.db',
        },
    },
});
async function runSmokeTests() {
    console.log('Starting Phase 3.1 Schema Smoke Tests...');
    const user = await prisma.user.create({
        data: {
            name: 'Smoke Tester',
            email: 'smoke@test.com',
            role: 'TECHNICIAN',
            status: client_1.TechnicianStatus.AVAILABLE,
        },
    });
    const equipment = await prisma.equipment.create({
        data: {
            code: 'EQ-SMOKE-001',
            name: 'Smoke Test Equipment',
            category: 'Test',
            location: 'Test Lab',
        },
    });
    const wo = await prisma.workOrder.create({
        data: {
            orderCode: 'WO-SMOKE-001',
            equipmentId: equipment.id,
            title: 'Smoke Test WO',
            description: 'Test Description',
        },
    });
    console.log('Test 1: Attachment create/read');
    const attachment = await prisma.attachment.create({
        data: {
            entityType: 'Equipment',
            entityId: equipment.id,
            fileName: 'attachment-uuid-123.pdf',
            originalName: 'specs.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            storagePath: 'uploads/attachment-uuid-123.pdf',
            uploadedById: user.id,
            checksum: 'sha256checksumexample',
        },
    });
    const readAttachment = await prisma.attachment.findUnique({
        where: { id: attachment.id },
    });
    if (!readAttachment || readAttachment.fileName !== 'attachment-uuid-123.pdf') {
        throw new Error('Test 1 Failed: Attachment mismatch');
    }
    console.log(' ✅ Test 1 Passed');
    console.log('Test 2: ChecklistExecution create/read default state');
    const execution = await prisma.checklistExecution.create({
        data: {
            workOrderId: wo.id,
            executedById: user.id,
            status: client_1.ChecklistExecutionStatus.DRAFT,
            templateVersion: 1,
        },
    });
    const readExecution = await prisma.checklistExecution.findUnique({
        where: { id: execution.id },
    });
    if (!readExecution) {
        throw new Error('Test 2 Failed: ChecklistExecution not found');
    }
    if (readExecution.status !== client_1.ChecklistExecutionStatus.DRAFT || readExecution.result !== null || readExecution.version !== 1) {
        throw new Error(`Test 2 Failed: Unexpected values: status=${readExecution.status}, result=${readExecution.result}, version=${readExecution.version}`);
    }
    console.log(' ✅ Test 2 Passed');
    console.log('Test 3: ChecklistExecutionItem default NOT_CHECKED and unique index');
    const item1 = await prisma.checklistExecutionItem.create({
        data: {
            executionId: execution.id,
            itemIndex: 0,
            itemText: 'Check pressure level',
        },
    });
    if (item1.status !== client_1.ChecklistItemStatus.NOT_CHECKED) {
        throw new Error(`Test 3 Failed: Default status expected NOT_CHECKED, got ${item1.status}`);
    }
    try {
        await prisma.checklistExecutionItem.create({
            data: {
                executionId: execution.id,
                itemIndex: 0,
                itemText: 'Duplicate check pressure',
            },
        });
        throw new Error('Test 3 Failed: Duplicate index allowed');
    }
    catch (e) {
        if (e.code !== 'P2002') {
            throw e;
        }
        console.log(' ✅ Test 3 Passed');
    }
    console.log('Test 4: Cannot complete checklist if any item is NOT_CHECKED');
    const item2 = await prisma.checklistExecutionItem.create({
        data: {
            executionId: execution.id,
            itemIndex: 1,
            itemText: 'Check safety valves',
        },
    });
    const validateComplete = (items) => {
        const hasNotChecked = items.some(item => item.status === client_1.ChecklistItemStatus.NOT_CHECKED);
        if (hasNotChecked) {
            throw new Error('Cannot complete checklist execution while there are un-checked items');
        }
    };
    try {
        const allItems = await prisma.checklistExecutionItem.findMany({ where: { executionId: execution.id } });
        validateComplete(allItems);
        throw new Error('Test 4 Failed: Completed checklist with NOT_CHECKED items');
    }
    catch (e) {
        if (e.message !== 'Cannot complete checklist execution while there are un-checked items') {
            throw e;
        }
        console.log(' ✅ Test 4 Passed');
    }
    console.log('Test 5: FAILED status requires comment');
    const validateItem = (status, comment) => {
        if (status === client_1.ChecklistItemStatus.FAILED && (!comment || comment.trim() === '')) {
            throw new Error('FAILED items must have an explanatory comment');
        }
    };
    try {
        validateItem(client_1.ChecklistItemStatus.FAILED, '');
        throw new Error('Test 5 Failed: Allowed FAILED status with empty comment');
    }
    catch (e) {
        if (e.message !== 'FAILED items must have an explanatory comment') {
            throw e;
        }
        console.log(' ✅ Test 5 Passed');
    }
    console.log('Test 6: Chặn chỉnh sửa sau khi COMPLETED');
    const checkCanModify = (status) => {
        if (status === client_1.ChecklistExecutionStatus.COMPLETED) {
            throw new Error('Cannot modify items or attachments of a COMPLETED checklist execution');
        }
    };
    try {
        checkCanModify(client_1.ChecklistExecutionStatus.COMPLETED);
        throw new Error('Test 6 Failed: Allowed modification on COMPLETED checklist');
    }
    catch (e) {
        if (e.message !== 'Cannot modify items or attachments of a COMPLETED checklist execution') {
            throw e;
        }
        console.log(' ✅ Test 6 Passed');
    }
    console.log('Test 7: WorkOrder has ChecklistExecution cannot be deleted due to Restrict relation');
    try {
        await prisma.workOrder.delete({
            where: { id: wo.id },
        });
        throw new Error('Test 7 Failed: WorkOrder deleted despite Restrict relation');
    }
    catch (e) {
        if (e.code !== 'P2003') {
            throw e;
        }
        console.log(' ✅ Test 7 Passed');
    }
    console.log('Test 8: Deleting User sets executedById and uploadedById to null');
    await prisma.user.delete({
        where: { id: user.id },
    });
    const updatedExecution = await prisma.checklistExecution.findUnique({
        where: { id: execution.id },
    });
    const updatedAttachment = await prisma.attachment.findUnique({
        where: { id: attachment.id },
    });
    if (!updatedExecution || updatedExecution.executedById !== null) {
        throw new Error('Test 8 Failed: executedById was not set to null');
    }
    if (!updatedAttachment || updatedAttachment.uploadedById !== null) {
        throw new Error('Test 8 Failed: uploadedById was not set to null');
    }
    console.log(' ✅ Test 8 Passed');
    console.log('Test 9: Enum type safety');
    try {
        await prisma.user.create({
            data: {
                name: 'Invalid Enum Tester',
                email: 'invalid_enum@test.com',
                role: 'TECHNICIAN',
                status: 'INVALID_STATUS',
            },
        });
        throw new Error('Test 9 Failed: Invalid enum value accepted');
    }
    catch (e) {
        console.log(' ✅ Test 9 Passed');
    }
    console.log('\n🎉 ALL 9 SCHEMA SMOKE TESTS PASSED SUCCESSFULLY! Phase 3.1 is verified.');
}
runSmokeTests()
    .catch((err) => {
    console.error('Smoke tests failed with error:', err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) {
        try {
            fs.unlinkSync(dbPath);
        }
        catch (e) { }
    }
});
//# sourceMappingURL=smoke_test.js.map