export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTestEquipment() {
  console.log('🔍 Đang quét danh sách thiết bị...');
  
  // Tìm tất cả thiết bị không phải mã chuẩn DKPharma (TBSX...)
  const testEquipments = await prisma.equipment.findMany({
    where: {
      NOT: {
        code: {
          startsWith: 'TBSX',
        },
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  console.log(`📋 Tìm thấy ${testEquipments.length} thiết bị test cần xóa:`);
  testEquipments.forEach(eq => console.log(`   - [${eq.code}] ${eq.name}`));

  if (testEquipments.length > 0) {
    const ids = testEquipments.map(e => e.id);
    
    // Xóa các liên kết trước nếu có
    await prisma.equipmentParameter.deleteMany({
      where: { equipmentId: { in: ids } },
    });
    
    await prisma.maintenanceRequest.deleteMany({
      where: { equipmentId: { in: ids } },
    });
    
    await prisma.workOrder.deleteMany({
      where: { equipmentId: { in: ids } },
    });

    const deleted = await prisma.equipment.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    console.log(`✅ Đã xóa thành công ${deleted.count} thiết bị test.`);
  }

  const remaining = await prisma.equipment.count();
  console.log(`🏭 Tổng số thiết bị DKPharma thực tế còn lại trong Database: ${remaining}`);
}

cleanTestEquipment()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
