# Kế hoạch triển khai Bước 2 – Ổn định dữ liệu và luồng nghiệp vụ cốt lõi (Cập nhật - Bản hoàn chỉnh)

## 1. Chiến lược Baseline Migration cho Database hiện tại
Hệ thống hiện tại đang sử dụng `prisma db push` mà không có thư mục migrations. Để chuyển đổi an toàn sang cơ chế migration chính thức:
1.  **Sao lưu dữ liệu:** Nhân bản tệp `backend/prisma/dev.db` thành tệp dự phòng `backend/prisma/dev.db.bak`.
2.  **Chạy thử nghiệm migration trên bản sao:** Tạo một database phụ thử nghiệm để áp dụng migration trước khi chạy trên database chính thức.
3.  **Tạo Baseline Migration:**
    *   Tạo migration ban đầu dựa trên schema hiện tại mà không chạy lệnh sửa đổi thực tế:
        ```bash
        npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql
        mkdir -p prisma/migrations/0_baseline
        mv baseline.sql prisma/migrations/0_baseline/migration.sql
        npx prisma migrate resolve --applied 0_baseline
        ```
4.  **Tạo Migration thay đổi cho Bước 2:**
    *   Thực hiện chỉnh sửa `schema.prisma` và chạy `npx prisma migrate dev --name add_core_integrity_tables_and_columns`.
    *   Các cột mới thêm vào các bảng hiện có đều bắt buộc phải là Nullable hoặc có giá trị mặc định (`@default(1)` cho `version`) để bảo vệ dữ liệu cũ.

## 2. Thiết kế chi tiết WorkflowHistory
Bảng `WorkflowHistory` được sử dụng để ghi nhận toàn bộ vòng đời trạng thái của các thực thể nghiệp vụ:
```prisma
model WorkflowHistory {
  id            String   @id @default(uuid())
  entityType    String   // "MaintenanceRequest", "WorkOrder", "MaintenanceSchedule"
  entityId      String
  action        String   // "APPROVE", "REJECT", "ASSIGN", "START", "PAUSE", "RESUME", "COMPLETE", "VERIFY", "REOPEN", "CLOSE", "CANCEL", "GENERATE"
  fromStatus    String?
  toStatus      String?
  performedById String?  // Cho phép Nullable vì chưa có hệ thống Auth ở bước này.
  comment       String?
  reason        String?
  metadata      String?  // JSON string chứa thông tin debug/bổ sung, không chứa dữ liệu nhạy cảm
  createdAt     DateTime @default(now())
}
```
*   **Quy tắc bảo mật:** Không tin tưởng `performedBy` gửi từ Frontend dưới dạng danh tính đã xác thực.
*   **Các hành động bắt buộc ghi lịch sử:** Phê duyệt yêu cầu sửa chữa, từ chối yêu cầu, giao việc kỹ thuật viên, bắt đầu, tạm dừng, tiếp tục, hoàn thành, nghiệm thu (verify), mở lại (reopen), đóng phiếu (close), hủy phiếu (cancel), sinh phiếu định kỳ (generate).

## 3. Thiết kế Chuẩn hóa InventoryTransaction
```prisma
enum InventoryTransactionType {
  ISSUE
  RETURN
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
}

model InventoryTransaction {
  id              String                   @id @default(uuid())
  inventoryItemId String
  inventoryItem   InventoryItem            @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  workOrderId     String?
  workOrder       WorkOrder?               @relation(fields: [workOrderId], references: [id], onDelete: SetNull)
  workOrderItemId String?
  transactionType InventoryTransactionType
  quantity        Int
  unitPrice       Float
  totalAmount     Float
  quantityBefore  Int
  quantityAfter   Int
  createdAt       DateTime                 @default(now())
  reference       String?

  @@unique([workOrderItemId, transactionType])
}
```
*   **Giải thích ràng buộc:** `@@unique([workOrderItemId, transactionType])` đảm bảo một `WorkOrderItem` có tối đa **một** giao dịch `ISSUE` (trừ kho) và có thể phát sinh thêm các giao dịch `RETURN` riêng biệt khi hoàn trả linh kiện thừa về kho.
*   **Xử lý Nullable trên SQLite/MySQL:** Các giao dịch điều chỉnh kho tự do (`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`) sẽ có `workOrderItemId = null`. Vì giá trị `null` được coi là không bằng nhau (`NULL != NULL`), cả SQLite và MySQL đều cho phép lưu nhiều bản ghi điều chỉnh kho tự do mà không vi phạm ràng buộc unique.

## 4. Tách biệt EquipmentStatusService
Tạo service riêng biệt tại `backend/src/modules/equipment/equipment-status.service.ts` chịu trách nhiệm tính toán động trạng thái của thiết bị (`Equipment`):
*   Quét toàn bộ Work Order đang mở (`IN_PROGRESS`, `ON_HOLD`) để cập nhật trạng thái `INCIDENT` (nếu có độ ưu tiên cao/khẩn cấp) hoặc `UNDER_MAINTENANCE` (nếu độ ưu tiên trung bình/thấp).
*   Quét các Yêu cầu sửa chữa đang chờ xử lý (`PENDING`) có độ ưu tiên cao để cập nhật trạng thái thiết bị sang `INCIDENT`.
*   Nếu không còn công việc sửa chữa hay yêu cầu khẩn cấp nào mở, thiết bị mới được cập nhật về `OPERATIONAL`.
*   Các dịch vụ `RequestsService`, `WorkOrdersService`, `SchedulesService` sẽ inject và gọi service này thay vì tự động cập nhật cứng trạng thái thiết bị về `OPERATIONAL`.

## 5. Phân biệt DTO Validation và Business Validation
*   **DTO Validation (Thực hiện tại Controller thông qua class-validator):**
    *   Kiểm tra cú pháp dữ liệu: kiểu dữ liệu, các trường bắt buộc, độ dài ký tự, giới hạn khoảng của số lượng (>0) và giá (>=0), định dạng ngày tháng ISO.
    *   Sử dụng whitelist để loại bỏ các trường hệ thống không cho phép truyền từ client (`id`, `createdAt`, `requestCode`, `orderCode`).
*   **Business Validation (Thực hiện tại Service / Domain layer):**
    *   Kiểm tra tính logic và sự tồn tại: Thiết bị có tồn tại/hoạt động không?
    *   Kiểm tra trạng thái nghiệp vụ: Work Order có đúng trạng thái để chuyển tiếp không? Work Order đã đóng thì chặn việc thêm vật tư.
    *   Kiểm tra tồn kho: Đảm bảo số lượng hàng trong kho đủ đáp ứng trước khi xuất.
    *   Kiểm tra tính sẵn sàng của lịch trình, checklist bắt buộc phải hoàn thành trước khi chuyển trạng thái.

## 6. Chống Tạo trùng lặp (Idempotency) cho Kế hoạch Định kỳ (Schedule)
*   Chuẩn hóa `scheduledDueDate` về múi giờ UTC lúc nửa đêm (`00:00:00.000Z`) để loại bỏ sai lệch lệch múi giờ.
*   Enforce ràng buộc `@@unique([scheduleId, scheduledDueDate])` trên bảng `WorkOrder` để chặn hoàn toàn việc tạo trùng lặp.
*   Bọc toàn bộ luồng sinh phiếu trong transaction để rollback nếu cập nhật `nextDueDate` thất bại.

## 7. Optimistic Locking
Bổ sung `version Int @default(1)` vào các thực thể chính. Cập nhật dữ liệu quan trọng bắt buộc lọc theo `{ id, version: expectedVersion }` và tự động tăng `version` nguyên tử. Nếu không khớp sẽ throw `409 Conflict`.

## 8. Xử lý API kế thừa (PUT Status)
Endpoint `PUT /work-orders/:id/status` sẽ được đánh dấu là `@deprecated`. Tuy nhiên, để tương thích ngược, endpoint này sẽ chuyển hướng cuộc gọi sang hàm kiểm tra nghiệp vụ và xử lý tương ứng của từng action trên State Machine để bảo vệ quy tắc nghiệp vụ.

## 9. Mở rộng kiểm thử tự động đồng thời (Concurrent Tests)
Tạo cơ sở dữ liệu test riêng (`test.db`) và viết các bài kiểm thử:
*   **Concurrent Request Approval:** Giả lập 2 request phê duyệt đồng thời cho 1 Yêu cầu sửa chữa $\rightarrow$ Chỉ 1 thành công, 1 trả về 409, chỉ có duy nhất 1 Work Order được sinh ra.
*   **Concurrent WO Completion:** Giả lập 2 request cùng bấm hoàn thành 1 WO đồng thời $\rightarrow$ Chỉ 1 thành công, kho chỉ bị trừ 1 lần duy nhất, tạo đúng 1 giao dịch `ISSUE`.
*   **Concurrent Schedule Generation:** Giả lập 2 request cùng kích hoạt sinh phiếu từ 1 kỳ bảo trì định kỳ $\rightarrow$ Chỉ 1 Work Order được tạo, `nextDueDate` chỉ cập nhật 1 lần.

## 10. Verification Plan
*   **Database:** `npx prisma validate` & `npx prisma migrate status`.
*   **Backend Build & Test:** `npm run build` & `npm test`.
*   **Frontend Build:** `npm run build`.
