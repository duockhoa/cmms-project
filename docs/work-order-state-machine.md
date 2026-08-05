# Work Order State Machine

## 1. Trạng thái và Định nghĩa
Hệ thống CMMS áp dụng các trạng thái chuẩn hóa sau cho vòng đời của một Phiếu bảo trì (Work Order):
1.  `PENDING`: Phiếu mới tạo, đang chờ xử lý hoặc phân công.
2.  `ASSIGNED`: Phiếu đã được phân công kỹ thuật viên phụ trách.
3.  `IN_PROGRESS`: Kỹ thuật viên đang thực hiện sửa chữa/bảo dưỡng.
4.  `ON_HOLD`: Công việc tạm dừng (ví dụ: chờ vật tư hoặc thiết bị dừng hoạt động).
5.  `COMPLETED`: Công việc sửa chữa đã hoàn tất, đang chờ kiểm tra nghiệm thu.
6.  `VERIFIED`: Nghiệm thu chất lượng đạt yêu cầu.
7.  `CLOSED`: Phiếu đã đóng hoàn toàn, thông tin đã khóa để lưu trữ lịch sử.
8.  `CANCELLED`: Phiếu bị hủy bỏ.

---

## 2. Bảng Chuyển đổi Trạng thái và Điều kiện nghiệp vụ (Business Rules)

| Trạng thái hiện tại | Trạng thái tiếp theo | Action API | Điều kiện và Quy tắc Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `PENDING` | `ASSIGNED` | `POST /work-orders/:id/assign` | Bắt buộc phải cung cấp tên kỹ thuật viên (`technicianName`). |
| `PENDING` | `CANCELLED` | `POST /work-orders/:id/cancel` | Bắt buộc cung cấp lý do hủy (`reason`). |
| `ASSIGNED` | `IN_PROGRESS` | `POST /work-orders/:id/start` | Thiết lập `actualStartDate` thành ngày giờ hiện tại (nếu chưa có). |
| `ASSIGNED` | `CANCELLED` | `POST /work-orders/:id/cancel` | Bắt buộc cung cấp lý do hủy (`reason`). |
| `IN_PROGRESS` | `ON_HOLD` | `POST /work-orders/:id/pause` | Yêu cầu nhập lý do tạm dừng (`comment` hoặc `reason`). |
| `IN_PROGRESS` | `COMPLETED` | `POST /work-orders/:id/complete` | 1. Kiểm tra tồn kho cho tất cả linh kiện gắn kèm.<br>2. Trừ kho và tạo giao dịch `ISSUE` cho từng vật tư trong transaction.<br>3. Tính toán tổng chi phí thực tế và cập nhật `completedAt`. |
| `ON_HOLD` | `IN_PROGRESS` | `POST /work-orders/:id/resume` | Chuyển công việc quay lại trạng thái thực hiện. |
| `COMPLETED` | `VERIFIED` | `POST /work-orders/:id/verify` | Kiểm tra nghiệm thu kỹ thuật thành công, ghi nhận `verifiedAt`. |
| `COMPLETED` | `IN_PROGRESS` | `POST /work-orders/:id/reopen` | Nghiệm thu thất bại $\rightarrow$ Trả về để sửa chữa tiếp. Không trừ kho lại những vật tư cũ đã xuất trước đó. |
| `VERIFIED` | `CLOSED` | `POST /work-orders/:id/close` | Đóng phiếu vĩnh viễn, lưu trữ hồ sơ, ghi nhận `closedAt`. Không cho phép sửa đổi dữ liệu sau khi đóng. |

---

## 3. API Kế thừa (Backward Compatibility)
Endpoint cũ `PUT /work-orders/:id/status` sẽ được đánh dấu `@deprecated`. Khi nhận được yêu cầu đổi trạng thái từ endpoint này, controller sẽ chuyển tiếp cuộc gọi sang hàm kiểm tra nghiệp vụ và xử lý tương ứng của từng action trên để đảm bảo không ai có thể bỏ qua các pre-conditions nghiệp vụ.
