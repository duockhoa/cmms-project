/**
 * ==========================================================
 *  SCRIPT: Xóa toàn bộ vai trò cũ (chạy trên Production)
 * ==========================================================
 *  Mục đích: Dọn dẹp tất cả vai trò RBAC cũ trước khi
 *            chạy seed-roles.ts tạo vai trò mới chuẩn.
 * 
 *  Quy trình:
 *    1. Liệt kê tất cả vai trò hiện có
 *    2. Gỡ gán vai trò khỏi tất cả user (roleId → null)
 *    3. Xóa toàn bộ vai trò
 * 
 *  Cách chạy trên server production:
 *    npx ts-node prisma/cleanup-roles-production.ts
 * 
 *  Sau khi chạy xong, tiếp tục chạy:
 *    npx ts-node prisma/seed-roles.ts
 * ==========================================================
 */

export {};
const { PrismaClient: PrismaClientReal } = require('@prisma/client');
const prisma = new PrismaClientReal();

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  🗑️  XÓA TOÀN BỘ VAI TRÒ CŨ (PRODUCTION)       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // ── Bước 1: Liệt kê vai trò hiện có ──
  const existingRoles = await prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { users: true } },
    },
  });

  if (existingRoles.length === 0) {
    console.log('✅ Không có vai trò nào trong DB. Không cần dọn dẹp.');
    return;
  }

  console.log(`📋 Tìm thấy ${existingRoles.length} vai trò trong hệ thống:\n`);
  console.log('  #  | Vai trò                                           | Users | ID');
  console.log('  ---|------------------------------------------------------|-------|------------------------------------');

  let totalAffectedUsers = 0;
  for (let i = 0; i < existingRoles.length; i++) {
    const r = existingRoles[i];
    const roleName = r.name.padEnd(52);
    const userCount = String(r._count.users).padStart(5);
    console.log(`  ${String(i + 1).padStart(2)} | ${roleName} | ${userCount} | ${r.id}`);
    totalAffectedUsers += r._count.users;
  }

  console.log('  ---|------------------------------------------------------|-------|------------------------------------');
  console.log(`  Tổng users bị ảnh hưởng: ${totalAffectedUsers}`);
  console.log('');

  // ── Bước 2: Gỡ gán vai trò khỏi tất cả user ──
  if (totalAffectedUsers > 0) {
    console.log(`⚠️  Đang gỡ gán vai trò khỏi ${totalAffectedUsers} người dùng (roleId → null)...`);

    const unassignResult = await prisma.user.updateMany({
      where: {
        roleId: { not: null },
      },
      data: {
        roleId: null,
      },
    });

    console.log(`✅ Đã gỡ gán ${unassignResult.count} người dùng khỏi vai trò cũ.`);
  } else {
    console.log('ℹ️  Không có user nào đang gán vai trò.');
  }

  // ── Bước 3: Xóa toàn bộ vai trò ──
  console.log(`\n🗑️  Đang xóa ${existingRoles.length} vai trò...`);

  let deletedCount = 0;
  const errors: string[] = [];

  for (const role of existingRoles) {
    try {
      await prisma.role.delete({ where: { id: role.id } });
      console.log(`   ✓ Đã xóa: "${role.name}"`);
      deletedCount++;
    } catch (err: any) {
      const msg = `   ✗ Lỗi xóa "${role.name}": ${err?.message || err}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // ── Tổng kết ──
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log(`📊 KẾT QUẢ:`);
  console.log(`   • Vai trò đã xóa:       ${deletedCount}/${existingRoles.length}`);
  console.log(`   • Users đã gỡ gán:      ${totalAffectedUsers}`);
  if (errors.length > 0) {
    console.log(`   • Lỗi:                  ${errors.length}`);
  }
  console.log('══════════════════════════════════════════════════');
  console.log('');

  if (errors.length === 0) {
    console.log('🎉 Dọn dẹp hoàn tất! Tiếp tục chạy:');
    console.log('   npx ts-node prisma/seed-roles.ts');
  } else {
    console.log('⚠️  Có lỗi xảy ra, vui lòng kiểm tra log ở trên.');
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi nghiêm trọng:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
