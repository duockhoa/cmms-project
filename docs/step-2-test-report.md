# Step 2 Test Report

## 1. Môi trường Kiểm thử (Test Database Configuration)
*   Toàn bộ các bài kiểm thử tự động (Unit Test & Integration Test) sẽ được cấu hình để chạy trên một cơ sở dữ liệu SQLite riêng biệt (`backend/prisma/test.db`), độc lập hoàn toàn với database phát triển (`dev.db`).
*   Trước mỗi ca kiểm thử tích hợp, cơ sở dữ liệu test sẽ được dọn sạch và nạp lại seed dữ liệu chuẩn để đảm bảo tính cô lập và nhất quán (Idempotency) của môi trường test.

## 2. Danh sách các bài kiểm thử tự động (Expected Test Cases)

### 2.1. Unit Tests (State Machine)
*   **Transition Validation:** Kiểm tra tất cả các bước chuyển đổi trạng thái hợp lệ của Work Order.
*   **Invalid Transition Rejection:** Kiểm tra chặn toàn bộ các bước chuyển đổi trái phép (ví dụ: `PENDING` -> `COMPLETED`).
*   **Specific Rules:** Chặn thay đổi trạng thái nếu thiếu điều kiện đi kèm (như chuyển sang `ASSIGNED` mà thiếu `technicianName`).

### 2.2. Integration Tests (Luồng Nghiệp vụ & Transactions)
*   **Request Approval Workflow:** Duyệt yêu cầu sự cố, tự động tạo duy nhất 1 Work Order liên kết và chuyển đổi trạng thái thiết bị sang `UNDER_MAINTENANCE` động.
*   **Concurrent Request Approval:** Giả lập 2 request phê duyệt đồng thời cho 1 Yêu cầu sửa chữa $\rightarrow$ Xác nhận chỉ 1 thành công, 1 lỗi 409, chỉ có duy nhất 1 Work Order được sinh ra.
*   **Work Order Completion & Stock Verification:** Hoàn thành WO, kiểm tra trừ kho vật tư chính xác và tạo log giao dịch.
*   **Atomic Stock Validation:** Đăng ký sử dụng 4 vật tư, trong đó có 1 vật tư bị thiếu hàng $\rightarrow$ Xác nhận toàn bộ luồng hoàn thành bị lỗi `400/422`, giao dịch rollback hoàn toàn (không có vật tư nào bị trừ kho).
*   **Double Issue Prevention:** Chuyển đổi trạng thái WO từ `COMPLETED` sang `IN_PROGRESS` rồi hoàn thành lại $\rightarrow$ Xác nhận không bị trừ kho trùng lặp đối với các vật tư cũ.
*   **Concurrent Completion:** Giả lập 2 request cùng bấm hoàn thành 1 WO đồng thời $\rightarrow$ Xác nhận chỉ 1 thành công, kho chỉ bị trừ 1 lần duy nhất.
*   **Schedule Generation Idempotency:** Sinh phiếu WO định kỳ $\rightarrow$ Xác nhận cập nhật `nextDueDate`. Gọi lặp đồng thời $\rightarrow$ Chỉ 1 WO được sinh ra cho kỳ đó, trả về lỗi xung đột hoặc kết quả đã tồn tại.
*   **Optimistic Locking Conflict:** Thử cập nhật bản ghi bằng một `expectedVersion` cũ $\rightarrow$ Xác nhận trả về lỗi `409 Conflict`.
*   **Legacy Endpoint Fallback:** Gọi API `PUT /work-orders/:id/status` với các trạng thái khác nhau $\rightarrow$ Xác nhận đi qua State Machine và áp dụng đầy đủ các bộ ràng buộc tương tự.

---

## 3. Lệnh chạy và Kết quả dự kiến
*   **Lệnh chạy test:** `npm test` trong thư mục `backend`.
*   **Kết quả:** Sẽ được cập nhật chi tiết sau khi triển khai và chạy thực tế.
