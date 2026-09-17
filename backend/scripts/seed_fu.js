const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.functionalUnitLibrary.count();
  if (count === 0) {
    const defaultUnits = [
      { name: 'Cụm cấp phôi / nạp liệu', category: 'Cơ khí', code: 'FU-FEED', description: 'Bộ phận cấp nạp chai, lọ, bao bì hoặc nguyên liệu đầu vào' },
      { name: 'Cụm băng tải truyền động', category: 'Cơ khí', code: 'FU-CONV', description: 'Hệ thống băng tải xích/dây đai và motor giảm tốc' },
      { name: 'Cụm bơm áp lực & cấp nước', category: 'Thủy lực', code: 'FU-PUMP', description: 'Hệ thống bơm cao áp, đường ống và van điều khiển áp lực' },
      { name: 'Cụm vòi phun & kim rửa', category: 'Cơ khí', code: 'FU-NOZZLE', description: 'Dàn kim phun, đầu vòi rửa áp lực và chuyển động tịnh tiến' },
      { name: 'Cụm sấy vô trùng & thổi khí', category: 'Khí nén', code: 'FU-AIR', description: 'Buồng gia nhiệt, màng lọc HEPA và quạt thổi khí tiệt trùng' },
      { name: 'Cụm chiết rót & định lượng', category: 'Cơ khí', code: 'FU-FILL', description: 'Piston xilanh định lượng hoặc bơm nhu động chiết dịch' },
      { name: 'Cụm đóng nắp / dập nút', category: 'Cơ khí', code: 'FU-CAP', description: 'Đầu xoáy nắp, mâm rung cấp nút và trục ép nắp' },
      { name: 'Cụm tủ điện điều khiển & PLC', category: 'Điện - Tự động hóa', code: 'FU-ELEC', description: 'Bộ điều khiển PLC, màn hình HMI, biến tần và rơ le an toàn' },
    ];
    for (const u of defaultUnits) {
      await prisma.functionalUnitLibrary.create({ data: u });
    }
    console.log('Seeded', defaultUnits.length, 'default functional units to library.');
  } else {
    console.log('Library already has', count, 'functional units.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
