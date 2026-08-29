export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: {
      role: 'USER',
    },
  });
  console.log(`✅ Đã cập nhật ${result.count} người dùng về vai trò mặc định là USER.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
