# CMMS GAP ANALYSIS

## 1. Executive Summary
Báo cáo này đánh giá mức độ hoàn thiện thực tế của hệ thống Quản lý bảo trì máy móc (CMMS) hiện tại thông qua việc kiểm tra mã nguồn (Static Code Analysis) và chạy thử nghiệm. 
Hệ thống có cấu trúc cơ bản khá tốt với Backend (NestJS + Prisma) và Frontend (React + Vite) đều có khả năng build thành công. Tuy nhiên, mức độ sẵn sàng thực tế của sản phẩm cho UAT và môi trường Production còn rất thấp do:
1. Thiếu cơ chế Xác thực & Phân quyền (Authentication & Authorization).
2. Chưa sử dụng Database Transaction ở các luồng sửa chữa, trừ kho, và bảo trì định kỳ, gây rủi ro cao về tính toàn vẹn dữ liệu.
3. Nhiều module quan trọng (User, Technician, Reports, Settings) hoàn toàn là Mock dữ liệu ở Frontend và chưa có API Backend tương ứng.
4. Thiếu hoàn toàn các tầng kiểm định (Validation), xử lý lỗi chuyên sâu (Global Exception Filtering), và viết Test (Unit/Integration/E2E).

---

## 2. Project Structure
Dự án được tổ chức độc lập thành hai thư mục Backend và Frontend riêng biệt trong cùng một thư mục gốc:
*   **Thư mục gốc:** `c:\Users\Admin\Desktop\PJ01`
*   **Thư mục Backend:** `c:\Users\Admin\Desktop\PJ01\backend`
*   **Thư mục Frontend:** `c:\Users\Admin\Desktop\PJ01\frontend`
*   **Package Manager:** Cả hai thư mục đều sử dụng `npm` làm package manager (mỗi bên có `package.json` và `package-lock.json` riêng).
*   **Cấu trúc dự án:** Nhiều dự án độc lập (Multi-project), không phải cấu hình Monorepo (Lerna/Nx/npm workspaces).
*   **Cấu hình môi trường:** Backend sử dụng cấu hình SQLite trực tiếp trong `schema.prisma`. Không có file `.env` mẫu hay cơ chế validate môi trường được tìm thấy.
*   **Thư mục Prisma:** `backend/prisma` (gồm `schema.prisma` và `seed.ts`).
*   **Thư mục Migrations:** Không tồn tại thư mục `migrations`. Cơ sở dữ liệu đang được đồng bộ bằng lệnh `prisma db push`.
*   **Thư mục Test:** Không có thư mục `test` hay các file spec kiểm thử nào ở cả Backend và Frontend.
*   **Thư mục Build:** `backend/dist` và `frontend/dist`.

---

## 3. Technology Stack
*   **Node.js Version:** Yêu cầu tối thiểu >= 18 (sử dụng các tính năng ES2022).
*   **Backend Framework:** NestJS v10.3.0, TypeScript v5.3.3.
*   **Database ORM:** Prisma ORM v5.8.0.
*   **Database Engine:** SQLite (file cơ sở dữ liệu nội bộ tại `backend/prisma/dev.db`).
*   **Frontend Library:** React v18.2.0, Vite v5.0.12, TypeScript v5.3.3, Lucide-React v0.312.0 (icon).
*   **CSS System:** Sử dụng Vanilla CSS viết tay (file `frontend/src/index.css`), không dùng TailwindCSS.

---

## 4. Build, Lint and Test Results
*   **Backend Build:** Thành công (`npm run build` -> `tsc` biên dịch thành công ra thư mục `dist`).
*   **Frontend Build:** Thành công (`npm run build` -> `tsc && vite build` biên dịch thành công không lỗi).
*   **Lint:** Không cấu hình ESLint hay Prettier. Không có script `lint` nào trong cả `backend/package.json` và `frontend/package.json`.
*   **Test:** Không có thư mục hay file kiểm thử nào tồn tại. Không có công cụ Test (Jest, Vitest, Cypress) nào được cài đặt trong dependencies.

---

## 5. Prisma and Database Assessment
*   **Database Engine:** SQLite (`file:./dev.db`).
*   **Số lượng Model:** 7 models (`User`, `Equipment`, `MaintenanceRequest`, `WorkOrder`, `WorkOrderItem`, `MaintenanceSchedule`, `InventoryItem`).
*   **Enum:** SQLite không hỗ trợ kiểu dữ liệu ENUM nguyên bản, vì vậy toàn bộ các trạng thái và độ ưu tiên được định nghĩa dưới dạng chuỗi (`String`) kèm chú thích ở comment (ví dụ: `role String @default("TECHNICIAN")` cho ADMIN, MANAGER, TECHNICIAN, OPERATOR).
*   **Unique Constraints:** Định nghĩa tại `User.email`, `Equipment.code`, `MaintenanceRequest.requestCode`, `WorkOrder.orderCode`, `InventoryItem.itemCode`.
*   **Cascade Delete:** Quan hệ Cascade được định nghĩa từ `Equipment` -> `MaintenanceRequest`, `Equipment` -> `WorkOrder`, `Equipment` -> `MaintenanceSchedule`, `WorkOrder` -> `WorkOrderItem`, `InventoryItem` -> `WorkOrderItem`.
*   **Soft Delete:** Không hỗ trợ. Xóa bản ghi là Hard Delete trực tiếp khỏi Database.
*   **Audit Fields:** Hầu hết các bảng chỉ có `createdAt DateTime @default(now())`, một số bảng có thêm `updatedAt DateTime @updatedAt`. Thiếu các trường audit nghiệp vụ quan trọng như `createdBy`, `updatedBy`.
*   **Version Field (Optimistic Locking):** Không cấu hình trường phiên bản (`version` hoặc `updatedAt` để kiểm tra xung đột ghi đồng thời).
*   **Migration History:** Hoàn toàn trống. Việc triển khai hiện tại dùng `prisma db push` trực tiếp.

---

## 6. Backend Assessment
*   **Kiến trúc:** NestJS Module chuẩn hóa cho từng đối tượng chính. Hệ thống chia tách thành các tầng `Controller` và `Service`.
*   **DTO và Validation:** Hoàn toàn bỏ trống. Mặc dù `class-validator` và `class-transformer` được khai báo trong `package.json`, nhưng các endpoint đều nhận trực tiếp `@Body() data: any` hoặc `@Body() body: any`. Không có Global Validation Pipe nào được khai báo tại `main.ts`.
*   **Authentication & Authorization:** Không tồn tại. Không có Endpoint bảo mật, không có Guard JWT, Session hay phân quyền Role/Permission thực tế trên API.
*   **Database Transaction:** Hoàn toàn thiếu. Các luồng xử lý phức tạp gồm nhiều bước ghi dữ liệu (như phê duyệt yêu cầu bảo trì tạo WO, hoàn thành WO trừ kho vật tư) đều thực hiện tuần tự bằng các lệnh gọi Prisma riêng lẻ. Nếu một bước ở giữa gặp lỗi, dữ liệu trước đó sẽ không được rollback, gây mất tính toàn vẹn dữ liệu nghiêm trọng.
*   **Error Handling:** Phụ thuộc hoàn toàn vào exception mặc định của NestJS. Không có Custom Exception Filter toàn cục để che giấu Stack Trace khi xảy ra lỗi hệ thống (500).

---

## 7. Frontend Assessment
*   **Routing:** Sử dụng state-driven tab switching đơn giản tại [App.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/App.tsx) thông qua biến trạng thái `activeTab` để render component tương ứng. Không sử dụng thư viện Router thực tế như `react-router-dom`.
*   **State Management:** Quản lý cục bộ bằng React `useState` và `useEffect` riêng lẻ tại từng trang. Không có Global State Store (Redux, Zustand) hay Cache Client (React Query).
*   **Theme / Dark Mode:** Hỗ trợ đầy đủ thông qua biến thuộc tính `data-theme` trên phần tử HTML gốc, cấu hình lưu trữ CSS Variables rất tốt.
*   **API Client:** Sử dụng `fetch` API bọc trong đối tượng tiện ích [api.ts](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/services/api.ts). Thiếu cơ chế tự động thử lại (Retry) hay xử lý mã lỗi bảo mật (401/403).
*   **Mock Data:** Nhiều trang quan trọng (`UsersPage`, `TechniciansPage`, `SettingsPage`, `ReportsPage`) hoàn toàn hoạt động bằng dữ liệu tĩnh cứng trên giao diện, không gọi API.
*   **Giao diện & UX:** Giao diện có thiết kế thẩm mỹ cao, trực quan và hiện đại. Tuy nhiên các KPI Card trên trang Dashboard đang bị hardcode giá trị hiển thị, chưa liên kết với dữ liệu thật trả về từ API Analytics.

---

## 8. Module Completion Matrix

| Module | Database | Service | API | Validation | Permission | Frontend | Test | Status | Evidence |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **User** | YES | NO | NO | NO | NO | YES | NO | **MOCK_ONLY** | [UsersPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/UsersPage.tsx) |
| **Equipment** | YES | YES | YES | NO | NO | YES | NO | **PARTIAL** | [equipment.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/equipment/equipment.service.ts), [EquipmentPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/EquipmentPage.tsx) (Trường bảo trì tiếp theo bị hardcode) |
| **Requests** | YES | YES | YES | NO | NO | YES | NO | **COMPLETE** | [requests.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/requests/requests.service.ts), [RequestsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/RequestsPage.tsx) |
| **WorkOrder** | YES | YES | YES | NO | NO | YES | NO | **COMPLETE** | [work-orders.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts), [WorkOrdersPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/WorkOrdersPage.tsx) |
| **WorkOrderItem**| YES | YES | YES | NO | NO | NO | NO | **API_ONLY** | [work-orders.service.ts:addItem()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts#L132) |
| **Schedules** | YES | YES | YES | NO | NO | YES | NO | **COMPLETE** | [schedules.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/schedules/schedules.service.ts), [SchedulesPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/SchedulesPage.tsx) |
| **Checklist** | YES | YES | YES | NO | NO | YES | NO | **PARTIAL** | [ChecklistsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/ChecklistsPage.tsx) (Nút thực hiện lưu kết quả dạng alert, không lưu DB) |
| **InventoryItem** | YES | YES | YES | NO | NO | YES | NO | **COMPLETE** | [inventory.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/inventory/inventory.service.ts), [InventoryPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/InventoryPage.tsx) |
| **Technician** | NO | NO | NO | NO | NO | YES | NO | **MOCK_ONLY** | [TechniciansPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/TechniciansPage.tsx) |
| **Analytics** | YES | YES | YES | NO | NO | YES | NO | **PARTIAL** | [analytics.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/analytics/analytics.service.ts), [Dashboard.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/Dashboard.tsx) (Nhiều KPI và biểu đồ bị hardcode) |
| **Reports** | NO | NO | NO | NO | NO | YES | NO | **MOCK_ONLY** | [ReportsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/ReportsPage.tsx) |
| **Settings** | NO | NO | NO | NO | NO | YES | NO | **MOCK_ONLY** | [SettingsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/SettingsPage.tsx) |

---

## 9. API and Frontend Integration Matrix

| Frontend Page | API Called | Backend Endpoint | Real Data | Mock Data | Error Handling | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Dashboard** | `api.getDashboard()` | `GET /api/analytics/dashboard` | Chi tiết lịch & Yêu cầu | Chỉ số KPI chính, Biểu đồ | `console.error` mặc định | **PARTIAL** |
| **Equipment** | `api.getEquipment()`, `api.createEquipment()`, `api.deleteEquipment()` | `GET /api/equipment`, `POST /api/equipment`, `DELETE /api/equipment/:id` | Danh sách, Thêm, Xóa | Cột Ngày bảo trì định kỳ tiếp | `console.error`, alert | **PARTIAL** |
| **Requests** | `api.getRequests()`, `api.createRequest()`, `api.approveRequest()`, `api.rejectRequest()` | `GET /api/requests`, `POST /api/requests`, `POST /api/requests/:id/approve`, `POST /api/requests/:id/reject` | Đầy đủ | Không | `console.error`, alert | **COMPLETE** |
| **Work Orders** | `api.getWorkOrders()`, `api.createWorkOrder()`, `api.updateWorkOrderStatus()` | `GET /api/work-orders`, `POST /api/work-orders`, `PUT /api/work-orders/:id/status` | Danh sách WO, Cập nhật trạng thái | Cột Ngày đến hạn, Loại WO | `console.error`, alert | **COMPLETE** |
| **Spare Parts** | `api.getInventory()` | `GET /api/inventory` | Danh sách phụ tùng | Bảng KPI, Banner cảnh báo | `console.error`, alert | **PARTIAL** |
| **Inventory** | `api.getInventory()`, `api.createInventory()`, `api.adjustInventoryStock()`, `api.deleteInventory()` | `GET /api/inventory`, `POST /api/inventory`, `POST /api/inventory/:id/adjust`, `DELETE /api/inventory/:id` | Đầy đủ | Không | `console.error`, alert | **COMPLETE** |
| **Schedules** | `api.getSchedules()`, `api.createSchedule()`, `api.generateWorkOrderFromSchedule()`, `api.deleteSchedule()` | `GET /api/schedules`, `POST /api/schedules`, `POST /api/schedules/:id/generate`, `DELETE /api/schedules/:id` | Đầy đủ | Không | `console.error`, alert | **COMPLETE** |
| **Checklists** | `api.getSchedules()` | `GET /api/schedules` | Danh sách lịch | Kết quả làm checklist, Cột Tỷ lệ đạt | `console.error` | **PARTIAL** |
| **Reports** | Không | Không | Không | Toàn bộ dữ liệu & Biểu đồ | Không | **MOCK_ONLY** |
| **Users** | Không | Không | Không | Toàn bộ danh sách & Vai trò | Không | **MOCK_ONLY** |
| **Technicians** | Không | Không | Không | Toàn bộ danh sách & Chỉ số | Không | **MOCK_ONLY** |
| **Settings** | Không | Không | Không | Toàn bộ tham số cấu hình | Không | **MOCK_ONLY** |

---

## 10. Corrective Maintenance Flow Assessment
Luồng bảo trì khắc phục sự cố (Corrective Maintenance) vận hành cơ bản qua các bước:
1.  Báo sự cố tại [RequestsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/RequestsPage.tsx).
2.  Phê duyệt yêu cầu chuyển thành Phiếu bảo trì (`WorkOrder`) và chuyển thiết bị sang trạng thái `UNDER_MAINTENANCE` tại [requests.service.ts:approve()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/requests/requests.service.ts#L66).
3.  Cập nhật trạng thái hoàn tất (`COMPLETED`) và tự động chuyển thiết bị về `OPERATIONAL`, đồng thời trừ kho vật tư sử dụng tại [work-orders.service.ts:updateStatus()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts#L89).

**Các khoảng trống & rủi ro phát hiện:**
*   **Không có Database Transaction:** Việc tạo `WorkOrder`, cập nhật trạng thái `MaintenanceRequest`, và thay đổi trạng thái của `Equipment` xảy ra tuần tự. Nếu bước 3 thất bại, hệ thống sẽ rơi vào trạng thái không nhất quán (Yêu cầu đã được phê duyệt nhưng Thiết bị không chuyển sang `UNDER_MAINTENANCE`).
*   **Trạng thái Kỹ thuật viên bị hardcode:** Không có cơ chế ràng buộc kỹ thuật viên thật với bảng User. Người duyệt chỉ nhập tên kỹ thuật viên dưới dạng text tự do.
*   **Không kiểm soát phê duyệt trùng lặp:** Không có cơ chế chặn việc gửi phê duyệt nhiều lần trên cùng một Yêu cầu bảo trì đã được xử lý (`APPROVED`/`REJECTED`).
*   **Bỏ qua bước trạng thái:** Trạng thái của `WorkOrder` có thể cập nhật trực tiếp qua API `PUT /api/work-orders/:id/status` mà không cần đi qua tuần tự State Machine (`PENDING` -> `IN_PROGRESS` -> `INSPECTION` -> `COMPLETED`).
*   **Không có lịch sử trạng thái (State History) và Audit Trail:** Không ghi nhận ai đã chuyển đổi trạng thái và thời gian chính xác của từng bước chuyển đổi để đối chiếu thời gian chết (Downtime).

---

## 11. Preventive Maintenance Flow Assessment
Luồng bảo trì phòng ngừa (Preventive Maintenance) vận hành qua cơ chế:
1.  Tạo Kế hoạch bảo trì định kỳ (`MaintenanceSchedule`) tại [SchedulesPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/SchedulesPage.tsx).
2.  Kích hoạt sinh phiếu bảo trì thủ công bằng nút bấm hoặc API `POST /api/schedules/:id/generate`. Hệ thống sẽ sinh ra một `WorkOrder` tương ứng và tự động tính toán, cập nhật hạn đến ngày tiếp theo (`nextDueDate`) tại [schedules.service.ts:triggerWorkOrder()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/schedules/schedules.service.ts#L43).

**Các khoảng trống & rủi ro phát hiện:**
*   **Thiếu Scheduler tự động (Cron Job):** Hệ thống không có tiến trình chạy ngầm (Cron / Background Worker) để quét định kỳ và tự động sinh phiếu bảo trì khi tới ngày `nextDueDate`. Việc sinh phiếu phụ thuộc hoàn toàn vào thao tác bấm nút thủ công của con người ở Frontend.
*   **Nguy cơ tạo trùng lặp (No Idempotency):** Không có cơ chế khóa (Lock) hay kiểm tra điều kiện trùng lặp. Người dùng có thể bấm nút "Sinh phiếu WO ngay" liên tiếp nhiều lần trên cùng một Schedule, tạo ra hàng loạt `WorkOrder` giống hệt nhau cho cùng một ngày bảo trì.
*   **Thiếu Transaction:** Việc tạo `WorkOrder` từ kế hoạch định kỳ và tính toán cộng ngày cho `nextDueDate` không nằm trong một transaction. Nếu cập nhật ngày tiếp theo lỗi, hệ thống sẽ liên tục sinh ra các phiếu trùng cho ngày cũ.

---

## 12. Inventory Flow Assessment
Luồng xuất kho vật tư phụ tùng vận hành bằng cách:
1.  Khai báo danh sách vật tư khi tạo Phiếu bảo trì qua API `POST /api/work-orders` (trường `items` trong body) hoặc thêm lẻ qua API `POST /api/work-orders/:id/items`.
2.  Khi hoàn thành Phiếu bảo trì (`COMPLETED`), hệ thống sẽ duyệt qua danh sách các `WorkOrderItem` để giảm số lượng tồn kho của `InventoryItem` tương ứng tại [work-orders.service.ts:updateStatus()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts#L105).

**Các khoảng trống & rủi ro phát hiện:**
*   **Tồn kho âm (Negative Stock):** Hệ thống KHÔNG kiểm tra xem số lượng tồn kho hiện tại có đủ để đáp ứng yêu cầu xuất kho hay không. Điều này dẫn đến việc số lượng tồn kho của vật tư có thể bị âm tự do trong cơ sở dữ liệu.
*   **Trừ kho lặp lại:** Khi cập nhật trạng thái phiếu bảo trì, hệ thống kiểm tra `if (oldStatus !== 'COMPLETED')` mới trừ kho. Tuy nhiên, nếu cập nhật trạng thái từ `COMPLETED` sang `IN_PROGRESS` rồi quay lại `COMPLETED`, vật tư sẽ bị trừ kho lần thứ hai.
*   **Không có lịch sử giao dịch kho (Inventory Transaction):** Không có bảng ghi log chi tiết lịch sử Nhập/Xuất kho (ví dụ: ngày giờ xuất, xuất cho phiêu WO nào, ai thực hiện, số lượng trước/sau biến động). Điều này làm mất khả năng đối soát kho định kỳ.
*   **Giá vật tư không cố định:** Khi thêm vật tư vào phiếu, hệ thống lấy `unitPrice` tại thời điểm tạo. Nhưng giá trị này không được bảo vệ khi cập nhật hoặc sửa đổi.

---

## 13. Data Integrity Risks

### 13.1. Thiếu Database Transaction
*   **Bằng chứng:** Trong [requests.service.ts:approve()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/requests/requests.service.ts#L66) và [work-orders.service.ts:updateStatus()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts#L89), các lệnh ghi dữ liệu diễn ra độc lập mà không có khối `prisma.$transaction`.
*   **Tác động:** Khi gặp sự cố mạng hoặc tắt server đột ngột giữa chừng, dữ liệu sẽ bị mâu thuẫn (thiết bị hoạt động nhưng phiếu bảo trì vẫn ở trạng thái sửa chữa, hoặc ngược lại).
*   **Mức độ:** `CRITICAL`
*   **Hướng xử lý:** Chuyển đổi toàn bộ các hàm xử lý nghiệp vụ liên chuỗi sang sử dụng `prisma.$transaction([...])`.

### 13.2. Rủi ro Tồn kho âm
*   **Bằng chứng:** Hàm `updateStatus()` trong [work-orders.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts#L117) chỉ chạy lệnh update `decrement` số lượng vật tư mà không kiểm tra số lượng hiện hữu có lớn hơn hoặc bằng lượng cần xuất hay không.
*   **Tác động:** Số lượng kho vật tư bị âm, gây sai lệch báo cáo kế toán kho và mua sắm vật tư.
*   **Mức độ:** `HIGH`
*   **Hướng xử lý:** Bổ sung logic kiểm tra tồn kho trước khi thực hiện trừ kho. Nếu không đủ hàng, chặn việc chuyển trạng thái sang `COMPLETED` và trả về mã lỗi `400 Bad Request`.

### 13.3. Mất dữ liệu do Cascade Delete quá mức
*   **Bằng chứng:** Trong file [schema.prisma](file:///c:/Users/Admin/Desktop/PJ01/backend/prisma/schema.prisma#L44), quan hệ giữa `Equipment` với `MaintenanceRequest`, `WorkOrder`, và `MaintenanceSchedule` đều có thuộc tính `onDelete: Cascade`.
*   **Tác động:** Khi người dùng vô tình xóa một thiết bị (`Equipment`), toàn bộ dữ liệu lịch sử bảo trì, sự cố, chi phí và lịch trình gắn liền với thiết bị đó trong nhiều năm qua sẽ bị xóa sạch vĩnh viễn không thể khôi phục.
*   **Mức độ:** `HIGH`
*   **Hướng xử lý:** Thay đổi cơ chế từ `onDelete: Cascade` sang `onDelete: Restrict` (chỉ cho phép xóa thiết bị khi đã dọn sạch liên kết) hoặc chuyển sang giải pháp Soft Delete (đánh dấu ẩn thiết bị).

---

## 14. Business Workflow Risks

### 14.1. Sinh trùng lặp phiếu bảo trì định kỳ (Race Condition)
*   **Bằng chứng:** [schedules.service.ts:triggerWorkOrder()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/schedules/schedules.service.ts#L43) không kiểm tra trạng thái hay giới hạn thời gian giữa các lần tạo phiếu.
*   **Tác động:** Sinh nhiều phiếu bảo trì trùng lặp cho cùng một ca kiểm tra, làm phiền nhiễu và sai lệch dữ liệu phân công công việc của kỹ thuật viên.
*   **Mức độ:** `MEDIUM`
*   **Hướng xử lý:** Bổ sung trường `lastGeneratedAt` để đối chiếu, chặn việc sinh phiếu mới nếu thời gian giãn cách chưa đủ lớn hoặc đã có một phiếu bảo trì chưa hoàn thành gắn với lịch đó.

### 14.2. Trạng thái thiết bị cập nhật sai thời điểm
*   **Bằng chứng:** Khi tạo Yêu cầu bảo trì khẩn cấp (`HIGH` hoặc `URGENT`), trạng thái của thiết bị lập tức bị cập nhật sang `INCIDENT` trong [requests.service.ts:create()](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/requests/requests.service.ts#L44). Tuy nhiên, nếu yêu cầu đó bị từ chối (`REJECTED`), trạng thái của thiết bị không được chuyển ngược về hoạt động bình thường.
*   **Tác động:** Thiết bị bị kẹt vĩnh viễn ở trạng thái báo lỗi mặc dù yêu cầu sửa chữa đã bị bác bỏ.
*   **Mức độ:** `HIGH`
*   **Hướng xử lý:** Cập nhật lại trạng thái thiết bị sang `OPERATIONAL` khi thực hiện bác bỏ (`REJECTED`) yêu cầu bảo trì.

---

## 15. Security Risks

### 15.1. Endpoint hoàn toàn mở (Bảo mật 0%)
*   **Bằng chứng:** Không có bất kỳ cơ chế xác thực JWT hay Passport Guard nào được cài đặt trong bất cứ Controller nào ở Backend. CORS được mở rộng tối đa `origin: '*'` trong [main.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/main.ts#L9).
*   **Tác động:** Bất cứ ai biết địa chỉ IP của backend đều có thể gửi HTTP request để sửa đổi trạng thái thiết bị, xóa dữ liệu, làm rỗng kho vật tư, hoặc phá hủy toàn bộ hệ thống mà không cần đăng nhập.
*   **Mức độ:** `CRITICAL`
*   **Hướng xử lý:** Triển khai module Đăng nhập bằng JWT, phân quyền vai trò (RBAC) trên từng endpoint thông qua NestJS Guards.

### 15.2. Lộ Stack Trace lỗi hệ thống
*   **Bằng chứng:** Thiếu NestJS Exception Filter toàn cục để định dạng lại phản hồi lỗi.
*   **Tác động:** Khi ứng dụng gặp lỗi cú pháp database hoặc lỗi code 500, chi tiết mã lỗi nguồn và cấu trúc đường dẫn file nội bộ trên máy chủ sẽ được gửi trực tiếp về cho Client, giúp hacker dễ dàng dò tìm lỗ hổng bảo mật.
*   **Mức độ:** `MEDIUM`
*   **Hướng xử lý:** Viết global `AllExceptionsFilter` để ẩn stack trace trên môi trường production, chỉ log lại lỗi chi tiết trên file log máy chủ.

### 15.3. Thiếu Validation và Nguy cơ Mass Assignment
*   **Bằng chứng:** Toàn bộ dữ liệu gửi lên API đều ép kiểu `any` mà không qua DTO hay Class-validator.
*   **Tác động:** Người dùng có thể truyền thêm các tham số độc hại trong body để ghi đè các trường nhạy cảm như khóa ngoại `id`, `createdAt`, `requestCode` đã được tạo tự động.
*   **Mức độ:** `HIGH`
*   **Hướng xử lý:** Xây dựng các lớp DTO chi tiết, bật chế độ `whitelist: true` và `forbidNonWhitelisted: true` trong Global ValidationPipe của NestJS.

---

## 16. Test Coverage Gaps
*   **Hiện trạng:** Hệ thống có **0% Test Coverage**. Không có một file kiểm thử tự động nào được viết cho cả Backend và Frontend.
*   **Hậu quả:** Khi tiến hành refactor hoặc viết thêm các chức năng mới, việc kiểm tra thủ công toàn bộ luồng nghiệp vụ rất tốn thời gian và dễ bỏ sót lỗi nghiêm trọng, đặc biệt là các logic tính toán tồn kho và chi phí bảo trì.

---

## 17. SQLite to MySQL Readiness
Hiện tại, hệ thống sử dụng SQLite. Việc chuyển đổi sang MySQL để chạy production là cần thiết nhưng cần lưu ý các điểm sau:
1.  **Provider Prisma:** Phải đổi `provider = "sqlite"` thành `provider = "mysql"` trong `schema.prisma`.
2.  **Date/Time Fields:** SQLite quản lý DateTime bằng chuỗi ISO. MySQL quản lý bằng kiểu `DATETIME`. Cần đảm bảo các giá trị mặc định `@default(now())` tương thích tốt.
3.  **Hỗ trợ Enum:** SQLite không có ENUM nên schema hiện tại định nghĩa dạng chuỗi `String`. Khi chuyển sang MySQL, các trường trạng thái nên được nâng cấp thành kiểu `@db.VarChar(50)` hoặc `Enum` thực của MySQL để tăng tính tối ưu và chặt chẽ của dữ liệu.
4.  **Cơ chế Autofill & UUID:** SQLite sinh ID UUID qua `@default(uuid())` hoạt động giống với MySQL.
5.  **Khả năng tương thích:** Hệ thống không dùng các hàm đặc thù của SQLite, do đó việc chuyển đổi khá thuận tiện.
*   **Đánh giá mức độ sẵn sàng:** **`READY_WITH_MINOR_CHANGES`** (Cần đổi cấu hình provider trong schema, tạo file môi trường chứa chuỗi kết nối MySQL và chạy sinh lại migrations mới).

---

## 18. UAT Readiness Assessment

| Nhóm đánh giá | Trọng số | Điểm đạt | Nhận xét |
| :--- | :---: | :---: | :--- |
| **Core Business Flow** | 25% | 15% | Đã kết nối cơ bản luồng Báo hỏng -> Tạo WO -> Hoàn thành. Tuy nhiên, luồng Bảo trì định kỳ chưa tự động hóa (chưa có cron) và thiếu quy trình checklist thực tế. |
| **Data Integrity** | 20% | 5% | Có rủi ro tồn kho âm, không có transaction phục hồi dữ liệu khi một bước lỗi, và rủi ro mất dữ liệu do Cascade Delete quá mức. |
| **Security and Permission** | 15% | 0% | Hoàn toàn chưa có hệ thống Authentication, Authorization hay bảo mật API nào. |
| **Frontend Integration** | 15% | 10% | Đã liên kết API cho các nghiệp vụ lõi, nhưng các trang cốt lõi khác (Users, Technicians, Reports, Settings) vẫn là Mock dữ liệu tĩnh. Dashboard bị hardcode KPI. |
| **Testing** | 15% | 0% | Không có bất kỳ test unit hay test tích hợp nào. |
| **Deployment Readiness** | 10% | 5% | Biên dịch ứng dụng thành công, tuy nhiên chưa cấu hình biến môi trường (`.env`), database đang chạy SQLite cục bộ chưa tối ưu cho deploy production. |
| **TỔNG ĐIỂM ĐẠT** | **100%** | **35%** | **Hệ thống chưa đủ điều kiện tối thiểu để tiến hành UAT.** |

*   **Kết luận:** **`NOT_READY_FOR_UAT`**

---

## 19. P0 Implementation Plan
Để hệ thống đủ điều kiện tối thiểu chạy UAT và đảm bảo chất lượng, các hạng mục P0 sau đây cần được triển khai theo thứ tự ưu tiên:

| Thứ tự | Hạng mục | Lý do ưu tiên | Phạm vi dự kiến | Rủi ro nếu chưa làm | Điều kiện hoàn thành |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Authentication & RBAC** | Bảo vệ hệ thống khỏi truy cập trái phép trước khi kiểm thử. | Tạo JWT Auth, Module Đăng nhập/Đăng ký, Guards kiểm tra vai trò (ADMIN, MANAGER, TECHNICIAN). | Dữ liệu bị giả mạo hoặc xóa sạch bởi các request nặc danh. | Có màn hình đăng nhập, chỉ người có tài khoản mới gọi được API, chặn phân quyền đúng theo vai trò. |
| **2** | **Database Transactions** | Đảm bảo tính toàn vẹn dữ liệu cho các thao tác phức tạp. | Bọc các luồng Phê duyệt yêu cầu bảo trì, Hoàn thành phiếu sửa chữa và trừ kho trong `prisma.$transaction`. | Dữ liệu bị nửa vời, sai lệch trạng thái thiết bị và hóa đơn vật tư khi xảy ra lỗi đột ngột. | Khi một bước trong luồng phê duyệt hoặc hoàn thành WO lỗi, toàn bộ dữ liệu được quay về trạng thái cũ. |
| **3** | **Inventory Validation** | Ngăn chặn lỗi tồn kho âm. | Bổ sung hàm kiểm tra số lượng tồn trước khi xuất kho tại [work-orders.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts). | Tồn kho phụ tùng bị âm vô hạn, làm sai dữ liệu kiểm kho thực tế. | Trả lỗi `400 Bad Request` và chặn hoàn thành WO nếu một trong các linh kiện yêu cầu không đủ số lượng trong kho. |
| **4** | **API Validation (DTOs)** | Chống lỗi định dạng dữ liệu và Mass Assignment. | Định nghĩa các class DTO cho Request Body, tích hợp `ValidationPipe` toàn cục. | Người dùng truyền dữ liệu sai định dạng làm lỗi ứng dụng (500) hoặc ghi đè trái phép các trường nhạy cảm. | Mọi request sai kiểu dữ liệu đều bị chặn ở cửa ngõ controller và trả về chi tiết lỗi định dạng (400). |
| **5** | **Bảo trì Định kỳ Tự động** | Tự động hóa kế hoạch bảo trì. | Tích hợp `@nestjs/schedule` để định kỳ quét ngày `nextDueDate` và sinh phiếu bảo trì tự động. | Bỏ lỡ lịch bảo dưỡng thiết bị do không có ai nhấn nút kích hoạt thủ công. | Phiếu bảo trì tự động xuất hiện trên danh sách WO khi đến hạn mà không cần nhấn nút thủ công. |

---

## 20. Files Inspected
Các file mã nguồn quan trọng đã được đọc và phân tích trực tiếp:
1.  [schema.prisma](file:///c:/Users/Admin/Desktop/PJ01/backend/prisma/schema.prisma) - Cấu trúc dữ liệu và liên kết quan hệ database.
2.  [seed.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/prisma/seed.ts) - Quy trình dọn dẹp và nạp dữ liệu mẫu ban đầu.
3.  [main.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/main.ts) - Điểm khởi chạy backend, cấu hình CORS.
4.  [app.module.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/app.module.ts) - Khai báo cấu trúc NestJS module.
5.  [requests.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/requests/requests.service.ts) - Nghiệp vụ phê duyệt và tạo WO sửa chữa.
6.  [work-orders.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/work-orders/work-orders.service.ts) - Xử lý trạng thái và trừ kho vật tư.
7.  [schedules.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/schedules/schedules.service.ts) - Lập kế hoạch bảo trì định kỳ.
8.  [inventory.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/inventory/inventory.service.ts) - Quản lý nhập xuất vật tư phụ tùng.
9.  [analytics.service.ts](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/analytics/analytics.service.ts) - Tổng hợp chỉ số KPI cho Dashboard.
10. [api.ts](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/services/api.ts) - Đầu nối API Client của Frontend.
11. [App.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/App.tsx) - Điểm đầu vào giao diện và router.
12. [Dashboard.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/Dashboard.tsx) - Màn hình tổng quan với KPI hardcode.
13. [UsersPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/UsersPage.tsx) - Trang quản trị tài khoản (Mock).
14. [TechniciansPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/TechniciansPage.tsx) - Trang kỹ thuật viên (Mock).
15. [SettingsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/SettingsPage.tsx) - Trang cấu hình hệ thống (Mock).
16. [ReportsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/ReportsPage.tsx) - Trang biểu đồ báo cáo (Mock).
17. [ChecklistsPage.tsx](file:///c:/Users/Admin/Desktop/PJ01/frontend/src/pages/ChecklistsPage.tsx) - Giao diện chạy checklist bảo dưỡng.

---

## 21. Commands Executed
Các lệnh đã được thực thi trực tiếp trên hệ thống để đánh giá:
1.  `npx prisma validate` - Xác thực cấu trúc file schema của Prisma (Kết quả: Hợp lệ).
2.  `npx prisma generate` - Tạo lớp client truy vấn cơ sở dữ liệu (Kết quả: Thành công).
3.  `npx prisma migrate status` - Kiểm tra lịch sử migration (Kết quả: Báo lỗi do database không quản lý bằng migrations mà bằng db push).
4.  `npm run build` (Backend) - Biên dịch dự án NestJS (Kết quả: Thành công).
5.  `npm run build` (Frontend) - Biên dịch ứng dụng React bằng Vite (Kết quả: Thành công).

---

## 22. Final Conclusion
Hệ thống CMMS hiện tại mới chỉ đạt trạng thái của một bản **Prototype nâng cao (Advanced Prototype)**: giao diện trực quan bắt mắt và các API backend nghiệp vụ cơ bản đã được viết, nhưng hoàn toàn thiếu các yếu tố cốt lõi của một phần mềm an toàn dùng cho doanh nghiệp (Xác thực, Kiểm soát dữ liệu, Transaction bảo vệ, Scheduler tự động). 

Do đó, **không đủ điều kiện UAT** ở thời điểm hiện tại. Đề xuất tập trung khắc phục ngay 5 nhóm công việc trong **Kế hoạch P0** trước khi tiến hành bàn giao thử nghiệm.
