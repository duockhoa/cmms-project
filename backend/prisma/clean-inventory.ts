export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInventory() {
  console.log('🧹 Bắt đầu dọn dẹp dữ liệu phụ tùng / tồn kho test...');

  try {
    const deletedTx = await prisma.inventoryTransaction.deleteMany({});
    console.log(`✅ Đã xóa ${deletedTx.count} giao dịch xuất/nhập/điều chỉnh tồn kho (InventoryTransaction)`);
  } catch (e) {
    console.error('⚠️ Lỗi xóa InventoryTransaction:', e.message);
  }

  try {
    const deletedWorkItems = await prisma.workOrderItem.deleteMany({});
    console.log(`✅ Đã xóa ${deletedWorkItems.count} phụ tùng trong WorkOrder (WorkOrderItem)`);
  } catch (e) {
    console.error('⚠️ Lỗi xóa WorkOrderItem:', e.message);
  }

  try {
    const deletedItems = await prisma.inventoryItem.deleteMany({});
    console.log(`✅ Đã xóa sạch ${deletedItems.count} phụ tùng test (InventoryItem)`);
  } catch (e) {
    console.error('⚠️ Lỗi xóa InventoryItem:', e.message);
  }

  console.log('🎉 Hoàn tất làm sạch dữ liệu phụ tùng!');
}

cleanInventory()
  .catch((e) => {
    console.error('❌ Lỗi khi dọn dẹp:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
