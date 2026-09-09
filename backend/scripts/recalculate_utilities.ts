import { PrismaClient } from '@prisma/client';
import { UtilitiesService } from '../src/modules/utilities/utilities.service';

const prisma = new PrismaClient();
const service = new UtilitiesService(prisma as any);

async function main() {
  console.log('--- BẮT ĐẦU CHUẨN HÓA & TÍNH TOÁN LẠI SẢN LƯỢNG ĐIỆN NƯỚC TRÊN DATABASE ---');
  const res = await service.recalculateReadings();
  console.log('KẾT QUẢ:');
  console.log(JSON.stringify(res, null, 2));
  console.log('--- HOÀN TẤT THÀNH CÔNG ---');
}

main()
  .catch((err) => {
    console.error('LỖI KHI TÍNH TOÁN LẠI:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
