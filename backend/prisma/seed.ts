import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean DB
  await prisma.workOrderItem.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const userAdmin = await prisma.user.create({
    data: {
      name: 'Nguyễn Văn Quản Trị',
      email: 'admin@company.com',
      role: 'ADMIN',
      department: 'Phòng Công nghệ & Bảo trì',
    },
  });

  const userTech = await prisma.user.create({
    data: {
      name: 'Trần Văn Kỹ Thuật',
      email: 'tech@company.com',
      role: 'TECHNICIAN',
      department: 'Tổ Bảo trì Xưởng A',
    },
  });

  // Create Inventory
  const inv1 = await prisma.inventoryItem.create({
    data: {
      itemCode: 'VT-0001',
      name: 'Vòng bi SKF 6205-2RS',
      category: 'Cơ khí',
      quantity: 25,
      unit: 'Cái',
      minQuantity: 5,
      unitPrice: 180000,
      location: 'Kệ A-01',
    },
  });

  const inv2 = await prisma.inventoryItem.create({
    data: {
      itemCode: 'VT-0002',
      name: 'Dầu máy nén khí Shell Corena S3 R46',
      category: 'Dầu mỡ',
      quantity: 60,
      unit: 'Lít',
      minQuantity: 20,
      unitPrice: 120000,
      location: 'Kho Dầu',
    },
  });

  const inv3 = await prisma.inventoryItem.create({
    data: {
      itemCode: 'VT-0003',
      name: 'Cảm biến tiệm cận Omron E2E-X3D1-N',
      category: 'Linh kiện điện',
      quantity: 3,
      unit: 'Cái',
      minQuantity: 10,
      unitPrice: 450000,
      location: 'Kệ B-04',
    },
  });

  const inv4 = await prisma.inventoryItem.create({
    data: {
      itemCode: 'VT-0004',
      name: 'Phớt chắn dầu NBR 35x52x7',
      category: 'Cơ khí',
      quantity: 40,
      unit: 'Cái',
      minQuantity: 10,
      unitPrice: 35000,
      location: 'Kệ A-03',
    },
  });

  // Create Equipment
  const eq1 = await prisma.equipment.create({
    data: {
      code: 'EQ-0001',
      name: 'Máy phay CNC 3 trục Haas VF-2',
      category: 'Máy phay',
      location: 'Xưởng Gia công A',
      status: 'OPERATIONAL',
      serialNumber: 'HS-9827341',
      purchaseDate: new Date('2022-03-15'),
      warrantyPeriod: '24 tháng',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60',
      specs: 'Tốc độ trục chính: 10,000 RPM. Hành trình X/Y/Z: 762 x 406 x 508 mm. Công suất: 22.4 kW',
      notes: 'Hoạt động ổn định, bảo dưỡng định kỳ hàng tháng.',
    },
  });

  const eq2 = await prisma.equipment.create({
    data: {
      code: 'EQ-0002',
      name: 'Máy nén khí Trục vít Kobelco Kobelion 37kW',
      category: 'Máy nén khí',
      location: 'Phòng Động lực 1',
      status: 'UNDER_MAINTENANCE',
      serialNumber: 'KB-554201',
      purchaseDate: new Date('2021-08-10'),
      warrantyPeriod: '36 tháng',
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=60',
      specs: 'Lưu lượng khí: 6.5 m3/min. Áp suất hoạt động: 7.5 bar. Độ ồn: 68 dB',
      notes: 'Đang bảo dưỡng định kỳ thay lọc gió & dầu động cơ.',
    },
  });

  const eq3 = await prisma.equipment.create({
    data: {
      code: 'EQ-0003',
      name: 'Băng tải con lăn tự động Phân loại sản phẩm',
      category: 'Băng tải',
      location: 'Phân xưởng Đóng gói B',
      status: 'INCIDENT',
      serialNumber: 'BT-2023-09',
      purchaseDate: new Date('2023-01-20'),
      warrantyPeriod: '12 tháng',
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=60',
      specs: 'Tải trọng tối đa: 50 kg/m. Tốc độ: 0.8 m/s. Chiều dài: 15 mét.',
      notes: 'Phát hiện tiếng ồn lạ tại cụm truyền động góc.',
    },
  });

  const eq4 = await prisma.equipment.create({
    data: {
      code: 'EQ-0004',
      name: 'Máy hàn Laser Fiber Công nghiệp 3000W',
      category: 'Máy hàn',
      location: 'Xưởng Kết cấu C',
      status: 'OPERATIONAL',
      serialNumber: 'LZ-3000F-88',
      purchaseDate: new Date('2023-06-01'),
      warrantyPeriod: '24 tháng',
      image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&auto=format&fit=crop&q=60',
      specs: 'Công suất nguồn Laser: 3000W Raycus. Chiều rộng đường hàn: 0.2 - 5.0 mm.',
      notes: 'Chất lượng mối hàn đạt chuẩn.',
    },
  });

  // Create Maintenance Requests
  const req1 = await prisma.maintenanceRequest.create({
    data: {
      requestCode: 'REQ-0001',
      equipmentId: eq3.id,
      title: 'Băng tải bị rung lắc và có tiếng kêu lớn tại xưởng B',
      description: 'Khi chạy tốc độ cao trên 0.6 m/s băng tải có tiếng rít lạ ở cụm nhông xích truyền động.',
      priority: 'HIGH',
      status: 'APPROVED',
      reporterName: 'Lê Hoàng Nam (Quản đốc Xưởng B)',
      department: 'Bộ phận Đóng gói',
    },
  });

  const req2 = await prisma.maintenanceRequest.create({
    data: {
      requestCode: 'REQ-0002',
      equipmentId: eq1.id,
      title: 'Cần vệ sinh lọc mát và bổ sung dầu làm mát cho máy phay Haas',
      description: 'Nhiệt độ dung dịch làm mát tăng nhẹ sau ca làm việc liên tục 8 tiếng.',
      priority: 'LOW',
      status: 'PENDING',
      reporterName: 'Phạm Đức Anh (Vận hành CNC)',
      department: 'Xưởng Gia công A',
    },
  });

  // Create Work Orders
  const wo1 = await prisma.workOrder.create({
    data: {
      orderCode: 'WO-0001',
      equipmentId: eq3.id,
      requestId: req1.id,
      title: '[Sửa chữa] Khắc phục tiếng ồn và thay thế vòng bi băng tải Xưởng B',
      description: 'Tháo kiểm tra cụm truyền động, thay thế 2 vòng bi bị hỏng rơ và tra mỡ chịu nhiệt.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      technicianName: 'Trần Văn Kỹ Thuật',
      plannedStartDate: new Date(),
      plannedEndDate: new Date(Date.now() + 86400000),
      actualStartDate: new Date(),
      failureCause: 'Vòng bi bị mòn và rơ sau thời gian dài vận hành liên tục',
      totalCost: 360000,
    },
  });

  await prisma.workOrderItem.create({
    data: {
      workOrderId: wo1.id,
      inventoryItemId: inv1.id,
      quantity: 2,
      unitPrice: 180000,
    },
  });

  const wo2 = await prisma.workOrder.create({
    data: {
      orderCode: 'WO-0002',
      equipmentId: eq2.id,
      title: '[Bảo trì định kỳ] Thay lọc dầu và bổ sung 20L dầu máy nén khí Kobelco',
      description: 'Thực hiện quy trình bảo dưỡng định kỳ 2000 giờ cho máy nén khí Kobelco.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      technicianName: 'Nguyễn Văn Quản Trị',
      plannedStartDate: new Date(),
      plannedEndDate: new Date(Date.now() + 172800000),
      actualStartDate: new Date(),
      totalCost: 2400000,
    },
  });

  await prisma.workOrderItem.create({
    data: {
      workOrderId: wo2.id,
      inventoryItemId: inv2.id,
      quantity: 20,
      unitPrice: 120000,
    },
  });

  // Create Schedules
  await prisma.maintenanceSchedule.create({
    data: {
      scheduleCode: 'MS-2026-0001',
      title: 'Bảo trì định kỳ Máy phay CNC Haas VF-2',
      equipmentId: eq1.id,
      createdById: userAdmin.id,
      frequencyType: 'MONTHLY',
      frequencyInterval: 1,
      startDate: new Date(),
      status: 'ACTIVE',
      nextDueDate: new Date(Date.now() + 7 * 86400000),
      checklistJson: JSON.stringify([
        'Kiểm tra mức dầu bôi trơn trục chính',
        'Vệ sinh tấm chắn phoi và rãnh thoát phoi',
        'Kiểm tra độ rơ cơ học các trục X/Y/Z',
        'Đo điện áp và kiểm tra quạt tản nhiệt tủ điện',
      ]),
    },
  });

  await prisma.maintenanceSchedule.create({
    data: {
      scheduleCode: 'MS-2026-0002',
      title: 'Kiểm tra hệ thống khí nén & xả ngưng tụ',
      equipmentId: eq2.id,
      createdById: userAdmin.id,
      frequencyType: 'WEEKLY',
      frequencyInterval: 1,
      startDate: new Date(),
      status: 'ACTIVE',
      nextDueDate: new Date(Date.now() + 3 * 86400000),
      checklistJson: JSON.stringify([
        'Xả nước tích tụ tại bình chứa khí',
        'Kiểm tra chênh áp qua lõi lọc khí',
        'Kiểm tra dòng điện động cơ chính',
      ]),
    },
  });

  console.log('✅ Seed data successfully populated!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
