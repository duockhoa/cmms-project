import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Seeding real data for pagination and testing into dev.db...');

    // 1. Create a dummy test technician if not exists
    const tech = await prisma.user.upsert({
      where: { email: 'tech-demo@company.com' },
      update: {},
      create: {
        id: 'tech-demo-id',
        name: 'Nguyễn Văn Kỹ Thuật',
        email: 'tech-demo@company.com',
        role: 'TECHNICIAN',
        status: 'AVAILABLE',
        isActive: true
      }
    });

    // 2. Generate 25 Equipment records
    console.log('Generating 25 real equipment records...');
    for (let i = 1; i <= 25; i++) {
      const code = `EQ-${i.toString().padStart(4, '0')}`;
      await prisma.equipment.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `Thiết bị máy móc sản xuất chuyên dụng ${i}`,
          category: i % 2 === 0 ? 'Cơ khí' : 'Điện - Tự động hóa',
          status: i % 5 === 0 ? 'REPAIRING' : 'OPERATIONAL',
          location: `Xưởng sản xuất ${String.fromCharCode(65 + (i % 3))}`,
          serialNumber: `SN-REAL-${i.toString().padStart(6, '0')}`,
          purchaseDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000), // different dates
          warrantyPeriod: '24 tháng',
          specs: JSON.stringify({
            'Công suất': `${50 + i * 5} kW`,
            'Điện áp': '380V',
            'Tần số': '50Hz',
            'Trọng lượng': `${200 + i * 10} kg`
          })
        }
      });
    }

    // 3. Generate some spare parts
    console.log('Generating real inventory spare parts...');
    const parts = [
      { name: 'Vòng bi SKF 6204', code: 'SP-SKF-6204', price: 240000 },
      { name: 'Dây curoa đai răng Mitsuba', code: 'SP-MIT-B52', price: 150000 },
      { name: 'Dầu bôi trơn Roto-Inject Atlas Copco', code: 'SP-OIL-ROT', price: 1800000 },
      { name: 'Van khí nén Festo 5/2', code: 'SP-VAL-FES', price: 950000 },
      { name: 'Cảm biến tiệm cận Omron', code: 'SP-SEN-OMR', price: 420000 }
    ];

    for (const part of parts) {
      await prisma.inventoryItem.upsert({
        where: { itemCode: part.code },
        update: {},
        create: {
          itemCode: part.code,
          name: part.name,
          category: 'Cơ khí',
          quantity: 20,
          minQuantity: 5,
          unit: 'Cái',
          unitPrice: part.price,
          location: 'Kho bảo trì chính',
          isActive: true
        }
      });
    }

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
