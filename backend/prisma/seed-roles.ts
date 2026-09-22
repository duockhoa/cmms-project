export {};
const { PrismaClient: PrismaClientReal } = require('@prisma/client');
const prisma = new PrismaClientReal();

async function main() {
  console.log('🔐 Đang tạo/cập nhật vai trò cơ bản...');

  // Vai trò "Cơ bản" — Dành cho nhân viên thông thường
  // Quyền: Xem thiết bị, xem/tạo sự cố, xem phiếu bảo trì, xem checklist, xem tiện ích, gửi góp ý
  const basicPermissions = [
    // Thiết bị - chỉ xem
    'equipment:view',
    'equipment:qr',
    // Yêu cầu sự cố - xem + tạo
    'requests:view',
    'requests:create',
    // Phiếu bảo trì - chỉ xem
    'work_orders:view',
    // Checklist - xem
    'checklists:view',
    // Tiện ích - xem
    'utilities:view',
    // Sổ vận hành - xem
    'operation_logs:view',
    // Kho - xem
    'inventory:view',
    // Lịch bảo trì - xem
    'schedules:view',
    // Báo cáo - xem
    'reports:view',
    // Góp ý - xem + tạo
    'feedbacks:view',
    'feedbacks:create',
  ];

  // Vai trò "Kỹ thuật viên" — Dành cho KTV bảo trì
  const techPermissions = [
    // Thiết bị
    'equipment:view',
    'equipment:qr',
    // Yêu cầu sự cố
    'requests:view',
    'requests:create',
    // Phiếu bảo trì
    'work_orders:view',
    'work_orders:execute',
    // Checklist
    'checklists:view',
    'checklists:execute',
    // Tiện ích
    'utilities:view',
    'utilities:record',
    'utilities:status_toggle',
    // Sổ vận hành
    'operation_logs:view',
    'operation_logs:create',
    // Kho
    'inventory:view',
    'inventory:out',
    // Lịch bảo trì
    'schedules:view',
    // Báo cáo
    'reports:view',
    // Góp ý
    'feedbacks:view',
    'feedbacks:create',
  ];

  // Vai trò "Quản lý xưởng" — Dành cho quản lý bộ phận
  const managerPermissions = [
    // Thiết bị
    'equipment:view',
    'equipment:create',
    'equipment:edit',
    'equipment:export',
    'equipment:qr',
    // Yêu cầu sự cố
    'requests:view',
    'requests:create',
    'requests:edit',
    'requests:approve',
    'requests:reject',
    'requests:cancel',
    // Phiếu bảo trì
    'work_orders:view',
    'work_orders:create',
    'work_orders:edit',
    'work_orders:assign',
    'work_orders:execute',
    'work_orders:close',
    'work_orders:cancel',
    // Checklist
    'checklists:view',
    'checklists:create',
    'checklists:edit',
    'checklists:execute',
    'checklists:approve',
    // Tiện ích
    'utilities:view',
    'utilities:record',
    'utilities:edit_reading',
    'utilities:status_toggle',
    'utilities:export',
    'utilities:manage_points',
    'utilities:baseline',
    // Sổ vận hành
    'operation_logs:view',
    'operation_logs:create',
    'operation_logs:edit',
    'operation_logs:export',
    // Kho
    'inventory:view',
    'inventory:create',
    'inventory:edit',
    'inventory:in',
    'inventory:out',
    'inventory:adjust',
    // Lịch bảo trì
    'schedules:view',
    'schedules:create',
    'schedules:edit',
    'schedules:pause_resume',
    // Báo cáo
    'reports:view',
    'reports:export',
    // Góp ý
    'feedbacks:view',
    'feedbacks:create',
    'feedbacks:reply',
    // Cài đặt
    'settings:view',
    'settings:users',
  ];

  // Vai trò "Quản trị viên" (ADMIN) — Toàn quyền hệ thống
  const adminPermissions = ['*']; // Wildcard = tự động expand sang tất cả quyền

  const rolesToCreate = [
    {
      name: 'Người dùng',
      description: 'USER — Vai trò mặc định cho nhân viên thông thường: chỉ xem thông tin và gửi báo cáo sự cố',
      permissions: basicPermissions,
    },
    {
      name: 'Kỹ thuật viên',
      description: 'TECHNICIAN — Vai trò cho kỹ thuật viên bảo trì: thực hiện sửa chữa, đi checklist, ghi chỉ số vận hành',
      permissions: techPermissions,
    },
    {
      name: 'Quản lý',
      description: 'MANAGER — Vai trò quản lý bộ phận: duyệt sự cố, phân công, nghiệm thu, quản lý kho & lịch bảo trì',
      permissions: managerPermissions,
    },
    {
      name: 'Quản trị viên',
      description: 'ADMIN — Toàn quyền hệ thống: quản lý người dùng, phân quyền, cấu hình hệ thống và tất cả module',
      permissions: adminPermissions,
    },
  ];

  for (const roleData of rolesToCreate) {
    const existing = await prisma.role.findFirst({
      where: { name: roleData.name },
    });

    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions),
          isActive: true,
        },
      });
      console.log(`✅ Đã cập nhật vai trò: ${roleData.name} (${roleData.permissions.length} quyền)`);
    } else {
      await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          permissions: JSON.stringify(roleData.permissions),
          isActive: true,
        },
      });
      console.log(`✅ Đã tạo mới vai trò: ${roleData.name} (${roleData.permissions.length} quyền)`);
    }
  }

  console.log('\n📋 Tổng kết các vai trò:');
  for (const r of rolesToCreate) {
    console.log(`   • ${r.name}: ${r.permissions.length} quyền — ${r.description}`);
  }
  console.log('\n🎉 Hoàn tất seed vai trò cơ bản!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed vai trò:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
