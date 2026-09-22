/**
 * ==========================================================
 *  SCRIPT: Tự động gán lại vai trò chuẩn cho tất cả User
 * ==========================================================
 *  Chạy sau khi đã chạy seed-roles.ts
 *  Lệnh chạy: npx ts-node prisma/assign-default-roles.ts
 * ==========================================================
 */

export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang kiểm tra và gán vai trò chuẩn cho người dùng...\n');

  // Lấy các vai trò chuẩn
  const adminRole = await prisma.role.findFirst({ where: { name: 'Quản trị viên' } });
  const managerRole = await prisma.role.findFirst({ where: { name: 'Quản lý' } });
  const techRole = await prisma.role.findFirst({ where: { name: 'Kỹ thuật viên' } });
  const userRole = await prisma.role.findFirst({ where: { name: 'Người dùng' } });

  if (!adminRole || !userRole) {
    console.error('❌ Chưa tìm thấy vai trò chuẩn. Vui lòng chạy "npx ts-node prisma/seed-roles.ts" trước!');
    return;
  }

  // 1. Gán Quản trị viên cho role ADMIN
  const updateAdmin = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { roleId: adminRole.id },
  });
  console.log(`✅ Đã gán vai trò [Quản trị viên] cho ${updateAdmin.count} tài khoản ADMIN.`);

  // 2. Gán Quản lý cho role MANAGER (nếu có)
  if (managerRole) {
    const updateManager = await prisma.user.updateMany({
      where: { role: 'MANAGER' },
      data: { roleId: managerRole.id },
    });
    console.log(`✅ Đã gán vai trò [Quản lý] cho ${updateManager.count} tài khoản MANAGER.`);
  }

  // 3. Gán Kỹ thuật viên cho role TECHNICIAN (nếu có)
  if (techRole) {
    const updateTech = await prisma.user.updateMany({
      where: { role: 'TECHNICIAN' },
      data: { roleId: techRole.id },
    });
    console.log(`✅ Đã gán vai trò [Kỹ thuật viên] cho ${updateTech.count} tài khoản TECHNICIAN.`);
  }

  // 4. Gán Người dùng cho tất cả user còn lại chưa có roleId
  const updateNormalUsers = await prisma.user.updateMany({
    where: { roleId: null },
    data: { roleId: userRole.id },
  });
  console.log(`✅ Đã gán vai trò [Người dùng] cho ${updateNormalUsers.count} tài khoản còn lại.`);

  console.log('\n🎉 Hoàn tất! Tất cả người dùng đã được gán vai trò tương ứng.');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
