export {};
const { PrismaClient: PrismaClientReal } = require('@prisma/client');
const prisma = new PrismaClientReal();

async function main() {
  console.log('🚀 Đang chạy script Seed dữ liệu Thiết bị thực tế...');

  // Người dùng Quản trị (Admin) sẽ được hệ thống cấp quyền tự động khi đăng nhập
  // nếu mã nhân viên của họ khớp với biến môi trường ADMIN_EMPLOYEE_CODE.

  // 2. Tạo System Settings
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
  console.log('✅ Đã tạo System Settings');


  const locationsToCreate = [
    { code: 'LOC-CD', name: 'Xưởng Cơ điện' },
    { code: 'LOC-MM', name: 'Xưởng Mắt mũi' },
    { code: 'LOC-TUDL', name: 'Xưởng TUDL' },
    { code: 'LOC-KKD', name: 'Xưởng Thuốc KKD' },
    { code: 'LOC-MP', name: 'Xưởng Mỹ phẩm' },
    { code: 'LOC-HT', name: 'Xưởng Hoàn thiện' },
    { code: 'LOC-CX', name: 'Xưởng Chiết xuất' },
    { code: 'LOC-TTBYT', name: 'Xưởng TTBYT' }
  ];

  for (const loc of locationsToCreate) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: { name: loc.name },
      create: { code: loc.code, name: loc.name, description: loc.name },
    });
  }
  console.log(`✅ Đã tạo/cập nhật ${locationsToCreate.length} Vị trí (Xưởng)`);

  const categoriesToCreate = [
    { code: 'CAT-HT', name: 'Hệ thống' },
    { code: 'CAT-TB', name: 'Thiết bị' }
  ];

  for (const cat of categoriesToCreate) {
    await prisma.equipmentCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: { code: cat.code, name: cat.name, description: cat.name },
    });
  }
  console.log(`✅ Đã tạo/cập nhật ${categoriesToCreate.length} Phân loại nhóm`);

  const rawData = [
    ["TS-2020-008", "TBSX001", "Hệ thống RO - 1", "Xưởng Cơ điện", "Hệ thống"],
    ["TS039", "TBSX002", "Hệ thống khí nén không dầu", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX004", "HỆ THỐNG HVAC KIỂM NGHIỆM", "Xưởng Cơ điện", "Hệ thống"],
    ["NHAMAY025", "TBSX005", "HỆ THỐNG XỬ LÝ NƯỚC THẢI", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX006", "Hệ thống PCCC", "Xưởng Cơ điện", "Hệ thống"],
    ["TS12-2016", "TBSX007", "HỆ THỐNG ĐẾM TIỂU PHÂN ONLINE", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX008", "HỆ THỐNG BMS", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX009", "HỆ THỐNG ĐIỀU HÒA KHO", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX013", "Hệ thống đun nước nóng", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX014", "Hệ thống chữa cháy", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX015", "Hệ thống báo cháy", "Xưởng Cơ điện", "Hệ thống"],
    ["TS-2023-13", "TBSX016", "Máy nén khí trục vít có dầu PMV22AQ", "Xưởng Cơ điện", "Hệ thống"],
    ["TS-2023-14", "TBSX017", "Máy sấy khí YAD - 030S", "Xưởng Cơ điện", "Hệ thống"],
    ["TS-GD2-051", "TBSX018", "Nồi hơi tiệt trùng (TTBYT)", "Xưởng Cơ điện", "Hệ thống"],
    ["TS-GD2-076", "TBSX019", "Hệ thống RO - 3 (TTBYT)", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX020", "HVAC 1 mắt mũi", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX021", "HVAC 2 mắt mũi", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX022", "HVAC 3 mắt mũi", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX023", "HVAC 4 thuốc uống dạng lỏng", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX024", "HVAV 6 phân xưởng 2 - siro", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX025", "HVAC 7 phân xưởng 2 - Line pha chế rắn", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX026", "HVAC 8 phân xưởng 2 - Line phân liều rắn", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX027", "HVAC 9 phân xưởng 2 - Hành lang rắn", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX028", "Điều hòa nối ống 10 phân xưởng 2 - Phòng cân", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX029", "Điều hòa nối ống 11 - Phòng thay đồ", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX030", "Điều hòa kho 1", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX031", "Điều hòa kho 2", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX032", "Điều hòa kho 3", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX033", "Điều hòa kho 4", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX034", "Điều hòa kho 5", "Xưởng Cơ điện", "Hệ thống"],
    ["", "TBSX035", "Đóng gói cấp 2", "Xưởng Cơ điện", "Hệ thống"],
    ["TS04-2016", "TBSX101", "Cân kỹ thuật Metler", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX102", "Máy đo pH", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX103", "Tank pha 500 lít", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX106", "Tank gia nhiệt 350L", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX107", "Laf cân NL không vô trùng", "Xưởng Mắt mũi", "Thiết bị"],
    ["NHAMAY036", "TBSX109", "Tủ sấy chai lọ 1", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX110", "Tủ sấy chai lọ 2", "Xưởng Mắt mũi", "Thiết bị"],
    ["NHAMAY024", "TBSX111", "Tủ tiệt trùng Ozon", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS01-2016", "TBSX112", "Nồi hấp bảo hộ lao động LS 100HD", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS073-2012 (Loại B15)", "TBSX116", "Máy rửa lọ 1", "Xưởng Mắt mũi", "Thiết bị"],
    ["NHAMAY029", "TBSX117", "Tủ sấy dụng cụ Binder", "Xưởng Mắt mũi", "Thiết bị"],
    ["NHAMAY008", "TBSX118", "Máy đóng lọ 4 vòi JC-FSX", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2020-020", "TBSX119", "Máy chiết rót mắt mũi DXYG4/2/2", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX121", "Laf bảo hộ lao động", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX123", "Máy giặt", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX124", "Tủ sấy BHLĐ", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX125", "Máy dán BHLĐ", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX127", "Máy tạo Ozon lino 1", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS04-2019", "TBSX128", "Máy xay keo Xapeco", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX129", "Máy xịt rửa xịt 15", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX130", "Máy sục ozone", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2022-13", "TBSX131", "Tủ sấy chai lọ 3", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2023-17", "TBSX132", "Tank pha chế 1000L pha C", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2023-09", "TBSX133", "Nồi hấp ALP CL-40L", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2023-26", "TBSX134", "Bơm nhu động FU-4B", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2023-16", "TBSX135", "Tank đồng nhất hóa 150L", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX136", "Nồi hấp KTR - 40", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-GD2-007", "TBSX137", "Máy xay keo PUC", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX138", "Máy hàn túi chân không VS 800", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX139", "Máy hàn túi bán thấm", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2022-01", "TBSX140", "Máy rửa lọ 2", "Xưởng Mắt mũi", "Thiết bị"],
    ["TS-2023-03", "TBSX141", "Tank pha 1000L pha B", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX142", "LAF máy đóng lọ 4 vòi JC-FSX", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX143", "LAF Máy chiết rót mắt mũi DXYG4/2/2", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX144", "FFU laf cân", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX145", "Máy tạo Ozon lino 2", "Xưởng Mắt mũi", "Thiết bị"],
    ["", "TBSX201", "Cân kỹ thuật Ohaus PA 4102", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX203", "Máy đo pH", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX204", "Laf cân", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX205", "Tank nấu siro đơn", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX206", "Tank pha 1.500 lít TUDL", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX207", "Tank chứa 1.500 lít TUDL", "Xưởng TUDL", "Thiết bị"],
    ["NHAMAY009", "TBSX209", "Máy chiết rót 6 vòi LYG-6", "Xưởng TUDL", "Thiết bị"],
    ["TS-2021-02", "TBSX210", "Tủ sấy 2 cửa", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX217", "Máy xịt rửa xịt 70", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX219", "Máy dập nắp nhôm chai xịt phân liều", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX220", "Bếp điện từ - TUDL", "Xưởng TUDL", "Thiết bị"],
    ["TS-GD2-054", "TBSX223", "Máy chiết rót ống bẻ", "Xưởng TUDL", "Thiết bị"],
    ["", "TBSX224", "Chiller làm mát", "Xưởng TUDL", "Thiết bị"],
    ["TS-2020-003", "TBSX225", "Tank pha chế 500L", "Xưởng TUDL", "Thiết bị"],
    ["NHAMAY070", "TBSX407", "Tank gia nhiệt", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY068", "TBSX408", "Tank pha 1.500 lít TPBVSK", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY069", "TBSX409", "Tank chứa 1.500 lít TPBVSK", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY060", "TBSX411", "Máy chiết rót YG6/1", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2020-016", "TBSX412", "Máy rót nhu động", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX413", "Máy đóng túi siro DXDL60Z", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX414", "Tủ sấy dụng cụ", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-06", "TBSX415", "Nồi hấp tiệt trùng", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX417", "Máy đo độ cứng", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY057", "TBSX418", "Máy trộn cao tốc LM-200", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX419", "Máy nhào 2 cánh NH-200", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY055", "TBSX420", "Máy xát hạt YK-160", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX421", "Máy sấy tầng sôi", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY058", "TBSX422", "Tủ sấy tĩnh CT-C-I (1)", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY013", "TBSX423", "Máy xay búa BSF-16", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS018", "TBSX424", "Máy trộn lập phương", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY056", "TBSX425", "Máy trộn Rockin EYH-2000A", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2023-05", "TBSX426", "Máy đóng nang tự động NJP-1200C", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2023-06", "TBSX427", "Máy lau nang", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX428", "Máy dập viên ZP29", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS084-2012 (Loại B15)", "TBSX430", "Máy đóng túi trà YI-II", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2023-20", "TBSX431", "Máy ép vỉ", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY062", "TBSX434", "Máy đóng túi siro JD-BY50", "Xưởng Thuốc KKD", "Thiết bị"],
    ["NHAMAY061", "TBSX435", "Máy đóng túi siro JD-Y50Z", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-05", "TBSX436", "Bếp điện từ", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX437", "Cân sấy ẩm Ohaus MB25", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS052", "TBSX438", "Tank chứa 300 lít", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS051", "TBSX439", "Tank pha 300 lít", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2024-03", "TBSX443", "Máy nghiền côn", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS13-2018", "TBSX444", "Bơm nhu động WT600-1F", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-08", "TBSX445", "Máy khuấy cầm tay", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2021-11", "TBSX446", "Máy bao film", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-07", "TBSX449", "Máy xát hạt trục đứng", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-20", "TBSX450", "Nồi bao quay tròn", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX451", "Máy sục ozone mini", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2021-12", "TBSX456", "Máy đóng túi cốm DOP - 07 (1)", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2022-14", "TBSX457", "Bơm nhu động FU-2B", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX458", "Máy đóng túi siro JD-Y50Z (mới)", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-2024-01", "TBSX459", "Tủ sấy Memmert UF750", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX460", "Tank pha 500L", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-GD2-012", "TBSX461", "Tank gia nhiệt 150L", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX462", "Máy chiết rót BOV", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-GD2-066", "TBSX463", "Máy đóng túi cốm DOP - 07 (2)", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX465", "Máy đo độ mài mòn", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-GD2-075", "TBSX467", "Máy chiết rót 1 vòi", "Xưởng Thuốc KKD", "Thiết bị"],
    ["TS-10-2026", "TBSX468", "Nồi hấp tiệt trùng ATC-150LD", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX469", "Máy rót nhu động 2", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX470", "Tủ sấy tĩnh CT-C-I (2)", "Xưởng Thuốc KKD", "Thiết bị"],
    ["", "TBSX501", "Máy rót nhu động", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX502", "Máy seal màng", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX504", "Tank chứa 300 l", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX505", "Máy xiết nắp", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX506", "Tank pha 1600 L", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX511", "Bếp gas công nghiệp", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["TS-GD2-002", "TBSX514", "Máy chiết kem", "Xưởng Mỹ phẩm", "Thiết bị"],
    ["", "TBSX601", "Máy dán nhãn chai tròn", "Xưởng Hoàn thiện", "Thiết bị"],
    ["NHAMAY012", "TBSX602", "Máy dán nhãn chai dẹt", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX603", "Máy seal màng", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX604", "Máy co màng 1", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2020-009", "TBSX605", "Máy indate", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2020-010", "TBSX606", "Máy dán nhãn chai tròn MT-200", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX607", "Máy đóng hộp YL-100P", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2020-012", "TBSX608", "Máy đóng màng co tự động BMD-600A", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2021-08", "TBSX609", "Máy dán nhãn chai tròn T401", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2023-27", "TBSX610", "Máy sang cuộn", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2023-28", "TBSX611", "Máy indateVideojet 1580", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX612", "Cân kỹ thuật KD-TBED 1", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-GD2-010", "TBSX614", "Máy vào hộp XWZ120", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-GD2-009", "TBSX615", "Máy dán nhãn XT - 2150", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-GD2-011", "TBSX616", "Máy co lốc BMD - 600B", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX617", "Máy co hơi nước", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-GD2-055", "TBSX618", "Máy dán nhãn ống bẻ", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2025-06", "TBSX619", "Máy đóng túi nằm màng dưới", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-04-2026", "TBSX620", "Máy bế hộp đứng", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX621", "Máy gấp đơn", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX622", "Cân kỹ thuật KD-TBED 2", "Xưởng Hoàn thiện", "Thiết bị"],
    ["", "TBSX623", "Máy co màng 2", "Xưởng Hoàn thiện", "Thiết bị"],
    ["TS-2022-09", "TBSX801", "Tủ sấy DL 2 cửa", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX802", "TB nghiền bột mịn MN - 300B", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX803", "TB sao tẩm dược liệu SL - D800", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX804", "máy thái dược liệu", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX805", "Cân kỹ thuật SJ-6200CE", "Xưởng Chiết xuất", "Thiết bị"],
    ["TS-2022-18", "TBSX806", "Hệ thống chiết, cô dược liệu", "Xưởng Chiết xuất", "Thiết bị"],
    ["TS-2022-10", "TBSX807", "Nồi ninh dược liệu", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX808", "Cân bàn VPS4050C- XK3190-A12E", "Xưởng Chiết xuất", "Thiết bị"],
    ["", "TBSX809", "Nồi hơi", "Xưởng Chiết xuất", "Thiết bị"],
    ["TS-GD2-048", "TBSX901", "Tank chứa 1000L", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-047", "TBSX902", "Tank chứa 1500L", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-016", "TBSX903", "Hệ chiết rót 4 vòi DXYG4/2/2", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-067", "TBSX904", "Tủ sấy chai lọ 2 buồng TY-SL2B", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-057", "TBSX905", "Máy chiết rót siết nắp chai YGS6/1/1", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX906", "Tủ sấy dụng cụ 1", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX907", "Tủ sấy BHLĐ", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-053", "TBSX908", "Tank pha 150L", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-062", "TBSX909", "Nồi hấp BHLĐ", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-050", "TBSX910", "Tank gia nhiệt 500L", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX911", "Máy rửa lọ xoay 1", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-046", "TBSX912", "Tank pha 1500L", "Xưởng TTBYT", "Thiết bị"],
    ["TS-GD2-049", "TBSX913", "Tank pha 1000L", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX914", "Tủ sấy dụng cụ 2", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX915", "Nồi hấp dụng cụ 1", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX916", "Nồi hấp dụng cụ 2", "Xưởng TTBYT", "Thiết bị"],
    ["", "TBSX917", "Máy rửa lọ xoay 2", "Xưởng TTBYT", "Thiết bị"]
  ];

  let successCount = 0;
  for (const item of rawData) {
    const accCode = item[0] ? item[0].trim() : null;
    const code = item[1].trim();
    const name = item[2].trim();
    const loc = item[3].trim();
    const cat = item[4].trim();

    await prisma.equipment.upsert({
      where: { code: code },
      update: {
        name: name,
        accountingCode: accCode,
        location: loc,
        category: cat
      },
      create: {
        id: `eq-${code.toLowerCase()}`,
        code: code,
        accountingCode: accCode,
        name: name,
        location: loc,
        category: cat,
        status: 'OPERATIONAL',
        isActive: true,
      }
    });
    successCount++;
  }

  console.log(`✅ Đã nạp thành công ${successCount} thiết bị từ file ảnh của bạn vào Database.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
