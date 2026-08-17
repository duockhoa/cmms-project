const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // ═══════════════════════════════════════════
  // 1. USERS - Đầy đủ vai trò và bộ phận
  // ═══════════════════════════════════════════
  const users = await Promise.all([
    // ADMIN
    prisma.user.upsert({
      where: { email: 'admin@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-admin-01',
        name: 'Nguyễn Văn Admin',
        email: 'admin@dkcmms.vn',
        role: 'ADMIN',
        department: 'BAN_GIAM_DOC',
        status: 'AVAILABLE',
      },
    }),
    // MANAGER - Phòng Kỹ thuật
    prisma.user.upsert({
      where: { email: 'manager.kt@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-manager-01',
        name: 'Trần Văn Quản Lý',
        email: 'manager.kt@dkcmms.vn',
        role: 'MANAGER',
        department: 'PHONG_KY_THUAT',
        status: 'AVAILABLE',
      },
    }),
    // TECHNICIAN - Xưởng A
    prisma.user.upsert({
      where: { email: 'tech.xuonga@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-tech-xuong-01',
        name: 'Lê Minh Xưởng',
        email: 'tech.xuonga@dkcmms.vn',
        role: 'TECHNICIAN',
        department: 'XUONG_A',
        specialty: 'Cơ khí chung',
        status: 'AVAILABLE',
      },
    }),
    // TECHNICIAN - Xưởng B
    prisma.user.upsert({
      where: { email: 'tech.xuongb@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-tech-xuong-02',
        name: 'Phạm Văn Bình',
        email: 'tech.xuongb@dkcmms.vn',
        role: 'TECHNICIAN',
        department: 'XUONG_B',
        specialty: 'Vận hành máy CNC',
        status: 'AVAILABLE',
      },
    }),
    // TECHNICIAN - Cơ điện
    prisma.user.upsert({
      where: { email: 'tech.codien01@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-tech-codien-01',
        name: 'Hoàng Đức Cơ Điện',
        email: 'tech.codien01@dkcmms.vn',
        role: 'TECHNICIAN',
        department: 'CO_DIEN',
        specialty: 'Điện công nghiệp',
        status: 'AVAILABLE',
      },
    }),
    // TECHNICIAN - Cơ điện 2
    prisma.user.upsert({
      where: { email: 'tech.codien02@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-tech-codien-02',
        name: 'Ngô Quang Điện',
        email: 'tech.codien02@dkcmms.vn',
        role: 'TECHNICIAN',
        department: 'CO_DIEN',
        specialty: 'PLC & Tự động hóa',
        status: 'AVAILABLE',
      },
    }),
    // OPERATOR - Xưởng A
    prisma.user.upsert({
      where: { email: 'operator01@dkcmms.vn' },
      update: {},
      create: {
        id: 'user-operator-01',
        name: 'Vũ Thị Hoa',
        email: 'operator01@dkcmms.vn',
        role: 'OPERATOR',
        department: 'XUONG_A',
        status: 'AVAILABLE',
      },
    }),
    // Demo user (frontend default) - update existing user to ADMIN
    prisma.user.upsert({
      where: { email: 'tech@company.com' },
      update: { role: 'ADMIN', name: 'Demo User (Full Quyền)', department: 'BAN_GIAM_DOC' },
      create: {
        id: 'tech-demo-id',
        name: 'Demo User (Full Quyền)',
        email: 'tech@company.com',
        role: 'ADMIN',
        department: 'BAN_GIAM_DOC',
        status: 'AVAILABLE',
      },
    }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  // ═══════════════════════════════════════════
  // 2. EQUIPMENT CATEGORIES
  // ═══════════════════════════════════════════
  const categories = await Promise.all([
    prisma.equipmentCategory.upsert({
      where: { code: 'CAT-CK' },
      update: {},
      create: { code: 'CAT-CK', name: 'Cơ khí', description: 'Thiết bị cơ khí chung' },
    }),
    prisma.equipmentCategory.upsert({
      where: { code: 'CAT-DIEN' },
      update: {},
      create: { code: 'CAT-DIEN', name: 'Điện', description: 'Thiết bị điện công nghiệp' },
    }),
    prisma.equipmentCategory.upsert({
      where: { code: 'CAT-KHI' },
      update: {},
      create: { code: 'CAT-KHI', name: 'Khí nén', description: 'Hệ thống khí nén' },
    }),
    prisma.equipmentCategory.upsert({
      where: { code: 'CAT-THUY' },
      update: {},
      create: { code: 'CAT-THUY', name: 'Thủy lực', description: 'Hệ thống thủy lực' },
    }),
  ]);
  console.log(`✅ Created ${categories.length} equipment categories`);

  // ═══════════════════════════════════════════
  // 3. LOCATIONS
  // ═══════════════════════════════════════════
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { code: 'LOC-XA' },
      update: {},
      create: { code: 'LOC-XA', name: 'Xưởng A', description: 'Xưởng sản xuất chính' },
    }),
    prisma.location.upsert({
      where: { code: 'LOC-XB' },
      update: {},
      create: { code: 'LOC-XB', name: 'Xưởng B', description: 'Xưởng gia công phụ' },
    }),
    prisma.location.upsert({
      where: { code: 'LOC-KHO' },
      update: {},
      create: { code: 'LOC-KHO', name: 'Kho vật tư', description: 'Kho lưu trữ vật tư, phụ tùng' },
    }),
  ]);
  console.log(`✅ Created ${locations.length} locations`);

  // ═══════════════════════════════════════════
  // 4. PRODUCTION LINES
  // ═══════════════════════════════════════════
  const lines = await Promise.all([
    prisma.productionLine.upsert({
      where: { code: 'LINE-01' },
      update: {},
      create: { code: 'LINE-01', name: 'Dây chuyền 1', description: 'Dây chuyền sản xuất chính' },
    }),
    prisma.productionLine.upsert({
      where: { code: 'LINE-02' },
      update: {},
      create: { code: 'LINE-02', name: 'Dây chuyền 2', description: 'Dây chuyền phụ' },
    }),
  ]);
  console.log(`✅ Created ${lines.length} production lines`);

  // ═══════════════════════════════════════════
  // 5. EQUIPMENT - 10 thiết bị
  // ═══════════════════════════════════════════
  const equipmentData = [
    { id: 'eq-001', code: 'EQ-CNC-001', name: 'Máy phay CNC Fanuc α-D14MiB5', category: 'Cơ khí', location: 'Xưởng A', serialNumber: 'FANUC-2023-001', currentOperatingHours: 4520 },
    { id: 'eq-002', code: 'EQ-CNC-002', name: 'Máy tiện CNC Doosan Lynx 2100', category: 'Cơ khí', location: 'Xưởng A', serialNumber: 'DOOSAN-2022-015', currentOperatingHours: 3800 },
    { id: 'eq-003', code: 'EQ-WELD-001', name: 'Máy hàn TIG Miller Dynasty 350', category: 'Điện', location: 'Xưởng B', serialNumber: 'MILLER-2024-003', currentOperatingHours: 1200 },
    { id: 'eq-004', code: 'EQ-COMP-001', name: 'Máy nén khí Atlas Copco GA37', category: 'Khí nén', location: 'Xưởng A', serialNumber: 'ATLAS-2021-008', currentOperatingHours: 8900 },
    { id: 'eq-005', code: 'EQ-CONV-001', name: 'Băng tải chính dây chuyền 1', category: 'Cơ khí', location: 'Xưởng A', serialNumber: 'CONV-2020-001', currentOperatingHours: 12000 },
    { id: 'eq-006', code: 'EQ-PUMP-001', name: 'Bơm thủy lực Rexroth A10V', category: 'Thủy lực', location: 'Xưởng B', serialNumber: 'REXROTH-2023-002', currentOperatingHours: 2100 },
    { id: 'eq-007', code: 'EQ-MOTOR-001', name: 'Động cơ servo Siemens 1FK7', category: 'Điện', location: 'Xưởng A', serialNumber: 'SIEMENS-2022-011', currentOperatingHours: 5500 },
    { id: 'eq-008', code: 'EQ-ROBOT-001', name: 'Robot hàn ABB IRB 1600', category: 'Cơ khí', location: 'Xưởng B', serialNumber: 'ABB-2024-001', currentOperatingHours: 800 },
    { id: 'eq-009', code: 'EQ-DRILL-001', name: 'Máy khoan cột Hồng Ký HK35', category: 'Cơ khí', location: 'Xưởng A', serialNumber: 'HK-2019-007', currentOperatingHours: 6200 },
    { id: 'eq-010', code: 'EQ-TRANS-001', name: 'Biến áp nguồn 3 pha 500KVA', category: 'Điện', location: 'Xưởng A', serialNumber: 'ABB-TR-2020-004', currentOperatingHours: 15000 },
  ];

  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {},
      create: {
        id: eq.id,
        code: eq.code,
        name: eq.name,
        category: eq.category,
        location: eq.location,
        serialNumber: eq.serialNumber,
        currentOperatingHours: eq.currentOperatingHours,
        status: 'OPERATIONAL',
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${equipmentData.length} equipment`);

  // ═══════════════════════════════════════════
  // 6. INVENTORY ITEMS - 8 vật tư
  // ═══════════════════════════════════════════
  const inventoryData = [
    { id: 'inv-001', itemCode: 'VT-VONBI-001', name: 'Vòng bi SKF 6205-2RS', category: 'Vòng bi', quantity: 25, unit: 'Cái', minQuantity: 5, unitPrice: 180000, location: 'Kệ A1' },
    { id: 'inv-002', itemCode: 'VT-DAU-001', name: 'Dầu thủy lực Shell Tellus S2 M46', category: 'Dầu mỡ', quantity: 200, unit: 'Lít', minQuantity: 50, unitPrice: 55000, location: 'Kệ B2' },
    { id: 'inv-003', itemCode: 'VT-DAIBOC-001', name: 'Đai ốc M10 inox 304', category: 'Cơ khí', quantity: 500, unit: 'Cái', minQuantity: 100, unitPrice: 3500, location: 'Kệ C1' },
    { id: 'inv-004', itemCode: 'VT-PHOT-001', name: 'Phớt chắn dầu TC 25x47x7', category: 'Phớt', quantity: 40, unit: 'Cái', minQuantity: 10, unitPrice: 25000, location: 'Kệ A2' },
    { id: 'inv-005', itemCode: 'VT-RELAY-001', name: 'Relay trung gian Omron MY2N 24VDC', category: 'Linh kiện điện', quantity: 30, unit: 'Cái', minQuantity: 10, unitPrice: 95000, location: 'Kệ D1' },
    { id: 'inv-006', itemCode: 'VT-CONTACTOR-001', name: 'Contactor Schneider LC1D09M7', category: 'Linh kiện điện', quantity: 15, unit: 'Cái', minQuantity: 5, unitPrice: 350000, location: 'Kệ D2' },
    { id: 'inv-007', itemCode: 'VT-FILTER-001', name: 'Lọc khí Atlas Copco DD17', category: 'Lọc', quantity: 8, unit: 'Bộ', minQuantity: 3, unitPrice: 1200000, location: 'Kệ E1' },
    { id: 'inv-008', itemCode: 'VT-BELT-001', name: 'Dây đai B-60 Continental', category: 'Cơ khí', quantity: 12, unit: 'Sợi', minQuantity: 4, unitPrice: 85000, location: 'Kệ A3' },
  ];

  for (const item of inventoryData) {
    await prisma.inventoryItem.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: item,
    });
  }
  console.log(`✅ Created ${inventoryData.length} inventory items`);

  // ═══════════════════════════════════════════
  // 7. MAINTENANCE REQUESTS - 5 yêu cầu
  // ═══════════════════════════════════════════
  const requests = [
    {
      id: 'req-001',
      requestCode: 'REQ-2026-001',
      equipmentId: 'eq-001',
      title: 'Máy CNC Fanuc rung lắc bất thường khi phay thô',
      description: 'Khi gia công phay thô ở tốc độ cao (>8000rpm), máy rung lắc mạnh, bề mặt sản phẩm bị sóng. Nghi ngờ vòng bi trục chính bị mòn.',
      priority: 'HIGH',
      status: 'APPROVED',
      reporterName: 'Vũ Thị Hoa',
      department: 'XUONG_A',
    },
    {
      id: 'req-002',
      requestCode: 'REQ-2026-002',
      equipmentId: 'eq-004',
      title: 'Máy nén khí Atlas áp suất giảm',
      description: 'Áp suất đầu ra giảm từ 8 bar xuống 5.5 bar, không đủ cung cấp cho dây chuyền 1. Nghi ngờ van giảm áp hoặc bộ lọc khí bị tắc.',
      priority: 'URGENT',
      status: 'APPROVED',
      reporterName: 'Lê Minh Xưởng',
      department: 'XUONG_A',
    },
    {
      id: 'req-003',
      requestCode: 'REQ-2026-003',
      equipmentId: 'eq-003',
      title: 'Máy hàn TIG không lên hồ quang',
      description: 'Nhấn trigger hàn không lên hồ quang, đèn báo quá nhiệt nhấp nháy. Đã kiểm tra điện cực và kẹp mass, vẫn không hoạt động.',
      priority: 'HIGH',
      status: 'PENDING',
      reporterName: 'Phạm Văn Bình',
      department: 'XUONG_B',
    },
    {
      id: 'req-004',
      requestCode: 'REQ-2026-004',
      equipmentId: 'eq-005',
      title: 'Băng tải dây chuyền 1 trượt đai',
      description: 'Đai băng tải bị trượt liên tục khi chạy tải nặng, sản phẩm bị lệch trên băng. Đai có dấu hiệu dãn, cần thay mới.',
      priority: 'MEDIUM',
      status: 'PENDING',
      reporterName: 'Vũ Thị Hoa',
      department: 'XUONG_A',
    },
    {
      id: 'req-005',
      requestCode: 'REQ-2026-005',
      equipmentId: 'eq-007',
      title: 'Servo Siemens báo lỗi F07011',
      description: 'Động cơ servo báo lỗi F07011 (Motor encoder fault) khi khởi động. Đã reset lỗi nhưng vẫn tái phát. Cần kiểm tra encoder.',
      priority: 'HIGH',
      status: 'APPROVED',
      reporterName: 'Lê Minh Xưởng',
      department: 'XUONG_A',
    },
  ];

  for (const req of requests) {
    await prisma.maintenanceRequest.upsert({
      where: { requestCode: req.requestCode },
      update: {},
      create: req,
    });
  }
  console.log(`✅ Created ${requests.length} maintenance requests`);

  // ═══════════════════════════════════════════
  // 8. WORK ORDERS - 4 WO từ các request đã duyệt
  // ═══════════════════════════════════════════
  const workOrders = [
    // WO1: Xưởng tự xử lý - CNC rung lắc
    {
      id: 'wo-001',
      orderCode: 'WO-2026-001',
      equipmentId: 'eq-001',
      requestId: 'req-001',
      title: '[Xưởng] Máy CNC Fanuc rung lắc bất thường khi phay thô',
      description: 'Kiểm tra và thay thế vòng bi trục chính máy CNC Fanuc.',
      priority: 'HIGH',
      status: 'ASSIGNED',
      technicianName: 'Lê Minh Xưởng',
      assignedTechnicianId: 'user-tech-xuong-01',
      handlingRoute: 'WORKSHOP_SELF_HANDLE',
    },
    // WO2: Xưởng tự xử lý - Nén khí áp suất giảm
    {
      id: 'wo-002',
      orderCode: 'WO-2026-002',
      equipmentId: 'eq-004',
      requestId: 'req-002',
      title: '[Xưởng] Máy nén khí Atlas áp suất giảm',
      description: 'Kiểm tra van giảm áp, thay bộ lọc khí, bảo dưỡng máy nén khí.',
      priority: 'URGENT',
      status: 'ASSIGNED',
      technicianName: 'Lê Minh Xưởng',
      assignedTechnicianId: 'user-tech-xuong-01',
      handlingRoute: 'WORKSHOP_SELF_HANDLE',
    },
    // WO3: Chuyển Cơ điện xử lý - Servo báo lỗi
    {
      id: 'wo-003',
      orderCode: 'WO-2026-003',
      equipmentId: 'eq-007',
      requestId: 'req-005',
      title: '[Cơ điện] Servo Siemens báo lỗi F07011',
      description: 'Kiểm tra và sửa chữa encoder động cơ servo Siemens. Thay thế nếu cần thiết.',
      priority: 'HIGH',
      status: 'ASSIGNED',
      technicianName: 'Hoàng Đức Cơ Điện',
      assignedTechnicianId: 'user-tech-codien-01',
      handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
    },
    // WO4: WO đang xử lý (IN_PROGRESS) - Demo
    {
      id: 'wo-004',
      orderCode: 'WO-2026-004',
      equipmentId: 'eq-006',
      title: '[Cơ điện] Bơm thủy lực Rexroth rò rỉ dầu',
      description: 'Bơm thủy lực bị rò rỉ dầu tại phớt trục chính. Cần thay phớt và kiểm tra áp suất hệ thống.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      technicianName: 'Ngô Quang Điện',
      assignedTechnicianId: 'user-tech-codien-02',
      handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
      actualStartDate: new Date('2026-08-14T08:00:00Z'),
    },
  ];

  for (const wo of workOrders) {
    await prisma.workOrder.upsert({
      where: { orderCode: wo.orderCode },
      update: {},
      create: wo,
    });
  }
  console.log(`✅ Created ${workOrders.length} work orders`);

  // ═══════════════════════════════════════════
  // 9. EXECUTION LOG cho WO4 (đang IN_PROGRESS)
  // ═══════════════════════════════════════════
  const existingLog = await prisma.workOrderExecutionLog.findFirst({
    where: { workOrderId: 'wo-004', actionType: 'START' },
  });
  if (!existingLog) {
    await prisma.workOrderExecutionLog.create({
      data: {
        workOrderId: 'wo-004',
        equipmentId: 'eq-006',
        performedById: 'user-tech-codien-02',
        performerUnitType: 'MAINTENANCE',
        handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
        actionType: 'START',
        content: 'Bắt đầu kiểm tra bơm thủy lực Rexroth A10V. Đã chuẩn bị dụng cụ và phớt thay thế.',
        recordedAt: new Date('2026-08-14T08:00:00Z'),
      },
    });
    await prisma.workOrderExecutionLog.create({
      data: {
        workOrderId: 'wo-004',
        equipmentId: 'eq-006',
        performedById: 'user-tech-codien-02',
        performerUnitType: 'MAINTENANCE',
        handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
        actionType: 'LOG',
        content: 'Đã tháo bơm, xác nhận phớt trục chính TC 25x47x7 bị mòn gây rò rỉ. Đang tiến hành thay thế.',
        recordedAt: new Date('2026-08-14T09:30:00Z'),
      },
    });
    console.log('✅ Created execution logs for WO-2026-004');
  }

  // ═══════════════════════════════════════════
  // 10. SYSTEM SETTINGS
  // ═══════════════════════════════════════════
  await prisma.systemSetting.upsert({
    where: { key: 'app.name' },
    update: {},
    create: { key: 'app.name', value: 'DK-CMMS' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'app.version' },
    update: {},
    create: { key: 'app.version', value: '1.0.0' },
  });
  await prisma.systemSetting.upsert({
    where: { key: 'wo.autoAssign' },
    update: {},
    create: { key: 'wo.autoAssign', value: 'false' },
  });
  console.log('✅ Created system settings');

  console.log('\n══════════════════════════════════════════');
  console.log('🎉 Seed hoàn tất! Thông tin đăng nhập:');
  console.log('══════════════════════════════════════════');
  console.log('Frontend tự động dùng user "tech-demo-id" (ADMIN, full quyền)');
  console.log('');
  console.log('Danh sách user:');
  console.log('  - user-admin-01      | ADMIN     | Nguyễn Văn Admin');
  console.log('  - user-manager-01    | MANAGER   | Trần Văn Quản Lý');
  console.log('  - user-tech-xuong-01 | TECHNICIAN| Lê Minh Xưởng (Xưởng A)');
  console.log('  - user-tech-xuong-02 | TECHNICIAN| Phạm Văn Bình (Xưởng B)');
  console.log('  - user-tech-codien-01| TECHNICIAN| Hoàng Đức Cơ Điện');
  console.log('  - user-tech-codien-02| TECHNICIAN| Ngô Quang Điện');
  console.log('  - user-operator-01   | OPERATOR  | Vũ Thị Hoa');
  console.log('  - tech-demo-id       | ADMIN     | Demo User (Full Quyền) ← FE mặc định');
  console.log('');
  console.log('Thiết bị: 10 thiết bị (EQ-CNC-001 đến EQ-TRANS-001)');
  console.log('Yêu cầu:  5 yêu cầu (3 APPROVED, 2 PENDING)');
  console.log('Work Order: 4 WO (3 ASSIGNED, 1 IN_PROGRESS)');
  console.log('Vật tư:    8 loại vật tư');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
