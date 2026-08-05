# Database Migration Impact Assessment

## 1. Current Database State
*   **Database Engine:** SQLite (`dev.db`).
*   **WorkOrder Status Counts:**
    *   `IN_PROGRESS`: 2 bản ghi
    *   Các trạng thái khác (`PENDING`, `COMPLETED`, `CANCELLED`): 0 bản ghi
*   **MaintenanceRequest Status Counts:**
    *   `APPROVED`: 1 bản ghi
    *   `PENDING`: 1 bản ghi
    *   Các trạng thái khác: 0 bản ghi
*   **INSPECTION status usage:** Đã quét toàn bộ mã nguồn. Có sử dụng trong logic API lọc của `findAll` nhưng hiện tại trong cơ sở dữ liệu `dev.db` **không có bản ghi nào** ở trạng thái `INSPECTION`. Do đó, việc chuyển đổi trạng thái cũ sang trạng thái mới sẽ không gây mất mát dữ liệu hoặc lỗi tương thích.

## 2. Backup Strategy
Trước khi thực hiện migration, bản sao của `backend/prisma/dev.db` sẽ được tạo ra tại `backend/prisma/dev.db.bak` bằng lệnh sao chép hệ thống.

## 3. Baseline Strategy
Dự án hiện đang chạy bằng `prisma db push`. Chiến lược baseline:
1.  Sử dụng `prisma migrate diff` để sinh mã SQL baseline từ schema hiện tại.
2.  Tạo thư mục migration baseline `prisma/migrations/0_baseline` và lưu tệp `migration.sql` vào đó.
3.  Chạy `npx prisma migrate resolve --applied 0_baseline` để đánh dấu database hiện tại đã được áp dụng baseline mà không cần chạy lại các câu lệnh tạo bảng.

## 4. Models Changed
*   `MaintenanceRequest`: Bổ sung trường `version`.
*   `WorkOrder`: Bổ sung trường `version`, `completedAt`, `verifiedAt`, `closedAt`, `scheduleId`, `scheduledDueDate`. Trường `requestId` được thiết lập duy nhất (`@unique`).
*   `MaintenanceSchedule`: Bổ sung trường `version`.
*   `InventoryItem`: Bổ sung trường `version`.
*   `WorkOrderItem`: Liên kết thêm với giao dịch kho thông qua quan hệ `InventoryTransaction`.

## 5. Fields Added
*   `version`: Kiểu `Int`, mặc định là `1`, áp dụng cho `MaintenanceRequest`, `WorkOrder`, `MaintenanceSchedule`, `InventoryItem`.
*   `completedAt`, `verifiedAt`, `closedAt`: Kiểu `DateTime?` trên `WorkOrder`.
*   `scheduleId`: Kiểu `String?` trên `WorkOrder`.
*   `scheduledDueDate`: Kiểu `DateTime?` trên `WorkOrder`.

## 6. Relations Changed
*   Mối quan hệ giữa `MaintenanceRequest` và `WorkOrder` được thắt chặt từ `1-n` sang `1-1` (`requestId` là `@unique` trong `WorkOrder`).
*   `WorkOrder` có thêm quan hệ tùy chọn với `MaintenanceSchedule` (`scheduleId` liên kết với `MaintenanceSchedule.id`).
*   `InventoryTransaction` liên kết với `InventoryItem`, `WorkOrder`, và `WorkOrderItem`.

## 7. Indexes and Unique Constraints
*   `WorkOrder`: Thêm ràng buộc unique cho `requestId`.
*   `WorkOrder`: Thêm ràng buộc unique `@@unique([scheduleId, scheduledDueDate])`.
*   `InventoryTransaction`: Thêm ràng buộc unique `@@unique([workOrderItemId, transactionType])` để đảm bảo mỗi `WorkOrderItem` chỉ có tối đa một giao dịch `ISSUE`, nhưng có thể có các giao dịch `RETURN` riêng biệt.
    *   *Xử lý giá trị Nullable trên SQLite/MySQL:* Đối với các giao dịch điều chỉnh kho (`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`), trường `workOrderItemId` sẽ là `null`. Theo chuẩn SQL (cả SQLite và MySQL), giá trị `null` được coi là không bằng nhau (`NULL != NULL`), do đó hệ thống cho phép ghi nhiều bản ghi có `workOrderItemId` là `null` mà không bị vi phạm ràng buộc unique.

## 8. Existing Data Impact
*   Toàn bộ các trường mới đều có giá trị mặc định (như `version = 1`) hoặc ở dạng Nullable. Do đó, các dòng dữ liệu cũ trong `dev.db` sẽ tự động nhận giá trị mặc định hoặc `null`, không làm gãy cấu trúc và không gây mất mát dữ liệu hiện có.

## 9. Status Mapping
*   Không có bản ghi `INSPECTION` nào trong database.
*   Các bản ghi `IN_PROGRESS` hiện tại sẽ được giữ nguyên trạng thái `IN_PROGRESS`.
*   Bản ghi `APPROVED` của `MaintenanceRequest` được giữ nguyên.

## 10. SQLite Compatibility
*   SQLite hỗ trợ đầy đủ các trường mới và ràng buộc unique. Tuy nhiên, SQLite không hỗ trợ thay đổi cấu trúc bảng phức tạp (như thay đổi cột thành unique trực tiếp). Prisma Migrate sẽ tự động tạo bảng tạm, sao chép dữ liệu cũ sang và đổi tên bảng để xử lý việc này một cách an toàn.

## 11. Future MySQL Compatibility
*   Schema mới được thiết kế hoàn toàn tương thích với MySQL.
*   Khi chuyển đổi sang MySQL, chỉ cần thay đổi `provider = "mysql"` và cập nhật chuỗi kết nối. Kiểu dữ liệu `version Int` và `DateTime?` hoạt động tương tự trên cả hai môi trường.

## 12. Migration Execution Steps
1.  Đóng toàn bộ kết nối đến cơ sở dữ liệu.
2.  Chạy sao lưu `dev.db` sang `dev.db.bak`.
3.  Tạo baseline migration `0_baseline` và resolve.
4.  Chạy `npx prisma migrate dev --name add_core_integrity_tables_and_columns`.
5.  Kiểm tra logs và trạng thái database bằng `npx prisma migrate status`.

## 13. Verification Steps
1.  Kiểm tra cấu trúc cơ sở dữ liệu mới thông qua Prisma Studio hoặc chạy lệnh validate.
2.  Chạy ứng dụng backend và thử nghiệm thực hiện các API để đảm bảo không bị lỗi dữ liệu cũ.

## 14. Rollback Plan
*   **Khi nào thực hiện:** Nếu lệnh `prisma migrate dev` gặp lỗi không thể hoàn thành hoặc làm hỏng dữ liệu hiện tại, hoặc backend bị lỗi kết nối DB nghiêm trọng sau migration.
*   **Restore database:** Xóa tệp `dev.db` lỗi và khôi phục lại từ tệp sao lưu `dev.db.bak` bằng lệnh sao chép.
*   **Rollback source code:** Quay về commit Git ổn định trước đó (nếu có) hoặc revert lại file `schema.prisma` và xóa thư mục migrations vừa tạo.
*   **Xác nhận dữ liệu:** Khởi động lại backend và chạy truy vấn đếm số lượng bản ghi để đảm bảo dữ liệu trùng khớp với trạng thái ghi nhận tại mục 1.

## 15. Expected Downtime
*   Thời gian bảo trì dự kiến: Dưới 1 phút do cơ sở dữ liệu SQLite cục bộ rất nhỏ.

## 16. Risks and Mitigations
*   *Risk:* Lỗi khóa ghi (database locked) của SQLite khi chạy migration đồng thời.
*   *Mitigation:* Chặn toàn bộ các request hoặc tắt server backend trước khi chạy lệnh migration.
