export interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
}

export interface ModulePermissions {
  id: string;
  name: string;
  permissions: PermissionDefinition[];
}

export const PERMISSIONS_REGISTRY: ModulePermissions[] = [
  {
    id: 'utilities',
    name: 'Điện, Nước & Tiện ích',
    permissions: [
      {
        code: 'utilities:view',
        name: 'Xem giám sát & sổ ghi',
        description: 'Xem dashboard giám sát phụ trợ, sổ ghi chỉ số điện nước và báo cáo xu hướng',
      },
      {
        code: 'utilities:record',
        name: 'Ghi nhận chỉ số mới',
        description: 'Nhập chỉ số điện năng, nước sạch định kỳ theo ca',
      },
      {
        code: 'utilities:edit_reading',
        name: 'Chỉnh sửa bản ghi chỉ số',
        description: 'Chỉnh sửa chỉ số mới, chỉ số trước, thời gian ghi, ca và ghi chú của bản ghi đã ghi',
      },
      {
        code: 'utilities:void_reading',
        name: 'Hủy bản ghi chỉ số sai',
        description: 'Đánh dấu hủy sai cho bản ghi ghi nhầm (Audit trail)',
      },
      {
        code: 'utilities:recalculate',
        name: 'Chuẩn hóa & tính lại sản lượng',
        description: 'Thực hiện chuẩn hóa lại toàn bộ chuỗi số liệu lịch sử của các đồng hồ',
      },
      {
        code: 'utilities:manage_points',
        name: 'Cấu hình điểm đo & hệ thống',
        description: 'Thêm, sửa thông tin điểm đo, hệ số nhân TI/TU và cấu hình đồng hồ',
      },
      {
        code: 'utilities:delete_point',
        name: 'Xóa điểm đo',
        description: 'Xóa điểm đo hoặc đồng hồ khỏi hệ thống',
      },
      {
        code: 'utilities:baseline',
        name: 'Chốt mốc chỉ số đầu kỳ',
        description: 'Cài đặt và chốt chỉ số mốc đầu kỳ tính toán (tháng/năm)',
      },
      {
        code: 'utilities:status_toggle',
        name: 'Điều khiển hệ thống phụ trợ',
        description: 'Bật/tắt trạng thái và ghi nhận giờ chạy thiết bị phụ trợ (Chiller, RO, Khí nén...)',
      },
      {
        code: 'utilities:export',
        name: 'Xuất dữ liệu tiện ích',
        description: 'Tải file Excel/CSV danh sách ghi chỉ số và báo cáo xu hướng',
      },
    ],
  },
  {
    id: 'equipment',
    name: 'Thiết bị & Máy móc',
    permissions: [
      {
        code: 'equipment:view',
        name: 'Xem danh mục thiết bị',
        description: 'Xem danh sách, thông số kỹ thuật và hồ sơ lý lịch máy móc',
      },
      {
        code: 'equipment:create',
        name: 'Thêm mới thiết bị',
        description: 'Tạo mới hồ sơ máy móc, thiết bị vào hệ thống',
      },
      {
        code: 'equipment:edit',
        name: 'Chỉnh sửa thông tin thiết bị',
        description: 'Cập nhật thông số, hình ảnh, tài liệu và cấu hình thông số máy',
      },
      {
        code: 'equipment:delete',
        name: 'Xóa thiết bị',
        description: 'Xóa hoặc ngừng hoạt động thiết bị',
      },
      {
        code: 'equipment:export',
        name: 'Xuất danh sách thiết bị',
        description: 'Xuất file Excel/CSV danh mục máy móc thiết bị',
      },
      {
        code: 'equipment:qr',
        name: 'In & quét mã QR',
        description: 'In tem mã QR quản lý tài sản và quét tra cứu nhanh',
      },
    ],
  },
  {
    id: 'requests',
    name: 'Báo cáo sự cố & Yêu cầu',
    permissions: [
      {
        code: 'requests:view',
        name: 'Xem danh sách yêu cầu sự cố',
        description: 'Xem các phiếu báo hỏng, sự cố máy và đề xuất bảo trì',
      },
      {
        code: 'requests:create',
        name: 'Tạo báo cáo sự cố mới',
        description: 'Gửi báo cáo sự cố bất thường của máy móc thiết bị',
      },
      {
        code: 'requests:edit',
        name: 'Chỉnh sửa yêu cầu sự cố',
        description: 'Cập nhật nội dung mô tả, mức độ ưu tiên của yêu cầu',
      },
      {
        code: 'requests:approve',
        name: 'Duyệt / Tiếp nhận sự cố',
        description: 'Phê duyệt tiếp nhận sự cố và chuyển đổi thành phiếu bảo trì',
      },
      {
        code: 'requests:reject',
        name: 'Từ chối / Trả lại',
        description: 'Từ chối hoặc yêu cầu bổ sung thông tin phiếu sự cố',
      },
      {
        code: 'requests:cancel',
        name: 'Hủy yêu cầu sự cố',
        description: 'Hủy bỏ yêu cầu bảo trì khi không còn nhu cầu',
      },
    ],
  },
  {
    id: 'work_orders',
    name: 'Phiếu bảo trì (Work Orders)',
    permissions: [
      {
        code: 'work_orders:view',
        name: 'Xem phiếu bảo trì',
        description: 'Xem danh sách, chi tiết tiến độ và nhật ký phiếu bảo trì',
      },
      {
        code: 'work_orders:create',
        name: 'Tạo phiếu bảo trì mới',
        description: 'Lập phiếu sửa chữa, bảo trì máy móc đột xuất hoặc định kỳ',
      },
      {
        code: 'work_orders:edit',
        name: 'Chỉnh sửa phiếu bảo trì',
        description: 'Cập nhật phương án sửa chữa, vật tư và thông tin phiếu',
      },
      {
        code: 'work_orders:assign',
        name: 'Phân công kỹ thuật viên',
        description: 'Giao việc cho kỹ thuật viên hoặc đội bảo trì thực hiện',
      },
      {
        code: 'work_orders:execute',
        name: 'Thực hiện bảo trì & ghi nhật ký',
        description: 'Bắt đầu, ghi nhận nhật ký xử lý, chụp ảnh và hoàn thành công việc',
      },
      {
        code: 'work_orders:close',
        name: 'Nghiệm thu & đóng phiếu',
        description: 'Xác nhận nghiệm thu công việc và đóng phiếu bảo trì',
      },
      {
        code: 'work_orders:cancel',
        name: 'Hủy phiếu bảo trì',
        description: 'Hủy phiếu bảo trì không thực hiện',
      },
    ],
  },
  {
    id: 'checklists',
    name: 'Checklist bảo trì',
    permissions: [
      {
        code: 'checklists:view',
        name: 'Xem mẫu & lịch sử checklist',
        description: 'Xem thư viện các mẫu checklist và kết quả kiểm tra định kỳ',
      },
      {
        code: 'checklists:create',
        name: 'Tạo mẫu checklist mới',
        description: 'Thiết lập biểu mẫu kiểm tra định kỳ cho máy móc',
      },
      {
        code: 'checklists:edit',
        name: 'Chỉnh sửa mẫu checklist',
        description: 'Sửa các hạng mục và tiêu chí đánh giá trong checklist',
      },
      {
        code: 'checklists:execute',
        name: 'Thực hiện đi checklist',
        description: 'Tiến hành kiểm tra máy thực tế và đánh dấu Đạt / Không đạt',
      },
      {
        code: 'checklists:approve',
        name: 'Duyệt kết quả checklist',
        description: 'Quản lý phê duyệt kết quả kiểm tra checklist',
      },
    ],
  },
  {
    id: 'operation_logs',
    name: 'Sổ vận hành máy',
    permissions: [
      {
        code: 'operation_logs:view',
        name: 'Xem sổ vận hành máy',
        description: 'Xem các thông số vận hành hàng ngày của máy móc, dây chuyền',
      },
      {
        code: 'operation_logs:create',
        name: 'Ghi nhật ký vận hành ca',
        description: 'Nhập thông số vận hành (áp suất, nhiệt độ, dòng điện...) theo ca',
      },
      {
        code: 'operation_logs:edit',
        name: 'Chỉnh sửa bản ghi vận hành',
        description: 'Sửa các thông số vận hành đã ghi nhận',
      },
      {
        code: 'operation_logs:void',
        name: 'Hủy bản ghi vận hành sai',
        description: 'Đánh dấu hủy bản ghi thông số sai',
      },
      {
        code: 'operation_logs:export',
        name: 'Xuất sổ vận hành',
        description: 'Tải file Excel báo cáo nhật ký vận hành máy',
      },
    ],
  },
  {
    id: 'inventory',
    name: 'Kho & Phụ tùng',
    permissions: [
      {
        code: 'inventory:view',
        name: 'Xem tồn kho phụ tùng',
        description: 'Tra cứu danh mục vật tư, số lượng tồn kho và vị trí kệ',
      },
      {
        code: 'inventory:create',
        name: 'Thêm mới vật tư phụ tùng',
        description: 'Khai báo mã vật tư, phụ tùng thay thế mới',
      },
      {
        code: 'inventory:edit',
        name: 'Chỉnh sửa thông tin phụ tùng',
        description: 'Cập nhật định mức tồn tối thiểu, đơn giá, nhà cung cấp',
      },
      {
        code: 'inventory:in',
        name: 'Nhập kho phụ tùng',
        description: 'Lập và ghi nhận phiếu nhập kho vật tư',
      },
      {
        code: 'inventory:out',
        name: 'Xuất kho cho bảo trì',
        description: 'Lập phiếu xuất kho vật tư phụ tùng phục vụ bảo trì',
      },
      {
        code: 'inventory:adjust',
        name: 'Kiểm kê & điều chỉnh kho',
        description: 'Cân đối và điều chỉnh số lượng tồn kho thực tế',
      },
    ],
  },
  {
    id: 'schedules',
    name: 'Kế hoạch & Lịch bảo trì',
    permissions: [
      {
        code: 'schedules:view',
        name: 'Xem lịch bảo trì định kỳ',
        description: 'Xem lịch bảo trì phòng ngừa (PM) theo ngày, tuần, tháng',
      },
      {
        code: 'schedules:create',
        name: 'Tạo kế hoạch bảo trì mới',
        description: 'Thiết lập chu kỳ bảo trì định kỳ tự động cho thiết bị',
      },
      {
        code: 'schedules:edit',
        name: 'Chỉnh sửa kế hoạch bảo trì',
        description: 'Thay đổi chu kỳ, quy trình bảo dưỡng và thiết bị áp dụng',
      },
      {
        code: 'schedules:pause_resume',
        name: 'Tạm dừng / Kích hoạt lại',
        description: 'Bật/tắt tự động tạo phiếu bảo trì định kỳ',
      },
    ],
  },
  {
    id: 'reports',
    name: 'Báo cáo & Phân tích',
    permissions: [
      {
        code: 'reports:view',
        name: 'Xem báo cáo & phân tích',
        description: 'Xem dashboard tổng hợp, các chỉ số MTBF, MTTR, chi phí và tỷ lệ hoàn thành',
      },
      {
        code: 'reports:export',
        name: 'Xuất báo cáo tổng hợp',
        description: 'Tải các báo cáo phân tích dưới dạng PDF hoặc Excel',
      },
    ],
  },
  {
    id: 'feedbacks',
    name: 'Góp ý & Báo lỗi',
    permissions: [
      {
        code: 'feedbacks:view',
        name: 'Xem danh sách góp ý',
        description: 'Xem các ý kiến phản hồi và báo lỗi từ người dùng',
      },
      {
        code: 'feedbacks:create',
        name: 'Gửi góp ý báo lỗi mới',
        description: 'Gửi ý kiến đóng góp hoặc phản ánh sự cố hệ thống',
      },
      {
        code: 'feedbacks:reply',
        name: 'Phản hồi & xử lý góp ý',
        description: 'Cập nhật trạng thái và phản hồi lại người gửi góp ý',
      },
    ],
  },
  {
    id: 'settings',
    name: 'Cài đặt & Quản trị',
    permissions: [
      {
        code: 'settings:view',
        name: 'Xem cài đặt hệ thống',
        description: 'Xem danh mục cơ sở và cấu hình tham số hệ thống',
      },
      {
        code: 'settings:users',
        name: 'Quản lý tài khoản người dùng',
        description: 'Xem, thêm, sửa, khóa tài khoản và đồng bộ nhân sự',
      },
      {
        code: 'settings:roles',
        name: 'Quản lý Vai trò & Nhóm quyền',
        description: 'Cấu hình các vai trò (Roles) và ma trận phân quyền theo vai trò',
      },
      {
        code: 'settings:user_perms',
        name: 'Cài đặt quyền riêng từng người dùng',
        description: 'Cấp thêm hoặc tùy biến quyền riêng cho từng tài khoản cụ thể',
      },
      {
        code: 'settings:system',
        name: 'Cấu hình tham số hệ thống chung',
        description: 'Thiết lập các ngưỡng cảnh báo và tham số vận hành',
      },
    ],
  },
];

export const ALL_PERMISSION_CODES: string[] = PERMISSIONS_REGISTRY.flatMap((m) =>
  m.permissions.map((p) => p.code),
);
