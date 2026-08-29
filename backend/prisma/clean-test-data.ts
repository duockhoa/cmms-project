export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('🧹 Bắt đầu dọn dẹp dữ liệu test trong Database...');

  // 1. Xóa các bản ghi liên quan đến Checklist Executions
  try {
    await prisma.checklistItemExecution.deleteMany({});
    console.log('✅ Đã xóa ChecklistItemExecution');
  } catch (e) {
    console.log('⚠️ Bỏ qua ChecklistItemExecution:', e.message);
  }

  try {
    await prisma.checklistExecution.deleteMany({});
    console.log('✅ Đã xóa ChecklistExecution');
  } catch (e) {
    console.log('⚠️ Bỏ qua ChecklistExecution:', e.message);
  }

  // 2. Xóa các bản ghi liên quan đến Work Order
  try {
    await prisma.workOrderExecutionLog.deleteMany({});
    console.log('✅ Đã xóa WorkOrderExecutionLog');
  } catch (e) {
    console.log('⚠️ Bỏ qua WorkOrderExecutionLog:', e.message);
  }

  try {
    await prisma.materialReturn.deleteMany({});
    console.log('✅ Đã xóa MaterialReturn');
  } catch (e) {
    console.log('⚠️ Bỏ qua MaterialReturn:', e.message);
  }

  try {
    await prisma.workOrderItem.deleteMany({});
    console.log('✅ Đã xóa WorkOrderItem');
  } catch (e) {
    console.log('⚠️ Bỏ qua WorkOrderItem:', e.message);
  }

  try {
    await prisma.workflowHistory.deleteMany({});
    console.log('✅ Đã xóa WorkflowHistory');
  } catch (e) {
    console.log('⚠️ Bỏ qua WorkflowHistory:', e.message);
  }

  try {
    await prisma.workOrder.deleteMany({});
    console.log('✅ Đã xóa WorkOrder');
  } catch (e) {
    console.log('⚠️ Bỏ qua WorkOrder:', e.message);
  }

  // 3. Xóa Maintenance Requests
  try {
    await prisma.maintenanceRequest.deleteMany({});
    console.log('✅ Đã xóa MaintenanceRequest');
  } catch (e) {
    console.log('⚠️ Bỏ qua MaintenanceRequest:', e.message);
  }

  // 4. Xóa Schedule Histories & Schedules
  try {
    await prisma.scheduleHistory.deleteMany({});
    console.log('✅ Đã xóa ScheduleHistory');
  } catch (e) {
    console.log('⚠️ Bỏ qua ScheduleHistory:', e.message);
  }

  try {
    await prisma.maintenanceSchedule.deleteMany({});
    console.log('✅ Đã xóa MaintenanceSchedule');
  } catch (e) {
    console.log('⚠️ Bỏ qua MaintenanceSchedule:', e.message);
  }

  // 5. Xóa Operation Logs test
  try {
    await prisma.operationLogValue.deleteMany({});
  } catch (e) {}

  try {
    await prisma.operationLog.deleteMany({});
    console.log('✅ Đã xóa OperationLog');
  } catch (e) {
    console.log('⚠️ Bỏ qua OperationLog:', e.message);
  }

  // 6. Xóa Inventory Transactions test
  try {
    await prisma.inventoryTransaction.deleteMany({});
    console.log('✅ Đã xóa InventoryTransaction');
  } catch (e) {
    console.log('⚠️ Bỏ qua InventoryTransaction:', e.message);
  }

  // 7. Reset toàn bộ 199 thiết bị về trạng thái OPERATIONAL (bình thường)
  try {
    const updated = await prisma.equipment.updateMany({
      data: {
        status: 'OPERATIONAL',
      }
    });
    console.log(`✅ Đã reset trạng thái của ${updated.count} thiết bị về OPERATIONAL`);
  } catch (e) {
    console.log('⚠️ Bỏ qua cập nhật Equipment:', e.message);
  }

  console.log('🎉 Hoàn tất dọn dẹp dữ liệu test!');
}

cleanTestData()
  .catch(e => {
    console.error('❌ Lỗi khi dọn dẹp:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
