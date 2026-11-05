import { PrismaClient } from '@prisma/client';
import { effectivePermissionCodes, isGlobalAdmin } from '../src/common/utils/rbac.helper';

async function run() {
  const prisma = new PrismaClient();
  const beforeMigration = process.argv.includes('--before-migration');
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, hrmId: true, role: true, roleId: true, isActive: true, accessBlocked: !beforeMigration, hrmIsActive: !beforeMigration,
        department: true, managedDepartments: true, customPermissions: true,
        customRole: { select: { id: true, name: true, isActive: true, permissions: true } },
      },
      orderBy: { id: 'asc' },
    });
    console.log(JSON.stringify({
      readOnly: true,
      beforeMigration,
      generatedAt: new Date().toISOString(),
      totalUsers: users.length,
      users: users.map(user => ({
        id: user.id, hrmId: user.hrmId, role: user.role, roleId: user.roleId,
        roleActive: user.customRole?.isActive ?? null,
        isActive: user.isActive, accessBlocked: user.accessBlocked, hrmIsActive: user.hrmIsActive,
        department: user.department, managedDepartments: user.managedDepartments,
        globalAdmin: isGlobalAdmin(user), effectivePermissions: effectivePermissionCodes(user),
      })),
    }, null, 2));
  } finally { await prisma.$disconnect(); }
}

run().catch(() => { console.error('Không xuất được báo cáo quyền; kiểm tra kết nối CSDL và migration.'); process.exitCode = 1; });
