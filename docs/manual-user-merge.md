# Gộp tài khoản thủ công

Triển khai mã nguồn ngày 04/11/2026. Chưa chạy migration hoặc gộp dữ liệu trên máy chủ.

## Cách dùng

Trong **Cài đặt → Người dùng**, chọn **Gộp tài khoản thủ công** hoặc nút **Gộp** ở tài khoản nguồn:

1. Chọn tài khoản nguồn sẽ ngừng sử dụng và tài khoản đích sẽ tiếp tục dùng. Tìm bằng tên, email, ID nội bộ hoặc ID HRM.
2. Chọn **Xem trước tác động**. Kiểm tra hồ sơ hai tài khoản, số bản ghi, các trường liên kết được chuyển và ID mẫu. Bản xem trước có hiệu lực 10 phút và gắn với người thực hiện.
3. Nhập lý do và bằng chứng xác nhận cùng một nhân sự, mỗi trường ít nhất 10 ký tự. Bằng chứng là mã hồ sơ/mã nhân viên hoặc nội dung đối soát thực tế, không chỉ dựa trên họ tên trùng.
4. Đánh dấu đã đối soát, sau đó xác nhận. Nếu dữ liệu đã thay đổi, cần xem trước lại; không tự tiếp tục bằng dữ liệu cũ.
5. Lưu mã thao tác trả về. Dùng **Lịch sử gộp** để xem nguồn/đích, người thực hiện, thời điểm, lý do, bằng chứng và từng liên kết trước/sau. Danh sách hiển thị tối đa 50 lần gần nhất; chi tiết được tải khi yêu cầu.

Cần đồng thời quyền `settings:users` và `settings:merge_users`. Quản trị có quyền toàn cục được dùng theo resolver hiện hành. Người chỉ quản lý người dùng không tự được cấp quyền gộp. Không cần quyền sửa vai trò vì thao tác gộp không chuyển quyền.

## Điều kiện và dữ liệu thay đổi

- Không gộp một tài khoản với chính nó hoặc gộp tài khoản đang thực hiện thao tác làm nguồn.
- Nguồn phải chưa có `hrmId`; nếu nguồn đã có ID HRM thì cần chọn lại tài khoản đó làm đích. Hai ID HRM khác nhau không được gộp qua tính năng này.
- Nguồn có dataSource HRM phải chọn đích có liên kết HRM. Đích phải đang hoạt động, không bị khóa và không có cờ HRM ngừng hoạt động.
- Không nhận nguồn/đích đã gộp. Nguồn đang là đích của các lần gộp trước cũng bị chặn để tránh tạo chuỗi liên kết cần đối soát riêng.
- Cả hai tài khoản phải kết thúc phiên làm việc mở của sửa chữa/gia công trước khi gộp.
- Giữ nguyên ID, ID HRM, hồ sơ, vai trò và quyền riêng của đích; không cộng quyền nguồn, không tự thay nhóm quyền hoặc tự mở khóa tài khoản.
- Chuyển các khóa ngoại User trong schema, các trường ID đơn chưa có khóa ngoại được khai báo riêng và các mảng phân công JSON. Mảng được thay bằng ID chính xác và bỏ trùng, không thay theo chuỗi con.
- Các nhóm gồm phiếu sự cố/sửa chữa, kế hoạch, thực hiện checklist, tệp đính kèm, xuất nhập kho, OEE, nhật ký vận hành/tiện ích, gia công, phiên làm việc đã đóng, lịch sử thao tác và thông báo theo người dùng.
- Tên/email/mã snapshot và nội dung tự do trong lịch sử không bị viết lại. ID liên kết được chuyển sang đích; audit lưu hồ sơ nguồn/đích trước gộp cùng model, ID bản ghi, trường, giá trị cũ/mới cho từng thay đổi. Do đó đây là một thao tác sửa liên kết lịch sử có dấu vết, không phải giữ nguyên toàn bộ khóa ngoại cũ.
- Nguồn được khóa, đánh dấu `mergedIntoId`/`mergedAt` và giữ lại. Email nguồn được lưu trong audit rồi đổi sang địa chỉ lưu trữ `merged-<hash>@users.invalid`, giải phóng email cũ cho hồ sơ HRM hợp lệ. Thay đổi email này được thể hiện trước khi xác nhận; không tự chép email nguồn sang đích.
- Sau gộp, nguồn bị chặn sửa/mở khóa, đăng nhập và đồng bộ không chọn lại nguồn. Đồng bộ lần sau cập nhật hồ sơ đích theo liên kết HRM; không tạo lại nguồn từ tên hoặc email.

## Giao dịch và giới hạn

Backend lấy liên kết khóa ngoại từ Prisma DMMF, đồng thời có registry rõ ràng cho các ID đơn/JSON chưa khai báo quan hệ. Khi schema đổi, cần review registry và kiểm thử phạm vi trước khi triển khai. Không quét thay toàn bộ chuỗi trong metadata hoặc ghi chú.

Xem trước lưu fingerprint của hồ sơ và danh sách tác động, không sửa phiếu/quyền. Xác nhận đọc lại quyền người thực hiện, khóa bản xem trước và hai tài khoản, đối chiếu fingerprint rồi chuyển trong một transaction Serializable. Mỗi bản ghi được kiểm tra giá trị cũ và version khi model hỗ trợ. Lỗi, xung đột hoặc audit không ghi được sẽ rollback. Một bản xem trước chỉ được dùng một lần.

Giới hạn hiện tại là 5.000 liên kết/lần để giữ transaction và audit có kích thước kiểm soát được. JSON được duyệt theo trang; schema/trường JSON cũ không hợp lệ có chứa ID nguồn sẽ bị chặn thay vì bỏ qua âm thầm. Các giới hạn 10 phút, 5.000 liên kết, 50 lịch sử là giới hạn kỹ thuật, không gắn với ID nhân sự hay tên phòng ban.

Không có nút hoàn tác tự động. Nếu cần sửa một lần gộp nhầm, phải đối soát audit và trạng thái phiếu hiện tại trước; không đổi ngược hàng loạt khi phiếu đã phát sinh dữ liệu mới. Sao lưu và diễn tập staging trước lần gộp thật đầu tiên.

## API

| Phương thức | Đường dẫn | Chức năng |
| --- | --- | --- |
| POST | /api/v1/users/merge-preview | Nhận sourceUserId, targetUserId; trả previewId, tác động và điều kiện chặn |
| POST | /api/v1/users/merge-confirm | Nhận previewId, reason, evidence, confirmed=true; nguồn/đích lấy từ bản xem trước server |
| GET | /api/v1/users/:id/merge-history | Các lần gộp liên quan tài khoản, không tải toàn bộ ledger |
| GET | /api/v1/users/merge-audits/:auditId | Hồ sơ gộp và từng liên kết trước/sau |

## Migration và kiểm thử

Migration: `backend/prisma/migrations/20261104150000_add_manual_user_merge/migration.sql`.

Migration thêm dấu gộp và liên kết nguồn/đích vào User, tạo `UserMergePreview` và `UserMergeAudit`. Không tự gộp hay chuyển dữ liệu người dùng khi chạy migration. Hồ sơ audit là dữ liệu quản trị, không đưa bản xuất chứa dữ liệu nhân sự thật lên git hoặc webroot.

Sau khi review lịch sử migration và backup, chạy `npx prisma migrate deploy`, `npx prisma generate`, build/restart backend và build/triển khai frontend. Giữ các migration trạng thái HRM/HttpOnly đã có của đợt trước. Không dùng `db push` thay các migration này.

Đã kiểm tra trong môi trường local:

- 95 kiểm thử backend đạt, gồm gộp chính xác ID, dedup JSON, không chuyển quyền, giữ snapshot, chặn hai HRM ID, phiên mở, quyền bị thu hồi, preview cũ/hết hạn/đã dùng, rollback và không mở lại nguồn.
- Chrome đạt 7 kiểm tra giao diện gộp: bắt buộc xem trước, hiển thị tác động, đổi lựa chọn hủy preview, bằng chứng, checkbox xác nhận, từ chối preview cũ và trả mã audit sau thành công. Đồng thời giữ 11 kiểm tra phiên/HttpOnly đã có.
- Backend/frontend build và Prisma schema được kiểm tra. Test nghiệp vụ dùng storage giả lập; chưa nghiệm thu transaction, khóa hàng, dung lượng dữ liệu và kế hoạch khôi phục trên MySQL staging.
