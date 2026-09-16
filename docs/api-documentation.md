# TÀI LIỆU TOÀN DIỆN VỀ HỆ THỐNG API - DỰ ÁN CMMS (QUẢN LÝ THIẾT BỊ & BẢO TRÌ)

> **Hệ thống Backend**: NestJS (TypeScript)  
> **Cơ sở dữ liệu**: MySQL (Prisma ORM)  
> **Base URL**: `http://localhost:3001/api/v1`  
> **Swagger UI / OpenAPI Interactive Docs**: `http://localhost:3001/docs`  
> **Cập nhật lần cuối**: 12/09/2026  

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc & Quy Chuẩn Chung](#1-tổng-quan-kiến-trúc--quy-chuẩn-chung)
2. [Cơ Chế Xác Thực & Phân Quyền (Auth & RBAC)](#2-cơ-chế-xác-thực--phân-quyền-auth--rbac)
3. [Mã Lỗi & Chuẩn Phản Hồi (Status Codes & Response Formats)](#3-mã-lỗi--chuẩn-phản-hồi-status-codes--response-formats)
4. [Chi Tiết Các Phân Hệ API](#4-chi-tiết-các-phân-hệ-api)
   - [4.1. Hệ Thống & Kiểm Tra Sức Khỏe (Health Check)](#41-hệ-thống--kiểm-tra-sức-khỏe-health-check)
   - [4.2. Xác Thực & Người Dùng (Auth & Users)](#42-xác-thực--người-dùng-auth--users)
   - [4.3. Quản Lý Thiết Bị & Thông Số Vận Hành (Equipment, Specs & Logs)](#43-quản-lý-thiết-bị--thông-số-vận-hành-equipment-specs--logs)
   - [4.4. Quản Lý Sự Cố & Yêu Cầu Sửa Chữa (Maintenance Requests)](#44-quản-lý-sự-cố--yêu-cầu-sửa-chữa-maintenance-requests)
   - [4.5. Quản Lý Phiếu Bảo Trì & Công Việc (Work Orders - WO)](#45-quản-lý-phiếu-bảo-trì--công-việc-work-orders---wo)
   - [4.6. Lập Kế Hoạch & Lịch Bảo Trì Định Kỳ (Maintenance Schedules)](#46-lập-kế-hoạch--lịch-bảo-trì-định-kỳ-maintenance-schedules)
   - [4.7. Danh Mục & Thực Hiện Checklist (Checklists)](#47-danh-mục--thực-hiện-checklist-checklists)
   - [4.8. Quản Lý Kho Phụ Tùng & Vật Tư (Inventory)](#48-quản-lý-kho-phụ-tùng--vật-tư-inventory)
   - [4.9. Tiện Ích & Năng Lượng: Điện, Nước, Phụ Trợ (Utilities)](#49-tiện-ích--năng-lượng-điện-nước-phụ-trợ-utilities)
   - [4.10. Thống Kê, Báo Cáo & Chỉ Số KPI (Analytics & KPI Engine)](#410-thống-kê-báo-cáo--chỉ-số-kpi-analytics--kpi-engine)
   - [4.11. Thông Báo Hệ Thống (Notifications)](#411-thông-báo-hệ-thống-notifications)
   - [4.12. Quản Lý Tệp Đính Kèm & Media (Attachments)](#412-quản-lý-tệp-đính-kèm--media-attachments)
   - [4.13. Góp Ý & Báo Lỗi Ứng Dụng (Feedbacks)](#413-góp-ý--báo-lỗi-ứng-dụng-feedbacks)
   - [4.14. Thiết Lập Hệ Thống & Danh Mục Chuẩn (Settings & Masters)](#414-thiết-lập-hệ-thống--danh-mục-chuẩn-settings--masters)

---

## 1. TỔNG QUAN KIẾN TRÚC & QUY CHUẨN CHUNG

- **Phiên bản API (Versioning)**: Mọi endpoint nghiệp vụ được đặt dưới tiền tố toàn cục `/api/v1`.
- **Cấu hình Port & CORS**: Mặc định chạy tại port `3001`. Cấu hình qua biến môi trường `PORT` và `CORS_ORIGIN` (mặc định cho phép `http://localhost:5173`).
- **Validation**: Tích hợp toàn diện `ValidationPipe` với cơ chế `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`, tự động ép kiểu và từ chối các trường lạ nằm ngoài DTO.
- **Tài liệu Swagger tương tác**: Thiết lập sẵn tại đường dẫn `/docs` (chuẩn OpenAPI 3.0), cho phép kiểm thử và mô tả schema của từng API.

---

## 2. CƠ CHẾ XÁC THỰC & PHÂN QUYỀN (AUTH & RBAC)

### 2.1. Xác thực Token (Authentication)
- Hầu hết các API được bảo vệ bởi `@UseGuards(JwtAuthGuard)`.
- Client gửi Access Token qua:
  1. **HTTP Authorization Header**: `Authorization: Bearer <JWT_TOKEN>` (Khuyên dùng)
  2. **URL Query Param**: `?token=<JWT_TOKEN>` hoặc `?accessToken=<JWT_TOKEN>` (thường dùng cho xem file/tải file)
  3. **Cookie**: Hỗ trợ cookie `accessToken` / `access_token` / `token`.
- **Hệ thống hỗ trợ 2 chế độ giải mã JWT**:
  - Tích hợp HRM nội bộ qua khóa bí mật `HRM_JWT_SECRET`.
  - Tích hợp Keycloak IdP SSO qua JWKS URL (`KEYCLOAK_JWKS_URI`, RS256).

### 2.2. Phân quyền (Role-Based Access Control & Fine-Grained Permissions)
- **Các vai trò cơ bản (Standard Roles)**:
  - `ADMIN`: Toàn quyền hệ thống.
  - `MANAGER`: Trưởng/phó bộ phận quản lý thiết bị, có quyền duyệt sự cố, duyệt bàn giao, xem báo cáo tổng hợp.
  - `TECHNICIAN`: Kỹ thuật viên bảo trì (cơ điện, kỹ thuật), thực thi Work Order, ghi log, quét QR.
  - `OPERATOR`: Nhân viên vận hành máy, gửi yêu cầu sự cố, ghi nhật ký ca, nghiệm thu bàn giao.
- **Custom Role & Custom Permissions**:
  - Người dùng có thể được gán `Role` tùy chỉnh hoặc override danh sách `customPermissions` trực tiếp.
  - Hỗ trợ Wildcard: `*`, `ALL`, hoặc theo module ví dụ `equipment:*`, `inventory:*`.
  - Giới hạn phạm vi (Scope): Lọc theo phòng ban (`department`) hoặc chỉ xem công việc được giao (`assignedOnly`).

---

## 3. MÃ LỖI & CHUẨN PHẢN HỒI (STATUS CODES & RESPONSE FORMATS)

| Mã HTTP | Ý Nghĩa | Mô Tả Trường Hợp Xảy Ra |
|:---|:---|:---|
| **200 OK** | Thành công | Yêu cầu xử lý thành công (GET, PUT, PATCH, hoặc một số POST) |
| **201 Created** | Tạo mới thành công | Tạo mới bản ghi thành công (POST) |
| **204 No Content** | Xóa thành công | Thao tác DELETE thành công không cần dữ liệu trả về |
| **400 Bad Request** | Dữ liệu không hợp lệ | Vi phạm validation của DTO hoặc logic ràng buộc nghiệp vụ |
| **401 Unauthorized** | Chưa xác thực | Không truyền Token, Token hết hạn hoặc chữ ký không hợp lệ |
| **403 Forbidden** | Không có quyền | Người dùng không đủ quyền thực hiện hành động này |
| **404 Not Found** | Không tìm thấy | Bản ghi không tồn tại trong hệ thống |
| **409 Conflict** | Xung đột dữ liệu | Trùng lặp mã duy nhất (Unique code) hoặc xung đột phiên bản (Optimistic Locking) |
| **500 Internal Server Error** | Lỗi máy chủ | Lỗi ngoại lệ chưa được bắt trong backend |

---

## 4. CHI TIẾT CÁC PHÂN HỆ API

### 4.1. HỆ THỐNG & KIỂM TRA SỨC KHỎE (HEALTH CHECK)
Controller: `HealthController` | Tiền tố: `/health`

| Phương thức | Endpoint | Yêu cầu Auth | Mô tả chức năng |
|:---|:---|:---:|:---|
| `GET` | `/api/v1/health` | Không | Kiểm tra trạng thái máy chủ API và kết nối cơ sở dữ liệu MySQL (`SELECT 1`). Trả về `{ status: "ok", services: { database: "up", api: "up" } }`. |

---

### 4.2. XÁC THỰC & NGƯỜI DÙNG (AUTH & USERS)
Controller: `AuthController`, `UsersController` | Tiền tố: `/auth`, `/users`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/auth/me` | JWT | Lấy hồ sơ user đang đăng nhập, thông tin vai trò, danh sách quyền tổng hợp (Role + User custom permissions) và Scope truy cập. | Header Bearer Token |
| `POST` | `/api/v1/users/sync-hrm` | JWT | Đồng bộ hóa tài khoản người dùng từ hệ thống HRM sang cơ sở dữ liệu CMMS. | Token từ HRM qua header |
| `GET` | `/api/v1/users` | JWT | Lấy danh sách người dùng. Hỗ trợ lọc theo vai trò, phòng ban, trạng thái hoạt động. | Query: `role`, `department`, `includeInactive` |
| `GET` | `/api/v1/users/departments` | JWT | Lấy danh sách tất cả các phòng ban đang có người dùng thuộc về. | Không |
| `GET` | `/api/v1/users/:id` | JWT | Lấy thông tin chi tiết một người dùng theo ID. | Param: `id` |
| `POST` | `/api/v1/users` | JWT (Admin) | Thêm mới tài khoản người dùng thủ công. | Body: `{ name, email, role, department, specialty, ... }` |
| `PATCH` | `/api/v1/users/:id` | JWT (Admin) | Cập nhật thông tin tài khoản người dùng. | Body: cập nhật các trường |
| `PATCH` | `/api/v1/users/:id/technical-profile` | JWT | Cập nhật hồ sơ kỹ thuật, chuyên môn, chứng chỉ của kỹ thuật viên. | Body: `UpdateTechnicalProfileDto` (`specialty`, `certifications`...) |
| `PATCH` | `/api/v1/users/:id/availability` | JWT | Cập nhật trạng thái làm việc tức thời (`AVAILABLE`, `BUSY`, `ON_LEAVE`). | Body: `{ status: TechnicianStatus }` |
| `PATCH` | `/api/v1/users/:id/role` | JWT (Admin) | Gán nhóm quyền vai trò (`Role`) cho người dùng. | Body: `{ roleId: string \| null }` |
| `PATCH` | `/api/v1/users/:id/custom-permissions` | JWT (Admin) | Cập nhật danh sách quyền riêng biệt bổ sung cho người dùng. | Body: `{ permissions: string[] }` |
| `DELETE` | `/api/v1/users/:id` | JWT (Admin) | Xóa người dùng khỏi hệ thống. | Param: `id` |

---

### 4.3. QUẢN LÝ THIẾT BỊ & THÔNG SỐ VẬN HÀNH (EQUIPMENT, SPECS & LOGS)
Controller: `EquipmentController`, `EquipmentParametersController`, `EquipmentTechnicalSpecsController`, `OperationLogsController`, `GlobalOperationLogsController`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/equipment` | JWT | Danh sách thiết bị (phân trang, lọc theo tên, mã máy, danh mục, phân xưởng, vị trí, trạng thái). | Query: `search`, `category`, `department`, `status`, `location`, `page`, `limit` |
| `GET` | `/api/v1/equipment/:id` | JWT | Xem chi tiết hồ sơ thiết bị (bao gồm thông số kỹ thuật, linh kiện, lịch sử bảo dưỡng). | Param: `id` |
| `POST` | `/api/v1/equipment` | JWT | Tạo mới thiết bị trong hệ thống. | Body: `CreateEquipmentDto` (`code`, `name`, `category`, `location`, `department`, `accountingCode`...) |
| `PATCH` | `/api/v1/equipment/:id` | JWT | Cập nhật thông tin thiết bị. | Body: `UpdateEquipmentDto` |
| `DELETE` | `/api/v1/equipment/:id` | JWT | Xóa thiết bị khỏi hệ thống. | Param: `id` |
| `GET` | `/api/v1/equipment/:equipmentId/parameters` | JWT | Lấy danh sách thông số vận hành cần kiểm tra theo dõi của thiết bị (áp suất, nhiệt độ, dòng điện...). | Param: `equipmentId` |
| `POST` | `/api/v1/equipment/:equipmentId/parameters` | JWT | Tạo mới thông số theo dõi cho máy. | Body: `CreateEquipmentParameterDto` |
| `POST` | `/api/v1/equipment/:equipmentId/parameters/bulk-assign` | JWT | Gán nhanh hàng loạt từ danh mục thông số chuẩn. | Body: `{ standardParameterIds: string[] }` |
| `POST` | `/api/v1/equipment/:equipmentId/parameters/sync` | JWT | Đồng bộ hóa danh sách thông số vận hành của máy. | Body: `{ items: any[] }` |
| `PUT` | `/api/v1/equipment/:equipmentId/parameters/batch` | JWT | Cập nhật giá trị ngưỡng (min/max/đơn vị) cho nhiều thông số cùng lúc. | Body: `{ items: any[] }` |
| `PUT` | `/api/v1/equipment/:equipmentId/parameters/:id` | JWT | Cập nhật thông tin một thông số theo dõi. | Body: `UpdateEquipmentParameterDto` |
| `DELETE` | `/api/v1/equipment/:equipmentId/parameters/:id` | JWT | Xóa thông số theo dõi của thiết bị. | Param: `id` |
| `GET` | `/api/v1/equipment/:equipmentId/technical-specs` | JWT | Lấy danh sách thông số kỹ thuật cấu hình máy (công suất, kích thước, tải trọng...). | Param: `equipmentId` |
| `POST` | `/api/v1/equipment/:equipmentId/technical-specs` | JWT | Thêm thông số cấu hình máy. | Body: `{ name, value, unit, category, notes }` |
| `POST` | `/api/v1/equipment/:equipmentId/technical-specs/bulk-assign` | JWT | Gán hàng loạt thông số cấu hình từ bộ chuẩn. | Body: `{ standardSpecIds: string[] }` |
| `POST` | `/api/v1/equipment/:equipmentId/technical-specs/sync` | JWT | Đồng bộ danh sách cấu hình máy. | Body: `{ items: any[] }` |
| `PUT` | `/api/v1/equipment/:equipmentId/technical-specs/batch` | JWT | Cập nhật hàng loạt cấu hình máy. | Body: `{ items: any[] }` |
| `PUT` | `/api/v1/equipment/:equipmentId/technical-specs/:id` | JWT | Cập nhật một thông số cấu hình máy. | Body: `{ name, value, unit, category, notes }` |
| `DELETE` | `/api/v1/equipment/:equipmentId/technical-specs/:id` | JWT | Xóa thông số cấu hình. | Param: `id` |
| `GET` | `/api/v1/equipment/:equipmentId/operation-logs` | JWT | Lấy nhật ký vận hành ca của máy. | Param: `equipmentId` |
| `POST` | `/api/v1/equipment/:equipmentId/operation-logs` | JWT | Gửi bản ghi nhật ký vận hành ca (lưu giá trị các thông số đo được, trạng thái hoạt động). | Body: `SubmitOperationLogsDto` |
| `POST` | `/api/v1/equipment/:equipmentId/operation-logs/void-session` | JWT | Hủy bỏ một phiên nhật ký vận hành đã nhập nhầm kèm lý do. | Body: `VoidOperationLogSessionDto` |
| `GET` | `/api/v1/operation-logs` | JWT | Lấy toàn bộ danh sách nhật ký vận hành toàn nhà máy (Global view). | Không |

---

### 4.4. QUẢN LÝ SỰ CỐ & YÊU CẦU SỬA CHỮA (MAINTENANCE REQUESTS)
Controller: `RequestsController` | Tiền tố: `/requests`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/requests` | JWT | Danh sách yêu cầu sửa chữa sự cố (lọc trạng thái, mức độ ưu tiên, tìm kiếm, phân trang). | Query: `status`, `priority`, `search`, `page`, `limit` |
| `GET` | `/api/v1/requests/:id` | JWT | Chi tiết yêu cầu sửa chữa. | Param: `id` |
| `GET` | `/api/v1/requests/:id/history` | JWT | Xem toàn bộ lịch sử trạng thái, luồng phê duyệt và ghi chú của yêu cầu. | Param: `id` |
| `POST` | `/api/v1/requests` | JWT | Tạo mới yêu cầu báo sự cố / sửa chữa máy từ vận hành. | Body: `CreateMaintenanceRequestDto` (`equipmentId`, `title`, `description`, `priority`, `failureType`...) |
| `POST` | `/api/v1/requests/:id/approve` | JWT (Manager) | Quản trị viên/Trưởng nhóm duyệt yêu cầu và chuyển tiếp/tạo Work Order. | Body: `ApproveMaintenanceRequestDto` |
| `POST` | `/api/v1/requests/:id/reject` | JWT (Manager) | Từ chối yêu cầu sự cố không hợp lệ. | Body: `RejectMaintenanceRequestDto` (`reason`) |
| `POST` | `/api/v1/requests/:id/return` | JWT (Manager) | Trả lại yêu cầu để người tạo làm rõ thêm thông tin. | Body: `ReturnRequestDto` (`reason`) |
| `POST` | `/api/v1/requests/:id/resubmit` | JWT | Người tạo gửi lại yêu cầu sau khi đã bổ sung thông tin theo yêu cầu. | Body: `ResubmitRequestDto` |
| `POST` | `/api/v1/requests/:id/cancel` | JWT | Người tạo hủy yêu cầu sửa chữa. | Body: `CancelRequestDto` (`reason`) |

---

### 4.5. QUẢN LÝ PHIẾU BẢO TRÌ & CÔNG VIỆC (WORK ORDERS - WO)
Controller: `WorkOrdersController` | Tiền tố: `/work-orders`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/work-orders` | JWT | Danh sách phiếu công việc bảo trì (lọc status, priority, thiết bị, đội phụ trách `handlerTeam`, phân trang). | Query: `status`, `priority`, `search`, `equipmentId`, `handlerTeam`, `page`, `limit` |
| `GET` | `/api/v1/work-orders/:id` | JWT | Chi tiết phiếu bảo trì (kèm danh sách vật tư xuất, log thực hiện, checklist, bàn giao). | Param: `id` |
| `GET` | `/api/v1/work-orders/by-equipment-qr/:qrToken` | JWT | Tìm hoặc mở nhanh Work Order hiện hành theo mã QR Code dán trên thiết bị. | Param: `qrToken`, Query: `scanMethod` |
| `POST` | `/api/v1/work-orders` | JWT | Khởi tạo phiếu bảo trì mới (đột xuất hoặc theo yêu cầu). | Body: `CreateWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/assign` | JWT | Phân công kỹ thuật viên / nhóm xử lý phiếu. | Body: `AssignWorkOrderDto` (`technicianId`, `assignedTeam`) |
| `POST` | `/api/v1/work-orders/:id/assign-executor` | JWT | Gán kỹ thuật viên chịu trách nhiệm thực thi chính. | Body: `AssignWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/classify` | JWT | Phân loại phân nhóm kỹ thuật phụ trách (Cơ điện, Kỹ thuật...). | Body: `ClassifyWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/start` | JWT | Bắt đầu bấm giờ thực hiện công việc trên máy. | Body: `StartWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/pause` | JWT | Tạm dừng công việc (chờ linh kiện, chờ sản xuất...). | Body: `PauseWorkOrderDto` (`reason`) |
| `POST` | `/api/v1/work-orders/:id/resume` | JWT | Tiếp tục tiến hành công việc sau khi tạm dừng. | Body: `ResumeWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/complete` | JWT | Kỹ thuật viên báo cáo hoàn thành sửa chữa trên thực địa. | Body: `CompleteWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/submit-handover` | JWT | Nộp biên bản bàn giao máy lại cho phân xưởng/vận hành. | Body: `SubmitHandoverDto` |
| `POST` | `/api/v1/work-orders/:id/accept-handover` | JWT | Vận hành nghiệm thu và xác nhận nhận bàn giao máy. | Body: `{ expectedVersion: number }` |
| `POST` | `/api/v1/work-orders/:id/reject-handover` | JWT | Vận hành từ chối bàn giao (máy chạy thử chưa đạt yêu cầu). | Body: `RejectHandoverDto` (`reason`) |
| `POST` | `/api/v1/work-orders/:id/verify` | JWT (Manager) | Quản lý kiểm tra xác minh chất lượng xử lý. | Body: `VerifyWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/close` | JWT (Manager) | Đóng phiếu công việc, kết thúc toàn bộ quy trình WO. | Body: `CloseWorkOrderDto` |
| `POST` | `/api/v1/work-orders/:id/cancel` | JWT | Hủy bỏ phiếu công việc kèm lý do. | Body: `CancelWorkOrderDto` (`reason`) |
| `POST` | `/api/v1/work-orders/:id/escalate` | JWT | Báo cáo leo thang sự cố vượt thẩm quyền xử lý. | Body: `EscalateWorkOrderDto` |
| `GET` | `/api/v1/work-orders/:id/execution-logs` | JWT | Lấy nhật ký chi tiết các bước thực hiện bảo trì của WO. | Param: `id` |
| `POST` | `/api/v1/work-orders/:id/execution-logs` | JWT | Ghi nhận một bước thực hiện (chụp ảnh trước/sau, mô tả thao tác). | Body: `CreateExecutionLogDto` |
| `POST` | `/api/v1/work-orders/:id/items` | JWT | Xuất kho phụ tùng/vật tư sử dụng cho phiếu công việc. | Body: `AddWorkOrderItemDto` (`inventoryItemId`, `quantity`) |
| `POST` | `/api/v1/work-orders/:workOrderId/material-returns` | JWT | Hoàn trả vật tư phụ tùng thừa về lại kho. | Body: `MaterialReturnDto` |
| `GET` | `/api/v1/work-orders/:workOrderId/inventory-transactions` | JWT | Lịch sử các giao dịch kho liên quan đến Work Order. | Param: `workOrderId` |
| `DELETE` | `/api/v1/work-orders/:id` | JWT (Admin) | Xóa phiếu công việc. | Param: `id` |

---

### 4.6. LẬP KẾ HOẠCH & LỊCH BẢO TRÌ ĐỊNH KỲ (MAINTENANCE SCHEDULES)
Controller: `SchedulesController` | Tiền tố: `/maintenance-schedules`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/maintenance-schedules` | JWT | Danh sách kế hoạch bảo trì định kỳ (lọc theo thiết bị, tần suất, trạng thái). | Query parameters |
| `GET` | `/api/v1/maintenance-schedules/:id` | JWT | Chi tiết kế hoạch bảo trì định kỳ. | Param: `id` |
| `GET` | `/api/v1/maintenance-schedules/:id/history` | JWT | Lịch sử kích hoạt, bảo dưỡng và biến động chu kỳ của kế hoạch. | Param: `id` |
| `POST` | `/api/v1/maintenance-schedules` | JWT | Tạo mới kế hoạch bảo trì định kỳ (chu kỳ ngày, tuần, tháng, giờ chạy). | Body: `CreateScheduleDto` |
| `PATCH` | `/api/v1/maintenance-schedules/:id` | JWT | Cập nhật thông tin kế hoạch bảo trì. | Body: `UpdateScheduleDto` |
| `POST` | `/api/v1/maintenance-schedules/:id/activate` | JWT | Kích hoạt hiệu lực cho kế hoạch bảo trì. | Body: `ActivateScheduleDto` |
| `POST` | `/api/v1/maintenance-schedules/:id/pause` | JWT | Tạm dừng kế hoạch bảo trì định kỳ. | Body: `PauseScheduleDto` |
| `POST` | `/api/v1/maintenance-schedules/:id/complete` | JWT | Đánh dấu hoàn thành một chu kỳ bảo trì. | Body: `CompleteScheduleDto` |
| `POST` | `/api/v1/maintenance-schedules/:id/cancel` | JWT | Hủy bỏ kế hoạch bảo trì. | Body: `CancelScheduleDto` |
| `POST` | `/api/v1/maintenance-schedules/:id/generate-work-order` | JWT | Sinh thủ công phiếu bảo trì (Work Order) ngay lập tức từ lịch. | Body: `GenerateWorkOrderDto` |
| `POST` | `/api/v1/maintenance-schedules/process-due` | JWT | Chạy batch quét các lịch bảo trì đã đến hạn để tự động sinh WO tương ứng. | Body: `{ actedById?, referenceTime? }` |
| `DELETE` | `/api/v1/maintenance-schedules/:id` | JWT | Xóa kế hoạch bảo trì định kỳ. | Param: `id` |

---

### 4.7. DANH MỤC & THỰC HIỆN CHECKLIST (CHECKLISTS)
Controller: `ChecklistTemplatesController`, `ChecklistExecutionsController`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/checklist-templates` | Không / JWT | Lấy danh sách tất cả các mẫu checklist chuẩn. | Không |
| `GET` | `/api/v1/checklist-templates/:id` | Không / JWT | Xem chi tiết mẫu checklist và các hạng mục con. | Param: `id` |
| `POST` | `/api/v1/checklist-templates` | JWT | Tạo mới mẫu checklist kiểm tra máy. | Body: `{ code, name, description?, category? }` |
| `PUT` | `/api/v1/checklist-templates/:id` | JWT | Cập nhật mẫu checklist. | Body: `{ name?, description?, category?, isActive? }` |
| `DELETE` | `/api/v1/checklist-templates/:id` | JWT | Xóa mẫu checklist. | Param: `id` |
| `POST` | `/api/v1/checklist-templates/:id/items` | JWT | Thêm các hạng mục kiểm tra vào mẫu. | Body: `[{ itemText, isRequired }]` |
| `DELETE` | `/api/v1/checklist-templates/:id/items/:itemId` | JWT | Xóa một hạng mục khỏi mẫu. | Param: `id`, `itemId` |
| `PUT` | `/api/v1/checklist-templates/:id/items/reorder` | JWT | Thay đổi thứ tự các hạng mục trong checklist. | Body: `[{ id, itemIndex }]` |
| `POST` | `/api/v1/work-orders/:id/checklist-executions` | JWT | Khởi tạo một phiên thực hiện checklist kiểm tra cho Work Order. | Param: `id` (WO Id), Body: `CreateChecklistExecutionDto` |
| `GET` | `/api/v1/work-orders/:id/checklist-executions` | JWT | Lấy danh sách các phiên thực hiện checklist của Work Order. | Param: `id` |
| `GET` | `/api/v1/checklist-executions/:executionId` | JWT | Lấy chi tiết phiên thực hiện checklist cùng kết quả kiểm tra từng dòng. | Param: `executionId` |
| `PATCH` | `/api/v1/checklist-executions/:executionId/items` | JWT | Cập nhật kết quả kiểm tra cho từng hạng mục (`PASSED`, `FAILED`, `NA`, ghi chú, ảnh). | Body: `PatchChecklistItemDto` |
| `POST` | `/api/v1/checklist-executions/:executionId/complete` | JWT | Hoàn tất phiên kiểm tra checklist. | Body: `CompleteChecklistExecutionDto` |
| `POST` | `/api/v1/checklist-executions/:executionId/cancel` | JWT | Hủy phiên thực hiện checklist. | Body: `CancelChecklistExecutionDto` |

---

### 4.8. QUẢN LÝ KHO PHỤ TÙNG & VẬT TƯ (INVENTORY)
Controller: `InventoryController` | Tiền tố: `/inventory`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/inventory` | JWT | Lấy danh sách tồn kho vật tư, phụ tùng thay thế (lọc theo loại, tìm kiếm, phân trang). | Query: `category`, `search`, `page`, `limit` |
| `GET` | `/api/v1/inventory/:id` | JWT | Xem chi tiết mặt hàng phụ tùng (số lượng tồn, định mức min/max, vị trí kệ kho). | Param: `id` |
| `GET` | `/api/v1/inventory/:id/transactions` | JWT | Lấy lịch sử tất cả các giao dịch xuất, nhập, điều chỉnh của phụ tùng này. | Param: `id`, Query filter |
| `POST` | `/api/v1/inventory` | JWT | Khởi tạo mặt hàng phụ tùng mới trong kho. | Body: `CreateInventoryItemDto` (`code`, `name`, `unit`, `minStock`, `unitCost`...) |
| `PATCH` | `/api/v1/inventory/:id` | JWT | Cập nhật thông tin mặt hàng phụ tùng. | Body: `UpdateInventoryItemDto` |
| `POST` | `/api/v1/inventory/:id/adjust` | JWT | Điều chỉnh số lượng tồn kho tổng quát kèm lý do kiểm kê. | Body: `AdjustInventoryStockDto` |
| `POST` | `/api/v1/inventory/:id/adjust-in` | JWT | Thực hiện nhập kho bổ sung phụ tùng (Adjustment In). | Body: `AdjustInDto` (`quantity`, `reason`, `notes`) |
| `POST` | `/api/v1/inventory/:id/adjust-out` | JWT | Thực hiện xuất giảm tồn kho (hỏng, hủy, hao hụt). | Body: `AdjustOutDto` (`quantity`, `reason`, `notes`) |
| `DELETE` | `/api/v1/inventory/:id` | JWT (Admin) | Xóa mặt hàng khỏi danh mục kho. | Param: `id` |

---

### 4.9. TIỆN ÍCH & NĂNG LƯỢNG: ĐIỆN, NƯỚC, PHỤ TRỢ (UTILITIES)
Controller: `UtilitiesController` | Tiền tố: `/utilities`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/utilities/points` | JWT | Danh sách điểm đo điện, nước, máy phụ trợ (Chiller, Nồi hơi, Máy nén khí, HVAC). | Query: `type`, `location`, `search`, `isActive` |
| `GET` | `/api/v1/utilities/points/:idOrCode` | JWT | Lấy chi tiết điểm đo theo ID hoặc Mã code nhận diện. | Param: `idOrCode` |
| `POST` | `/api/v1/utilities/points` | JWT | Tạo mới điểm đo đồng hồ năng lượng / hệ thống phụ trợ. | Body: thông tin điểm đo |
| `PUT` | `/api/v1/utilities/points/:id` | JWT | Cập nhật thông tin điểm đo. | Body: dữ liệu cập nhật |
| `DELETE` | `/api/v1/utilities/points/:id` | JWT | Xóa điểm đo khỏi hệ thống. | Param: `id` |
| `PUT` | `/api/v1/utilities/points/:id/baseline` | JWT | Cài đặt chỉ số chốt gốc ban đầu (baseline) cho điểm đo. | Body: `{ baselineValue, notes }` |
| `PUT` | `/api/v1/utilities/points/batch-baselines` | JWT | Cài đặt chỉ số gốc hàng loạt cho nhiều điểm đo. | Body: `{ items: [{ id, baselineValue, notes }] }` |
| `GET` | `/api/v1/utilities/period-baselines` | JWT | Lấy danh sách chỉ số chốt gốc đầu kỳ theo tháng/năm. | Query: `month`, `year` |
| `PUT` | `/api/v1/utilities/period-baselines` | JWT | Lưu chỉ số chốt gốc đầu kỳ hàng loạt cho tháng/năm chỉ định. | Body: `{ month, year, items: [...] }` |
| `POST` | `/api/v1/utilities/readings` | JWT | Ghi nhận chỉ số tiêu thụ điện/nước hàng ngày hoặc theo ca làm việc. | Body: `{ pointId, readingValue, recordedAt, shift, ... }` |
| `POST` | `/api/v1/utilities/readings/sync-evn` | JWT | Đồng bộ chỉ số đo đếm từ điện lực EVN. | Body: dữ liệu EVN |
| `GET` | `/api/v1/utilities/readings` | JWT | Danh sách chỉ số đã ghi (lọc theo điểm đo, loại, ca, ngày, hỗ trợ phân trang). | Query: `pointId`, `type`, `shift`, `status`, `startDate`, `endDate`, `includeEvn`, `page`, `limit` |
| `PUT` | `/api/v1/utilities/readings/:id` | JWT | Hiệu chỉnh chỉ số đã ghi nhận. | Param: `id`, Body: giá trị mới |
| `POST` | `/api/v1/utilities/readings/:id/void` | JWT | Hủy bỏ một bản ghi chỉ số đã ghi sai kèm lý do bắt buộc. | Body: `{ reason: string }` |
| `POST` | `/api/v1/utilities/readings/recalculate` | JWT | Kích hoạt tính toán lại lượng tiêu thụ delta của chuỗi chỉ số. | Body: `{ pointId?: string }` |
| `POST` | `/api/v1/utilities/system-status` | JWT | Bật/tắt nhanh hoặc ghi nhận trạng thái máy phụ trợ (`RUNNING`, `OFF`, `STANDBY`). | Body: `{ pointId, status, notes }` |
| `GET` | `/api/v1/utilities/system-status/history` | JWT | Lịch sử bật/tắt máy phụ trợ và tính toán giờ chạy máy. | Query: `pointId`, `startDate`, `endDate`, `page`, `limit` |
| `GET` | `/api/v1/utilities/analytics` | JWT | Thống kê tổng hợp số liệu tiêu thụ điện/nước trong N ngày gần nhất. | Query: `days` (mặc định 7) |
| `GET` | `/api/v1/utilities/reports/cumulative` | JWT | Báo cáo tích lũy điện/nước theo tháng/năm (so sánh với chỉ số đầu kỳ). | Query: `type` (`ELECTRICITY` \| `WATER`), `month`, `year` |
| `GET` | `/api/v1/utilities/reports/trend-matrix` | JWT | Báo cáo ma trận xu hướng tiêu thụ chi tiết (theo giờ, ngày, tháng, năm). | Query: `type`, `viewMode`, `day`, `month`, `year`, `startYear`, `endYear` |

---

### 4.10. THỐNG KÊ, BÁO CÁO & CHỈ SỐ KPI (ANALYTICS & KPI ENGINE)
Controller: `AnalyticsController` | Tiền tố: `/analytics`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/analytics/dashboard` | JWT | Lấy toàn bộ số liệu tổng hợp trên màn hình Trang chủ/Dashboard (tổng thiết bị, sự cố mở, WO chờ xử lý, cảnh báo tồn kho). | Không |
| `GET` | `/api/v1/analytics/kpis` | JWT (Audit Log) | Tính toán chỉ số hiệu suất bảo trì nâng cao: MTBF (thời gian trung bình giữa các sự cố), MTTR (thời gian sửa chữa trung bình), tỷ lệ hoàn thành WO đúng hạn, chi phí bảo trì. Có ghi log kiểm toán truy vết xem báo cáo. | Query: `KpiQueryDto` (`startDate`, `endDate`, `department`, `timezone`, `correlationId`) |
| `GET` | `/api/v1/analytics/operation-logs-report` | JWT | Báo cáo tổng hợp số liệu nhật ký vận hành ca của các dây chuyền và máy móc. | Không |

---

### 4.11. THÔNG BÁO HỆ THỐNG (NOTIFICATIONS)
Controller: `NotificationsController` | Tiền tố: `/notifications`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `GET` | `/api/v1/notifications` | JWT | Lấy danh sách thông báo theo người dùng đăng nhập (thông báo phân công WO mới, duyệt sự cố, cảnh báo bảo trì...). | Tự động lấy user từ token |
| `PATCH` | `/api/v1/notifications/:id/read` | JWT | Đánh dấu một thông báo là đã đọc. | Param: `id` |

---

### 4.12. QUẢN LÝ TỆP ĐÍNH KÈM & MEDIA (ATTACHMENTS)
Controller: `AttachmentsController` | Tiền tố: `/attachments`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `POST` | `/api/v1/attachments` | JWT | Tải lên tệp đính kèm (hình ảnh, tài liệu PDF, bản vẽ...). Hỗ trợ gắn liền với thực thể `Equipment`, `WorkOrder`, `MaintenanceRequest`, `ExecutionLog`. Tự động kiểm tra định dạng và dung lượng qua `FileValidationPipe`. | `multipart/form-data`: `file`, `entityType`, `entityId`, `description`, `photoCategory`... |
| `GET` | `/api/v1/attachments` | JWT | Lấy danh sách các tệp đính kèm thuộc một thực thể cụ thể. | Query: `entityType`, `entityId` |
| `GET` | `/api/v1/attachments/:id/download` | JWT | Tải tệp tin về máy (`Content-Disposition: attachment`). | Param: `id` |
| `GET` | `/api/v1/attachments/:id/view` | JWT | Xem tệp tin trực tiếp trên trình duyệt (`Content-Disposition: inline`). | Param: `id` |
| `DELETE` | `/api/v1/attachments/:id` | JWT | Xóa tệp đính kèm. Hỗ trợ Optimistic Locking qua `expectedVersion`. | Param: `id`, Query: `expectedVersion` |

---

### 4.13. GÓP Ý & BÁO LỖI ỨNG DỤNG (FEEDBACKS)
Controller: `FeedbacksController` | Tiền tố: `/feedbacks`

| Phương thức | Endpoint | Quyền / Auth | Mô tả chức năng | Body / Query chính |
|:---|:---|:---:|:---|:---|
| `POST` | `/api/v1/feedbacks` | JWT | Người dùng gửi góp ý tính năng hoặc báo lỗi phần mềm trực tiếp từ giao diện. | Body: `CreateFeedbackDto` (`title`, `content`, `type`, `pageUrl`, `browserInfo`...) |
| `GET` | `/api/v1/feedbacks` | JWT | Lấy danh sách toàn bộ góp ý/báo lỗi để quản trị viên theo dõi. | Query: `status`, `type`, `search` |
| `GET` | `/api/v1/feedbacks/:id` | JWT | Xem chi tiết một phản hồi. | Param: `id` |
| `PATCH` | `/api/v1/feedbacks/:id` | JWT (Admin) | Cập nhật trạng thái xử lý, câu trả lời giải quyết hoặc phân công người theo dõi. | Body: `UpdateFeedbackDto` |
| `DELETE` | `/api/v1/feedbacks/:id` | JWT (Admin) | Xóa báo cáo góp ý/báo lỗi. | Param: `id` |

---

### 4.14. THIẾT LẬP HỆ THỐNG & DANH MỤC CHUẨN (SETTINGS & MASTERS)
Controller: `EquipmentCategoryController`, `LocationController`, `ProductionLineController`, `SystemSettingController`, `RolesController`, `ChecklistLibraryController`, `StandardParametersController`, `StandardTechnicalSpecsController`

| Tiền tố Endpoint | Phương thức | Mô tả chức năng |
|:---|:---|:---|
| `/api/v1/equipment-categories` | `GET`, `POST`, `PATCH`, `DELETE` | Quản lý danh mục phân loại thiết bị (Máy phay, Máy đóng nang, Máy dập viên, Nồi hơi...). |
| `/api/v1/locations` | `GET`, `POST`, `PATCH`, `DELETE` | Quản lý danh mục vị trí, nhà xưởng, khu vực phòng sạch đặt máy. |
| `/api/v1/production-lines` | `GET`, `POST`, `PATCH`, `DELETE` | Quản lý danh mục dây chuyền sản xuất (Dây chuyền Nang mềm, Dây chuyền Đóng gói...). |
| `/api/v1/system-settings` | `GET`, `POST` | Xem và cập nhật cấu hình tham số hệ thống toàn cục. |
| `/api/v1/roles` | `GET`, `POST`, `PUT`, `DELETE` | Quản lý danh mục vai trò tùy chỉnh và danh sách quyền gán cho từng vai trò (`permissions` JSON). |
| `/api/v1/checklist-library` | `GET`, `POST`, `PUT`, `DELETE` | Thư viện lưu trữ các câu hỏi, tiêu chí kiểm tra mẫu để tái sử dụng khi tạo checklist. |
| `/api/v1/standard-parameters` | `GET`, `POST`, `PUT`, `DELETE` | Quản lý danh mục thông số vận hành tiêu chuẩn theo ngành (đơn vị đo, ngưỡng an toàn đề xuất). |
| `/api/v1/standard-technical-specs` | `GET`, `POST`, `PUT`, `DELETE` | Quản lý danh mục thông số kỹ thuật cấu hình máy tiêu chuẩn. |

---

## 5. HƯỚNG DẪN TÍCH HỢP & KIỂM THỬ NHANH

1. **Khởi động dịch vụ Backend**:
   ```bash
   cd backend
   npm run start:dev
   ```
2. **Truy cập giao diện tương tác Swagger UI**:
   - Mở trình duyệt tại: `http://localhost:3001/docs`
   - Bấm nút **Authorize** ở góc phải và nhập Bearer Token để thực hiện gọi trực tiếp mọi API mà không cần Postman.
3. **Mẫu gọi API bằng cURL**:
   ```bash
   curl -X GET "http://localhost:3001/api/v1/equipment?limit=10" \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
     -H "Accept: application/json"
   ```
