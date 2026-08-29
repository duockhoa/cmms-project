export {};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STANDARD_PARAMETERS_DATA = [
  // 1. Nhiệt độ & Độ ẩm
  {
    name: 'Nhiệt độ tiệt trùng',
    unit: '°C',
    minSpec: 121.0,
    maxSpec: 125.0,
    description: 'Nhiệt độ buồng tiệt trùng nồi hấp / tủ sấy trong chu trình tiệt trùng chuẩn.',
    isActive: true,
  },
  {
    name: 'Nhiệt độ sấy chai lọ / dụng cụ',
    unit: '°C',
    minSpec: 160.0,
    maxSpec: 180.0,
    description: 'Nhiệt độ buồng sấy nhiệt độ cao để tiệt trùng và làm khô chai lọ, dụng cụ.',
    isActive: true,
  },
  {
    name: 'Nhiệt độ nước nóng tuần hoàn',
    unit: '°C',
    minSpec: 80.0,
    maxSpec: 85.0,
    description: 'Nhiệt độ nước nóng duy trì trong đường ống tuần hoàn hoặc tank gia nhiệt.',
    isActive: true,
  },
  {
    name: 'Nhiệt độ phòng sạch HVAC',
    unit: '°C',
    minSpec: 18.0,
    maxSpec: 24.0,
    description: 'Nhiệt độ môi trường phòng sản xuất theo tiêu chuẩn GMP-WHO.',
    isActive: true,
  },
  {
    name: 'Độ ẩm tương đối phòng sạch',
    unit: '%RH',
    minSpec: 45.0,
    maxSpec: 65.0,
    description: 'Độ ẩm không khí khu vực sản xuất thuốc và kiểm nghiệm.',
    isActive: true,
  },

  // 2. Áp suất & Chênh áp
  {
    name: 'Chênh áp phòng sạch (DP)',
    unit: 'Pa',
    minSpec: 10.0,
    maxSpec: 30.0,
    description: 'Độ chênh lệch áp suất tĩnh giữa phòng sạch và hành lang.',
    isActive: true,
  },
  {
    name: 'Áp suất buồng tiệt trùng',
    unit: 'Bar',
    minSpec: 1.1,
    maxSpec: 1.4,
    description: 'Áp suất hơi bão hòa trong chu trình tiệt trùng nồi hấp.',
    isActive: true,
  },
  {
    name: 'Áp lực khí nén nguồn',
    unit: 'Bar',
    minSpec: 6.0,
    maxSpec: 8.0,
    description: 'Áp suất khí nén cấp từ máy nén khí tới các line sản xuất.',
    isActive: true,
  },
  {
    name: 'Áp lực màng lọc RO',
    unit: 'Bar',
    minSpec: 8.0,
    maxSpec: 12.0,
    description: 'Áp suất nước cấp đầu vào màng lọc thẩm thấu ngược RO.',
    isActive: true,
  },

  // 3. Chất lượng nước & Hóa lý
  {
    name: 'Độ dẫn điện nước tinh khiết RO',
    unit: 'µS/cm',
    minSpec: 0.0,
    maxSpec: 1.3,
    description: 'Độ dẫn điện nước thành phẩm RO đạt tiêu chuẩn Dược điển Việt Nam.',
    isActive: true,
  },
  {
    name: 'Độ dẫn điện nước đầu vào RO',
    unit: 'µS/cm',
    minSpec: 0.0,
    maxSpec: 300.0,
    description: 'Độ dẫn điện nguồn nước thô trước khi qua hệ thống lọc tinh.',
    isActive: true,
  },
  {
    name: 'Độ pH dung dịch',
    unit: 'pH',
    minSpec: 5.5,
    maxSpec: 7.5,
    description: 'Độ pH dung dịch dược phẩm trong tank pha chế hoặc nước xả.',
    isActive: true,
  },
  {
    name: 'Lưu lượng nước thành phẩm RO',
    unit: 'm³/h',
    minSpec: 1.5,
    maxSpec: 2.5,
    description: 'Lưu lượng sản xuất nước tinh khiết của hệ thống RO trên mỗi giờ.',
    isActive: true,
  },

  // 4. Cơ khí, Động cơ & Vận hành
  {
    name: 'Tốc độ cánh khuấy / Trục trộn',
    unit: 'RPM',
    minSpec: 30.0,
    maxSpec: 120.0,
    description: 'Tốc độ vòng quay của cánh khuấy tank pha hoặc máy trộn lập phương.',
    isActive: true,
  },
  {
    name: 'Tốc độ chiết rót / Đóng gói',
    unit: 'SP/phút',
    minSpec: 30.0,
    maxSpec: 60.0,
    description: 'Năng suất đóng chai, vỉ hoặc túi sản phẩm trên mỗi phút.',
    isActive: true,
  },
  {
    name: 'Độ rung vòng bi động cơ',
    unit: 'mm/s',
    minSpec: 0.0,
    maxSpec: 4.5,
    description: 'Vận tốc rung hiệu dụng của gối đỡ ổ bi và động cơ chính.',
    isActive: true,
  },
  {
    name: 'Nhiệt độ thân động cơ / Vòng bi',
    unit: '°C',
    minSpec: 30.0,
    maxSpec: 70.0,
    description: 'Nhiệt độ bề mặt vỏ động cơ hoặc cụm gối bi khi hoạt động liên tục.',
    isActive: true,
  },
  {
    name: 'Dòng điện động cơ',
    unit: 'A',
    minSpec: 5.0,
    maxSpec: 25.0,
    description: 'Cường độ dòng điện làm việc định mức của động cơ chính.',
    isActive: true,
  },
  {
    name: 'Điện áp nguồn 3 pha',
    unit: 'V',
    minSpec: 360.0,
    maxSpec: 400.0,
    description: 'Điện áp cấp cho tủ điện phân phối của thiết bị.',
    isActive: true,
  },
  {
    name: 'Nồng độ khí Ozone khử khuẩn',
    unit: 'ppm',
    minSpec: 0.2,
    maxSpec: 0.5,
    description: 'Nồng độ khí ozone trong tủ tiệt trùng BHLĐ hoặc bồn chứa nước.',
    isActive: true,
  },
];

async function seedStandardParameters() {
  console.log('🚀 Đang nạp Thư viện thông số kỹ thuật / tham số vận hành chuẩn...');

  let count = 0;
  for (const item of STANDARD_PARAMETERS_DATA) {
    await prisma.standardParameter.upsert({
      where: { name: item.name },
      update: {
        unit: item.unit,
        minSpec: item.minSpec,
        maxSpec: item.maxSpec,
        description: item.description,
        isActive: item.isActive,
      },
      create: {
        name: item.name,
        unit: item.unit,
        minSpec: item.minSpec,
        maxSpec: item.maxSpec,
        description: item.description,
        isActive: item.isActive,
      },
    });
    count++;
  }

  console.log(`✅ Đã nạp thành công ${count} thông số kỹ thuật chuẩn vào Thư viện!`);
}

seedStandardParameters()
  .catch((e) => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
