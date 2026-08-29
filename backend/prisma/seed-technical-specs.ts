export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_TECH_SPECS_DATA = [
  {
    name: 'Công suất động cơ chính',
    unit: 'kW',
    category: 'Điện - Động cơ',
    description: 'Công suất làm việc định mức của động cơ chính từ nhà sản xuất.',
  },
  {
    name: 'Điện áp nguồn định mức',
    unit: 'V',
    category: 'Điện',
    description: 'Điện áp cấp định mức (380V - 3 Pha hoặc 220V - 1 Pha).',
  },
  {
    name: 'Tần số nguồn điện',
    unit: 'Hz',
    category: 'Điện',
    description: 'Tần số lưới điện làm việc (50Hz / 60Hz).',
  },
  {
    name: 'Dung tích hữu ích tank / buồng',
    unit: 'Lít',
    category: 'Dung tích',
    description: 'Thể tích làm việc thực tế của bồn pha chế / buồng tiệt trùng.',
  },
  {
    name: 'Kích thước bao máy (D x R x C)',
    unit: 'mm',
    category: 'Kích thước',
    description: 'Kích thước tổng thể phủ bì: Dài x Rộng x Cao của thiết bị.',
  },
  {
    name: 'Trọng lượng máy',
    unit: 'kg',
    category: 'Cơ khí',
    description: 'Khối lượng bản thân của thiết bị khi chưa nạp tải.',
  },
  {
    name: 'Áp suất thiết kế tối đa',
    unit: 'Bar',
    category: 'Áp lực',
    description: 'Áp suất làm việc tối đa cho phép theo hồ sơ kiểm định an toàn.',
  },
  {
    name: 'Nhiệt độ thiết kế tối đa',
    unit: '°C',
    category: 'Nhiệt độ',
    description: 'Nhiệt độ giới hạn tối đa cho phép của thân vỏ / buồng gia nhiệt.',
  },
  {
    name: 'Lưu lượng định mức',
    unit: 'm³/h',
    category: 'Lưu lượng',
    description: 'Lưu lượng bơm / cấp nước / xử lý định mức từ catalogue NSX.',
  },
  {
    name: 'Tốc độ quay định mức',
    unit: 'RPM',
    category: 'Cơ khí',
    description: 'Tốc độ vòng quay trục động cơ ở tần số chuẩn.',
  },
  {
    name: 'Vật liệu tiếp xúc sản phẩm',
    unit: 'Mác thép',
    category: 'Vật liệu',
    description: 'Vật liệu các bộ phận tiếp xúc trực tiếp với thuốc (Inox 316L, Silicon y tế...).',
  },
  {
    name: 'Cấp bảo vệ chống bụi / nước',
    unit: 'IP',
    category: 'Điện',
    description: 'Cấp bảo vệ của tủ điều khiển và động cơ (IP54, IP55, IP65...).',
  },
  {
    name: 'Áp lực khí nén yêu cầu',
    unit: 'Bar',
    category: 'Khí nén',
    description: 'Áp suất khí nén cấp vào máy tối thiểu để các cơ cấu chấp hành hoạt động.',
  },
  {
    name: 'Mức tiêu hao khí nén',
    unit: 'Lít/phút',
    category: 'Khí nén',
    description: 'Lưu lượng khí nén tiêu hao ở công suất tối đa.',
  },
];

async function seedTechnicalSpecs() {
  console.log('🚀 Đang nạp Thư viện Thông số Kỹ thuật chuẩn từ NSX...');
  let count = 0;
  for (const item of STANDARD_TECH_SPECS_DATA) {
    await prisma.standardTechnicalSpec.upsert({
      where: { name: item.name },
      update: {
        unit: item.unit,
        category: item.category,
        description: item.description,
        isActive: true,
      },
      create: {
        name: item.name,
        unit: item.unit,
        category: item.category,
        description: item.description,
        isActive: true,
      },
    });
    count++;
  }
  console.log(`✅ Đã nạp thành công ${count} thông số kỹ thuật chuẩn từ NSX vào Thư viện!`);
}

seedTechnicalSpecs()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
