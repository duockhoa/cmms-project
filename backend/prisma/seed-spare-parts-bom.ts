import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper detect category based on part name
function detectCategory(partName: string, specs: string): string {
  const combined = (partName + ' ' + specs).toLowerCase();
  if (combined.includes('cảm biến') || combined.includes('sensor') || combined.includes('tiệm cận') || combined.includes('quang')) {
    return 'Cảm biến';
  }
  if (combined.includes('rơ le') || combined.includes('relay') || combined.includes('contactor') || combined.includes('khởi động từ') || combined.includes('nguồn') || combined.includes('aptomat') || combined.includes('cầu chì') || combined.includes('biến tần') || combined.includes('tụ điện') || combined.includes('điện trở')) {
    return 'Linh kiện điện';
  }
  if (combined.includes('van') || combined.includes('khí nén') || combined.includes('xi lanh') || combined.includes('chân không') || combined.includes('điều áp') || combined.includes('co nối') || combined.includes('ống khí')) {
    return 'Khí nén & Thủy lực';
  }
  if (combined.includes('vòng bi') || combined.includes('bạc đạn') || combined.includes('gối đỡ')) {
    return 'Vòng bi & Bạc đạn';
  }
  if (combined.includes('gioăng') || combined.includes('phớt') || combined.includes('seal') || combined.includes('silicon')) {
    return 'Gioăng phớt & Làm kín';
  }
  if (combined.includes('dây curoa') || combined.includes('xích') || combined.includes('nhông') || combined.includes('khớp nối') || combined.includes('bánh răng') || combined.includes('dao') || combined.includes('lưới')) {
    return 'Cơ khí & Truyền động';
  }
  return 'Linh kiện tiêu hao';
}

async function main() {
  console.log('🚀 [SEED] Bắt đầu Import Danh mục Phụ tùng & BOM Thiết bị...');

  const jsonPath = path.join(__dirname, 'data', 'spare_parts_bom.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Không tìm thấy tệp dữ liệu: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const items: any[] = JSON.parse(rawData);
  console.log(`📦 Đã đọc ${items.length} bản ghi linh kiện từ tệp JSON.`);

  // 1. Kiểm tra hoặc tạo thiết bị 'Máy hàn túi nhôm' (EQ-0186) nếu chưa tồn tại
  let naEquipment = await prisma.equipment.findFirst({
    where: {
      OR: [
        { code: 'EQ-0186' },
        { name: { contains: 'Máy hàn túi nhôm' } },
      ],
    },
  });

  if (!naEquipment) {
    console.log('➕ Khởi tạo thiết bị mới: [EQ-0186] Máy hàn túi nhôm...');
    naEquipment = await prisma.equipment.create({
      data: {
        code: 'EQ-0186',
        name: 'Máy hàn túi nhôm',
        category: 'Thiết bị',
        location: 'Xưởng Hoàn thiện',
        department: 'Sản xuất',
        status: 'OPERATIONAL',
        notes: 'Thiết bị tự động bổ sung từ danh mục linh kiện sửa chữa bảo dưỡng',
      },
    });
  }

  // Lấy toàn bộ thiết bị trong DB để map code -> equipment
  const allEquipments = await prisma.equipment.findMany();
  const eqMapByCode = new Map<string, any>();
  const eqMapByName = new Map<string, any>();

  for (const eq of allEquipments) {
    eqMapByCode.set(eq.code.trim().toUpperCase(), eq);
    eqMapByName.set(eq.name.trim().toLowerCase(), eq);
  }

  // 2. Import & Deduplicate vào InventoryItem
  let createdPartsCount = 0;
  let linkedBomCount = 0;

  for (const item of items) {
    // Xác định thiết bị tương ứng
    let targetEq: any = null;
    const rawEqCode = (item.equipmentCode || '').trim().toUpperCase();
    const rawEqName = (item.equipmentName || '').trim().toLowerCase();

    if (rawEqCode === 'NA' || !rawEqCode) {
      targetEq = naEquipment;
    } else if (eqMapByCode.has(rawEqCode)) {
      targetEq = eqMapByCode.get(rawEqCode);
    } else if (eqMapByName.has(rawEqName)) {
      targetEq = eqMapByName.get(rawEqName);
    }

    if (!targetEq) {
      console.warn(`⚠️ Không tìm thấy thiết bị cho mã: "${item.equipmentCode}" (${item.equipmentName}) - Bỏ qua.`);
      continue;
    }

    const cleanPartName = (item.partName || '').trim();
    const cleanSpecs = (item.specs || '').trim();
    const detectedCat = detectCategory(cleanPartName, cleanSpecs);
    const stockQty = Math.max(0, parseInt(item.stockQuantity, 10) || 0);
    const minQty = Math.max(1, parseInt(item.minQuantity, 10) || 1);
    const qtyPerEq = Math.max(1, parseInt(item.quantityPerEquipment, 10) || 1);

    // Tìm kiếm trong InventoryItem xem đã tồn tại linh kiện có cùng Tên và Thông số chưa
    let existingPart = await prisma.inventoryItem.findFirst({
      where: {
        name: cleanPartName,
        specs: cleanSpecs ? cleanSpecs : null,
      },
    });

    if (!existingPart) {
      // Sinh mã VT tự động
      const currentCount = await prisma.inventoryItem.count();
      const itemCode = `VT-${(currentCount + 1).toString().padStart(4, '0')}`;

      existingPart = await prisma.inventoryItem.create({
        data: {
          itemCode,
          name: cleanPartName,
          specs: cleanSpecs || undefined,
          category: detectedCat,
          unit: 'Cái',
          quantity: stockQty,
          minQuantity: minQty,
          unitPrice: 0,
          location: 'Kho Cơ điện',
          isActive: true,
        },
      });
      createdPartsCount++;
    } else {
      // Nếu đã có -> Cộng dồn tồn kho và cập nhật dự trù an toàn cao nhất
      if (stockQty > 0 || minQty > existingPart.minQuantity) {
        existingPart = await prisma.inventoryItem.update({
          where: { id: existingPart.id },
          data: {
            quantity: { increment: stockQty },
            minQuantity: Math.max(existingPart.minQuantity, minQty),
          },
        });
      }
    }

    // 3. Tạo liên kết BOM vào EquipmentSparePart (tránh trùng)
    const existingBom = await prisma.equipmentSparePart.findFirst({
      where: {
        equipmentId: targetEq.id,
        sparePartId: existingPart.id,
        role: item.role ? item.role.trim() : null,
      },
    });

    if (!existingBom) {
      await prisma.equipmentSparePart.create({
        data: {
          equipmentId: targetEq.id,
          sparePartId: existingPart.id,
          role: item.role ? item.role.trim() : undefined,
          quantityPerEquipment: qtyPerEq,
          notes: item.notes ? item.notes.trim() : undefined,
        },
      });
      linkedBomCount++;
    }
  }

  const finalInventoryTotal = await prisma.inventoryItem.count();
  const finalBomTotal = await prisma.equipmentSparePart.count();

  console.log('\n=============================================');
  console.log('✅ [HOÀN TẤT SEEDING PHỤ TÙNG & BOM]');
  console.log(`- Linh kiện mới tạo trong kho: ${createdPartsCount}`);
  console.log(`- Tổng số vật tư trong kho hiện tại: ${finalInventoryTotal}`);
  console.log(`- Mối liên kết linh kiện vào thiết bị (BOM) đã tạo: ${linkedBomCount}`);
  console.log(`- Tổng số liên kết BOM hiện tại: ${finalBomTotal}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
