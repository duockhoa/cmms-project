/**
 * ==========================================================
 *  SCRIPT: Xử lý gộp và xóa triệt để tài khoản trùng của Lê Hoàng Cương
 * ==========================================================
 *  Chạy trên máy chủ: npx ts-node prisma/cleanup-cuong-duplicate.ts
 * ==========================================================
 */

export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Đang tìm các tài khoản của Lê Hoàng Cương trong cơ sở dữ liệu...\n');

  const cuongUsers = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Cương' } },
        { email: { contains: '0947' } },
        { email: { contains: 'hoangcuong' } },
        { id: '947' },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📋 Tìm thấy ${cuongUsers.length} tài khoản:`);
  for (const u of cuongUsers) {
    console.log(`  - ID: ${u.id} | Email: ${u.email} | Tên: ${u.name} | Role: ${u.role} | RoleId: ${u.roleId}`);
  }

  if (cuongUsers.length <= 1) {
    console.log('\n✅ Hệ thống chỉ có 1 tài khoản duy nhất, không bị trùng lặp!');
    return;
  }

  // Chọn tài khoản chuẩn (ưu tiên id: '947' hoặc tài khoản có email thật)
  const primary = cuongUsers.find((u: any) => u.id === '947' || u.email.includes('@gmail')) || cuongUsers[0];
  const duplicates = cuongUsers.filter((u: any) => u.id !== primary.id);

  console.log(`\n🎯 Tài khoản giữ lại (Primary): [${primary.id}] ${primary.email} - ${primary.name}`);
  console.log(`🗑️  Tài khoản sẽ xóa (Duplicates): ${duplicates.map((d: any) => `[${d.id}] ${d.email}`).join(', ')}\n`);

  // Lấy vai trò Quản trị viên
  const adminRole = await prisma.role.findFirst({ where: { name: 'Quản trị viên' } });

  for (const dup of duplicates) {
    console.log(`⏳ Đang chuyển toàn bộ dữ liệu từ [${dup.id}] sang [${primary.id}]...`);

    // 1. Đổi email tạm để tránh lỗi Unique constraint
    await prisma.user.update({
      where: { id: dup.id },
      data: { email: `merged_${dup.id}_${Date.now()}@temp.local` },
    });

    // 2. Chuyển giao tất cả quan hệ dữ liệu
    await prisma.maintenanceRequest.updateMany({ where: { reporterId: dup.id }, data: { reporterId: primary.id } });
    await prisma.maintenanceRequest.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
    await prisma.operationLog.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
    await prisma.operationLog.updateMany({ where: { voidedById: dup.id }, data: { voidedById: primary.id } });
    await prisma.utilityReading.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
    await prisma.utilitySystemStatusLog.updateMany({ where: { recordedById: dup.id }, data: { recordedById: primary.id } });
    await prisma.workOrder.updateMany({ where: { assignedTechnicianId: dup.id }, data: { assignedTechnicianId: primary.id } });
    await prisma.workOrder.updateMany({ where: { watcherId: dup.id }, data: { watcherId: primary.id } });
    await prisma.workOrder.updateMany({ where: { classificationReporterId: dup.id }, data: { classificationReporterId: primary.id } });
    await prisma.workOrderExecutionLog.updateMany({ where: { performedById: dup.id }, data: { performedById: primary.id } });
    await prisma.checklistExecution.updateMany({ where: { executedById: dup.id }, data: { executedById: primary.id } });
    await prisma.checklistExecution.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
    await prisma.maintenanceSchedule.updateMany({ where: { createdById: dup.id }, data: { createdById: primary.id } });
    await prisma.maintenanceSchedule.updateMany({ where: { assignedTechnicianId: dup.id }, data: { assignedTechnicianId: primary.id } });
    await prisma.maintenanceSchedule.updateMany({ where: { pausedById: dup.id }, data: { pausedById: primary.id } });
    await prisma.maintenanceSchedule.updateMany({ where: { cancelledById: dup.id }, data: { cancelledById: primary.id } });
    await prisma.workflowHistory.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
    await prisma.scheduleHistory.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
    await prisma.inventoryTransaction.updateMany({ where: { actedById: dup.id }, data: { actedById: primary.id } });
    await prisma.location.updateMany({ where: { responsibleTechId: dup.id }, data: { responsibleTechId: primary.id } });
    await prisma.attachment.updateMany({ where: { uploadedById: dup.id }, data: { uploadedById: primary.id } });

    // 3. Xóa tài khoản trùng
    await prisma.user.delete({ where: { id: dup.id } });
    console.log(`✅ Đã xóa thành công tài khoản trùng: [${dup.id}]`);
  }

  // 4. Cập nhật tài khoản chính với đầy đủ thông tin chuẩn và quyền ADMIN
  await prisma.user.update({
    where: { id: primary.id },
    data: {
      email: 'hoangcuong18971994@gmail.com',
      name: 'Lê Hoàng Cương',
      role: 'ADMIN',
      roleId: adminRole ? adminRole.id : primary.roleId,
      isActive: true,
    },
  });

  console.log(`\n🎉 HOÀN TẤT! Đã gộp và xóa sạch tài khoản trùng lặp.`);
  console.log(`Tài khoản duy nhất hiện tại: [${primary.id}] hoangcuong18971994@gmail.com - Lê Hoàng Cương (ADMIN)\n`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
