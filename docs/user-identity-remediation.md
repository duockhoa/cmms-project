**Báo cáo triển khai sửa nhận diện người dùng QLTB — 03/11/2026**

Trạng thái: đã triển khai trong workspace và build thành công. Chưa triển khai lên server, chưa sửa liên kết tài khoản hoặc lịch sử nghiệp vụ trong CSDL.

**Bằng chứng đối soát**

Đã truy vấn chỉ đọc CSDL được cấu hình trong `backend/.env`. Đây là kết quả của CSDL đó, chưa xác nhận phiên trình duyệt hay phiên bản đang chạy trên server:

| Tài khoản | ID nội bộ QLTB | hrmId lưu trong QLTB | Trạng thái |
| --- | --- | --- | --- |
| Dương Thị Thanh Tâm | 1120 | 1120 | Đang hoạt động |
| Hoàng Thị Kim Thoa | 1125 | 1125 | Đang hoạt động |

Ảnh người dùng cung cấp hiển thị mã nhân viên của chị Thoa là `1120`. Code cũ đưa cả `sub`, username/mã nhân viên và ID nội bộ vào cùng một truy vấn OR rồi lấy bản ghi đầu tiên. Nếu token mang mã nhân viên `1120`, truy vấn đó có thể chọn tài khoản chị Tâm dù tài khoản chị Thoa trong QLTB là `1125`.

Đã thêm kiểm thử hồi quy: token có `sub/username = 1120`, HRM xác nhận `id = 1125` thì backend phải trả tài khoản `1125`. Chưa có token của phiên xảy ra lỗi để khẳng định chính xác nội dung token khi chụp ảnh.

Kết quả kiểm tra toàn bộ 252 tài khoản: 1 tài khoản HRM thiếu liên kết (`941`) và 7 nhóm trùng họ tên. Trùng tên là thông tin cần xem xét, không phải bằng chứng để gộp tài khoản. Không có tài khoản nào được gộp, xóa, đổi quyền hoặc chuyển lịch sử trong quá trình kiểm tra.

**Những thay đổi đã thực hiện**

1. Xác thực và chọn tài khoản:
   - JWT vẫn được Passport kiểm tra chữ ký/hạn sử dụng trước khi xác minh HRM.
   - Với chế độ HRM, gọi `HRM_API_URL/users/me` để lấy ID chính xác, không coi token sub hay mã nhân viên là ID HRM.
   - Liên kết `hrmId` chính xác có ưu tiên; tên, ID nội bộ và email giả từ mã nhân viên không được lấn át liên kết đã xác nhận.
   - Email thật trỏ sang người khác, tài khoản cũ chưa liên kết hoặc dữ liệu mâu thuẫn sẽ trả lỗi yêu cầu đối soát; không tự gắn lại tài khoản.
   - Kiểm tra trạng thái QLTB mỗi request. Không dùng cache hồ sơ/quyền người dùng cũ trong 10 phút như trước.
   - Hồ sơ HRM được cache theo hash token tối đa 30 giây; `/auth/me` luôn xác minh lại với HRM. Lỗi xác minh không được giữ cache cũ để sử dụng tiếp.
   - Tên, email, ảnh đại diện đã xác minh được trả cho giao diện; quyền và phạm vi nghiệp vụ tiếp tục lấy từ tài khoản QLTB đã chọn đúng.
   - Cấu hình quản trị theo mã nhân viên chỉ so khớp chính xác mã HRM xác nhận, không so substring tên/email hoặc lẫn với ID chính của HRM.
   - Chế độ Keycloak chỉ nhận liên kết ID nội bộ chính xác của tài khoản LOCAL; không đoán sang tài khoản HRM.

2. Phiên trên trình duyệt:
   - Trên domain DK Pharma, phiên SSO từ cookie dùng chung là nguồn lựa chọn phiên; bỏ việc tự khôi phục token localStorage cũ khi cookie trung tâm đã mất.
   - Cookie trùng tên hoặc alias chứa token khác nhau sẽ yêu cầu đăng nhập lại, không tự chọn token đầu tiên.
   - Nhận token từ URL sẽ thay cặp phiên cũ và xóa tất cả tham số token đã nhận khỏi URL. Không giữ refresh token cũ nếu handoff mới không cung cấp nó.
   - Theo dõi thay đổi phiên giữa các tab, kiểm tra cookie mỗi giây và khi quay lại tab.
   - Tất cả thành phần dùng chung trạng thái người dùng/quyền. Khi đổi phiên: xóa hồ sơ và cache, gỡ màn hình nghiệp vụ cũ, xác minh lại trước khi mở thao tác.
   - Request và refresh hoàn tất muộn từ phiên cũ không được thay dữ liệu hay token của phiên mới.
   - Catalog cache và React Query được xóa/tách theo phiên, không tái sử dụng danh sách từ người trước.

3. Gia hạn phiên:
   - Thêm `POST /api/v1/auth/refresh` làm đầu mối gia hạn từ QLTB.
   - Backend kiểm tra danh tính của access token mới qua HRM và so với HRM ID đã xác minh của phiên trước khi trả cặp token.
   - Refresh token của A trong phiên B bị từ chối. Khi chưa có định danh đã xác minh, yêu cầu đăng nhập lại.
   - Chỉ response gia hạn được phép trả refresh token; bộ lọc thông tin bí mật vẫn áp dụng cho các API khác. Response xác thực không được cache bởi trình duyệt/proxy.

4. Ghi nhận thao tác và thông báo:
   - Tạo yêu cầu dùng tài khoản đã xác thực làm người báo cáo, ghi cả người thực hiện vào lịch sử CREATE.
   - Các API bảo trì lấy người tạo/người thao tác từ `req.user`, ghi đè ID giả hoặc ID cũ do trình duyệt gửi lên.
   - Bỏ các hàm chọn người dùng đang hoạt động đầu tiên để gửi làm người thao tác.
   - Thống nhất upload qua helper xác thực; thông tin người góp ý ưu tiên danh tính đã xác thực.
   - WebSocket kiểm tra JWT ở server; room người dùng, vai trò và bộ phận được lấy từ tài khoản đã xác thực. Không tin các trường query do client tự khai.
   - Kết nối thông báo được xác minh lại mỗi 30 giây, ngắt khi phiên hoặc phạm vi tài khoản thay đổi.

5. Đồng bộ và đối soát:
   - Bỏ tự gộp theo tên, bỏ chuyển quan hệ lịch sử và cộng quyền từ các tài khoản được cho là trùng.
   - Giữ ID nội bộ và quyền hiện có khi đồng bộ một liên kết đã xác nhận. Bản ghi mâu thuẫn được bỏ qua và đưa vào báo cáo.
   - Tài khoản đang có trong snapshot nhưng bị mâu thuẫn không bị vô hiệu hóa chỉ vì không cập nhật được.
   - Snapshot rỗng, lỗi phân trang hoặc ID trùng bị từ chối trước khi áp dụng đồng bộ.
   - Thêm nút **Đối soát tài khoản** tại Cài đặt → Người dùng, API `GET /api/v1/users/identity-audit` cần quyền quản trị người dùng.
   - Endpoint `clean-duplicates` cũ chỉ trả báo cáo, không còn gộp/xóa. Các đề xuất sửa liên kết hoặc lịch sử cần được review riêng.

**Kiểm chứng đã hoàn thành**

| Kiểm chứng | Kết quả |
| --- | --- |
| 12 bộ kiểm thử backend, gồm JWT thật với Passport và HRM/CSDL mô phỏng | 52 kiểm thử đạt |
| Kiểm thử phiên frontend, cookie, cache, đổi người, request/refresh đến muộn, URL và HRM lỗi | 16 kiểm thử đạt |
| `npm run build` trong backend | Đạt |
| `npm run build` trong frontend | Đạt |
| `git diff --check` | Đạt |
| Đối soát CSDL cấu hình của dự án | SELECT-only, 252 tài khoản |

Các kiểm thử integration cũ có lệnh reset database không được chạy. Không chạy migration, seed hoặc backfill trong nhiệm vụ này. Các thay đổi OEE có sẵn trong workspace được giữ nguyên.

Chạy lại kiểm thử frontend bằng `npm run test:auth`. Các bộ kiểm thử backend liên quan nằm ở `auth/*identity*.spec.ts`, `auth/auth-profile.spec.ts`, `users/users.service.spec.ts`, `notifications/notifications-identity.spec.ts`, `schedules/schedules-identity.spec.ts`, `requests/requests-identity.spec.ts`, `feedbacks/feedbacks-identity.spec.ts` và các kiểm thử helper/sanitize đã chạy cùng.

Chạy báo cáo CSDL chỉ đọc từ thư mục backend:

```powershell
node --env-file=.env -r ts-node/register scripts/audit-user-identities.ts
```

Có thể thêm `--snapshot=<duong-dan-json>` để so với bản xuất HRM đã được cung cấp. Script chỉ SELECT và tính báo cáo, không gọi đăng nhập, đồng bộ, provision hoặc cập nhật CSDL. Đầu ra không chứa token, email hoặc họ tên.

**Nghiệm thu và đưa lên server**

1. Trên môi trường thử nghiệm, dùng phiên SSO thật của chị Thoa để xác nhận `/users/me` trả ID HRM chính xác và QLTB hiển thị đúng người, đúng quyền. Cần thử cùng tài khoản chị Tâm để chứng minh hai phiên tách biệt.
2. Thử đổi A → B với QLTB đang mở nhiều tab, quay lại tab, đăng xuất, token hết hạn và trường hợp hai cookie alias mâu thuẫn. Kết quả phải là đúng người hoặc màn hình yêu cầu xác minh lại, không được tiếp tục với danh tính cũ.
3. Tạo yêu cầu/bảo trì thử nghiệm và kiểm tra người tạo, người thao tác, lịch sử, thông báo trên cùng tài khoản.
4. Review riêng tài khoản `941` và các liên kết mâu thuẫn từ snapshot HRM, nếu có. Không đổi lịch sử chỉ dựa trên trùng tên hoặc mã nhân viên.
5. Sau nghiệm thu, triển khai backend và frontend tương ứng trong cùng đợt để giao thức refresh/WebSocket mới khớp nhau. Bản sửa này không yêu cầu migration schema mới.

Chưa có phiên SSO thật trong môi trường làm việc này nên chưa nghiệm thu được giao tiếp trực tiếp với HRM/cổng ứng dụng. Luồng SSO hiện hỗ trợ cookie dùng chung và handoff URL như dự án đã thiết kế. Nếu cổng ứng dụng chỉ đổi localStorage riêng mà không cập nhật cookie/handoff hoặc thu hồi phiên trung tâm, QLTB không thể tự biết tài khoản của domain khác; khi đó cần phối hợp cập nhật giao thức SSO phía cổng ứng dụng, không đoán từ token cũ.

Phương án khôi phục: giữ bản build trước của cả frontend/backend và triển khai lại cặp tương ứng nếu có lỗi vận hành. Do lần triển khai này chưa đổi schema hoặc lịch sử dữ liệu, không có migration dữ liệu cần đảo ngược. Sau khôi phục cần yêu cầu người dùng đăng nhập lại và tiếp tục đối soát, vì bản cũ vẫn có rủi ro nhận diện đã phát hiện.
