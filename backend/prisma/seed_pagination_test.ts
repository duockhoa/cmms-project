import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Seeding rich dynamic data for pagination, checklists, and inventory items...');

    // 1. Create a dummy test technician
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
    const equipmentIds: string[] = [];
    for (let i = 1; i <= 25; i++) {
      const code = `EQ-${i.toString().padStart(4, '0')}`;
      const eq = await prisma.equipment.upsert({
        where: { code },
        update: {},
        create: {
          code,
          name: `Thiết bị máy móc sản xuất chuyên dụng ${i}`,
          category: i % 2 === 0 ? 'Cơ khí' : 'Điện - Tự động hóa',
          status: i % 5 === 0 ? 'REPAIRING' : 'OPERATIONAL',
          location: `Xưởng sản xuất ${String.fromCharCode(65 + (i % 3))}`,
          serialNumber: `SN-REAL-${i.toString().padStart(6, '0')}`,
          purchaseDate: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
          warrantyPeriod: '24 tháng',
          specs: JSON.stringify({
            'Công suất': `${50 + i * 5} kW`,
            'Điện áp': '380V',
            'Tần số': '50Hz',
            'Trọng lượng': `${200 + i * 10} kg`
          })
        }
      });
      equipmentIds.push(eq.id);
    }

    // 3. Generate 25 Inventory Items
    console.log('Generating 25 real inventory items...');
    const inventoryIds: string[] = [];
    for (let i = 1; i <= 25; i++) {
      const code = `SP-REAL-${i.toString().padStart(4, '0')}`;
      const item = await prisma.inventoryItem.upsert({
        where: { itemCode: code },
        update: {},
        create: {
          itemCode: code,
          name: `Phụ tùng dự phòng cao cấp mã số ${i}`,
          category: i % 2 === 0 ? 'Cơ khí' : 'Điện',
          quantity: 15 + i,
          minQuantity: 5,
          unit: 'Cái',
          unitPrice: 100000 + i * 50000,
          location: `Kệ ${String.fromCharCode(65 + (i % 4))}-${i}`,
          isActive: true
        }
      });
      inventoryIds.push(item.id);
    }

    // 4. Generate 25 Work Orders with linked spare parts & checklists
    console.log('Generating 25 work orders with checklist and spare parts...');
    for (let i = 1; i <= 25; i++) {
      const orderCode = `WO-${i.toString().padStart(4, '0')}`;
      const eqId = equipmentIds[i % equipmentIds.length];
      const partId = inventoryIds[i % inventoryIds.length];

      // Create or update WorkOrder
      const wo = await prisma.workOrder.upsert({
        where: { orderCode },
        update: {},
        create: {
          orderCode,
          equipmentId: eqId,
          title: `Phiếu bảo trì bảo dưỡng định kỳ ${i}`,
          description: `Thực hiện kiểm tra bôi trơn định kỳ lần thứ ${i}`,
          priority: i % 4 === 0 ? 'HIGH' : 'MEDIUM',
          status: i % 3 === 0 ? 'COMPLETED' : 'IN_PROGRESS',
          technicianName: 'Nguyễn Văn Kỹ Thuật',
          plannedStartDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          plannedEndDate: new Date(Date.now() - (i - 1) * 24 * 60 * 60 * 1000),
          actualStartDate: i % 3 === 0 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000) : null,
          actualEndDate: i % 3 === 0 ? new Date(Date.now() - (i - 0.9) * 24 * 60 * 60 * 1000) : null,
          totalCost: i % 3 === 0 ? 500000 + i * 20000 : 0,
          version: 1
        }
      });

      // Create linked WorkOrderItem (Spare Parts link) if not exists
      const existingWOItem = await prisma.workOrderItem.findFirst({
        where: { workOrderId: wo.id, inventoryItemId: partId }
      });

      if (!existingWOItem) {
        await prisma.workOrderItem.create({
          data: {
            workOrderId: wo.id,
            inventoryItemId: partId,
            quantity: 2,
            unitPrice: 150000
          }
        });
      }

      // Create ChecklistExecution for this WorkOrder if not exists
      const existingChecklist = await prisma.checklistExecution.findFirst({
        where: { workOrderId: wo.id }
      });

      if (!existingChecklist) {
        const execution = await prisma.checklistExecution.create({
          data: {
            workOrderId: wo.id,
            status: i % 3 === 0 ? 'COMPLETED' : 'DRAFT',
            startedAt: new Date(),
            completedAt: i % 3 === 0 ? new Date() : null,
            executedById: tech.id
          }
        });

        // Add Checklist Items
        const checklistTasks = [
          'Kiểm tra rò rỉ dầu mỡ bôi trơn hệ thống truyền động',
          'Đo nhiệt độ vòng bi động cơ chính khi vận hành',
          'Vệ sinh lưới lọc khí và quạt tản nhiệt tủ điện điều khiển',
          'Kiểm tra lực siết các bulông bệ máy chính'
        ];

        for (let j = 0; j < checklistTasks.length; j++) {
          await prisma.checklistExecutionItem.create({
            data: {
              executionId: execution.id,
              itemIndex: j,
              itemText: checklistTasks[j],
              status: i % 3 === 0 ? 'PASSED' : 'NOT_CHECKED',
              comment: i % 3 === 0 ? 'Bình thường' : null
            }
          });
        }
      }
    }

    console.log('Successfully completed rich data seeding with Checklists and Spare parts.');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
