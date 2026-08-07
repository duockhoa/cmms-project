import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Settings ONLY...');

  // 1. System Settings
  const settingCount = await prisma.systemSetting.count();
  if (settingCount === 0) {
    await prisma.systemSetting.createMany({
      data: [
        { key: 'WARNING_LEAD_DAYS', value: '7' },
        { key: 'COMPANY_NAME', value: 'Công ty Cổ phần Dược Khoa' },
        { key: 'SYSTEM_ABBREVIATION', value: 'DKPHARMA-CMMS' },
      ],
    });
    console.log('✔ System Settings seeded.');
  } else {
    console.log('• System Settings already populated.');
  }

  // 2. Equipment Categories
  const categoryCount = await prisma.equipmentCategory.count();
  if (categoryCount === 0) {
    await prisma.equipmentCategory.createMany({
      data: [
        { code: 'COKHI', name: 'Cơ khí', description: 'Các thiết bị truyền động cơ học, bồn khuấy, máy nén...' },
        { code: 'DIEN', name: 'Điện', description: 'Hệ thống điện động lực, tủ phân phối, biến áp...' },
        { code: 'TUDONG', name: 'Điện - Tự động hóa', description: 'Các hệ thống điều khiển PLC, SCADA, cảm biến...' },
        { code: 'SANXUAT', name: 'Sản xuất', description: 'Dây chuyền bao phim, máy ép vỉ, máy đóng tuýp...' },
      ],
    });
    console.log('✔ Equipment Categories seeded.');
  } else {
    console.log('• Equipment Categories already populated.');
  }

  // 3. Locations
  const locationCount = await prisma.location.count();
  if (locationCount === 0) {
    await prisma.location.createMany({
      data: [
        { code: 'XUONG_A', name: 'Xưởng sản xuất A', description: 'Khu vực chính chế biến dược liệu' },
        { code: 'XUONG_B', name: 'Xưởng sản xuất B', description: 'Khu vực đóng gói và dán nhãn thành phẩm' },
        { code: 'PHONG_SACH', name: 'Phòng sạch cấp độ D', description: 'Khu vực pha chế và vô trùng' },
        { code: 'KHO_KHO', name: 'Kho nguyên liệu khô', description: 'Nơi lưu kho bao bì, phụ liệu' },
      ],
    });
    console.log('✔ Locations seeded.');
  } else {
    console.log('• Locations already populated.');
  }

  // 4. Production Lines
  const lineCount = await prisma.productionLine.count();
  if (lineCount === 0) {
    await prisma.productionLine.createMany({
      data: [
        { code: 'DC_NANG', name: 'Dây chuyền viên nang', description: 'Hệ thống đóng nang tự động' },
        { code: 'DC_NEN', name: 'Dây chuyền viên nén', description: 'Máy dập viên và bao phim xoay tròn' },
        { code: 'DC_DONGGOI', name: 'Dây chuyền đóng gói', description: 'Máy ép vỉ nhôm-nhôm, nhôm-pvc' },
      ],
    });
    console.log('✔ Production Lines seeded.');
  } else {
    console.log('• Production Lines already populated.');
  }

  console.log('✅ Settings seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
