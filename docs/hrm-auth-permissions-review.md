**Kiểm tra đăng nhập và phân quyền QLTB theo API HRM — 03/11/2026**

Phạm vi: mã nguồn hiện tại trong workspace, bao gồm bản sửa nhận diện vừa thực hiện; tài liệu OpenAPI lấy từ [API HRM](https://docs.dkpharma.io.vn/api-docs) và cấu hình Swagger của chính trang đó. Chưa xác nhận mã đang chạy trên production. Lượt này chỉ kiểm tra và viết báo cáo, không sửa mã nguồn hoặc dữ liệu.

**Những gì tài liệu HRM xác nhận**

| API | Hợp đồng được công bố | Đối chiếu dự án |
| --- | --- | --- |
| POST /auth/login | username/password; trả accessToken và refreshToken | Đang dùng đúng endpoint và payload |
| POST /auth/refresh-token | Nhận refreshToken; response chỉ bắt buộc accessToken | Đang hỗ trợ giữ refresh token khi HRM không cấp token thay thế |
| POST /auth/logout | Nhận refreshToken; thu hồi refresh token | QLTB chưa gọi khi người dùng đăng xuất |
| GET /users/me | Hồ sơ người dùng, id số và username riêng biệt | Cách lấy id thật qua endpoint này phù hợp với bản sửa nhận diện |
| GET /users/me/applications | Các ứng dụng được gán cho người hiện tại | Chưa kiểm tra quyền vào ứng dụng QLTB |
| GET /users/me/permissions | Trả permissionKeys, ví dụ users.read | Chưa tích hợp hoặc xác lập ánh xạ sang quyền QLTB |

Quyền HRM dùng key dạng dấu chấm trong ví dụ tài liệu; QLTB dùng key dạng `equipment:view`, `settings:users`... Không thể tự coi hai bộ key hoặc vai trò là tương đương.

**Các điểm phải xử lý trước khi đưa bản sửa lên server**

1. **Rất cao — nhiều API nghiệp vụ chỉ yêu cầu đăng nhập, thiếu kiểm tra quyền hành động.**

   Ví dụ `EquipmentController` chỉ có `JwtAuthGuard`, các hàm tạo/sửa/xóa không nhận actor hoặc kiểm tra quyền trong service. `SystemSettingController` cho cập nhật tham số hệ thống qua service không kiểm tra quyền. Có tình trạng tương tự ở tham số tiêu chuẩn, nhiều thao tác lịch bảo trì và cập nhật/xóa góp ý. Không có `APP_GUARD` hoặc global permission guard bù lại.

   Tác động: tài khoản HRM được nhận diện đúng vẫn có thể gọi một số API ngoài quyền được hiển thị trên giao diện. Việc ẩn menu không bảo vệ API.

   Bằng chứng: `backend/src/modules/equipment/equipment.controller.ts:70`, `backend/src/modules/equipment/equipment.service.ts:307`, `backend/src/modules/settings/settings.controller.ts:126`, `backend/src/modules/settings/settings.service.ts:153`, `backend/src/modules/feedbacks/feedbacks.controller.ts:37`.

   Đề xuất: lập ma trận route → quyền → phạm vi dữ liệu; dùng một permission guard thống nhất, kiểm tra quyền backend cho mọi hành động. Các route đọc cũng phải có chính sách dữ liệu rõ ràng. Kiểm thử bắt buộc tài khoản không quyền nhận 403 và không gọi hàm ghi CSDL.

2. **Rất cao nếu MCP được triển khai — vẫn tồn tại đường xác thực khác với web.**

   `mcp-server/src/auth.ts:64` có fallback dùng mật khẩu mặc định khi đăng nhập HRM không thành công, rồi tự ký JWT thời hạn 30 ngày. `verifyAccessToken` của MCP vẫn OR giữa id/hrmId/email và không kiểm tra isActive trước khi trả user. `backend/src/modules/mcp/mcp.controller.ts:138` và `:211` dùng `jwt.decode` khi kiểm tra chữ ký thất bại, vẫn tiếp tục tạo authorization code.

   Tác động: bản sửa nhận diện web chưa đồng nhất toàn bộ đường đăng nhập. Việc phát authorization code sau khi verify thất bại là lỗi tại ranh giới xác thực; chưa khẳng định mọi API phía sau đều chấp nhận token đó, vì một số nơi có bước kiểm tra khác.

   Đề xuất: bỏ fallback mật khẩu mặc định/tự ký token HRM, từ chối token verify thất bại, dùng chung bộ xác minh danh tính và trạng thái đã liên kết. Cần xác nhận MCP có đang được triển khai trước khi đánh giá phạm vi production.

3. **Cao — API key của EVN cấp ADMIN trong guard dùng chung.**

   `backend/src/modules/auth/jwt-auth.guard.ts:12` nhận API key và tạo actor ADMIN trước khi kiểm tra JWT. Code không giới hạn đường dẫn hay HTTP method. Cấu hình workspace hiện có API key riêng; không kết luận giá trị mặc định đang được sử dụng. Tuy nhiên code vẫn có fallback key cố định nếu cấu hình bị thiếu.

   Đề xuất: tách machine authentication, giới hạn endpoint/phương thức được gọi và quyền cụ thể. Thiếu key cấu hình phải vô hiệu hóa luồng máy, không dùng giá trị mặc định. Không cấp quyền quản trị người dùng cho bot đồng bộ điện.

4. **Cao — quyền của nhóm đã vô hiệu hóa vẫn được sử dụng.**

   `RolesService.update` cho phép đặt `isActive=false`, nhưng `AuthController`, helper RBAC và common permission guard vẫn lấy `customRole.permissions` mà không xét trạng thái nhóm. Đã xác nhận bằng dữ liệu mô phỏng: nhóm bị khóa vẫn cho `settings:users` trong helper và `/auth/me`.

   Bằng chứng: `backend/src/modules/settings/roles.service.ts:60`, `backend/src/modules/auth/auth.controller.ts:37`, `backend/src/common/utils/rbac.helper.ts:90`, `backend/src/common/guards/permissions.guard.ts:37`.

   Đề xuất: nhóm bị vô hiệu hóa không cấp quyền; quyền trực tiếp trên từng người dùng cần chính sách độc lập, rõ ràng. Dùng chung một hàm tính quyền cho API, `/auth/me` và giao diện.

5. **Cao — chức năng xóa người dùng còn gộp lịch sử theo họ tên.**

   Bản sửa trước đã bỏ gộp trong đồng bộ và clean-duplicates, nhưng `UsersService.deleteUser` vẫn tìm tài khoản khác bằng OR họ tên/email, chuyển tác giả trong workflowHistory, scheduleHistory và nhiều quan hệ sang người đó rồi xóa tài khoản cũ.

   Đã mô phỏng, xác nhận hai tài khoản cùng tên có thể bị chuyển lịch sử tác giả khi xóa. Không gọi chức năng xóa trên CSDL thật.

   Bằng chứng: `backend/src/modules/users/users.service.ts:447`.

   Đề xuất: vô hiệu hóa tài khoản và giữ nguyên tác giả lịch sử. Gộp tài khoản phải là quy trình riêng, có định danh đã xác nhận và bản đối chiếu được duyệt; không gộp ngầm trong thao tác xóa.

6. **Cao — chưa kiểm tra quyền vào ứng dụng được gán ở HRM.**

   `HrmIdentityService.resolve` có thể provision tài khoản sau khi HRM xác nhận người dùng, nhưng chưa gọi `/users/me/applications`. Vì vậy đăng nhập HRM hợp lệ đang là điều kiện đủ để bắt đầu tạo tài khoản QLTB, dù chưa xác minh người đó có được cấp QLTB hay không. Quyền nội bộ tiếp tục được tính hoàn toàn từ QLTB.

   Bằng chứng: `backend/src/modules/auth/hrm-identity.service.ts:76`, `backend/src/modules/auth/auth.controller.ts:55`.

   Đề xuất: xác nhận application key/ID thật của QLTB. Cổng vào ứng dụng kiểm tra cấp ứng dụng và trạng thái HRM, sau đó mới áp dụng RBAC và phạm vi nội bộ QLTB. Không tự nhập toàn bộ quyền quản trị HRM thành quyền quản trị QLTB. Nếu muốn quản trị quyền chi tiết tập trung, phải chốt bảng ánh xạ permissionKeys riêng.

7. **Cao — đăng xuất chưa thu hồi refresh token tại HRM.**

   `UserCard.handleLogout` hiện chỉ xóa cookie/localStorage và chuyển về login. Tài liệu đã có POST `/auth/logout` dùng refreshToken.

   Bằng chứng: `frontend/src/components/layout/UserCard.tsx:17`.

   Đề xuất: gọi logout qua backend trước hoặc đồng thời với dọn phiên; frontend vẫn dọn phiên khi mạng lỗi nhưng phải thông báo trạng thái thu hồi phù hợp. Phải kiểm tra lại refresh token sau logout để chứng minh không còn gia hạn được. Tài liệu chỉ xác nhận thu hồi refresh token, chưa chứng minh access token đang lưu cũng mất hiệu lực ngay.

**Các điểm cần tối ưu để đăng nhập ổn định và dễ sử dụng**

8. **ADMIN có thể bị giao diện cho phép nhưng API trả 403.**

   Helper `hasPermission` và `/auth/me` cho ADMIN toàn quyền; common `PermissionsGuard` chỉ hợp quyền từ role/customPermissions, không áp dụng cùng quy tắc ADMIN. Guard này đang dùng thực tế cho thao tác sắp xếp thông số thiết bị. Đã mô phỏng ADMIN không có customRole: helper cho phép, guard từ chối.

   Bằng chứng: `backend/src/common/guards/permissions.guard.ts:61`, `backend/src/common/utils/rbac.helper.ts:139`, `backend/src/modules/equipment/equipment-parameters.controller.ts:51`.

   Đề xuất: thống nhất resolver quyền; bỏ bản guard cũ không dùng để tránh thêm logic khác về sau.

9. **Quay lại tab hoặc refresh cùng người dùng có thể làm mất biểu mẫu chưa lưu.**

   `usePermissions` gọi invalidate mỗi lần focus/visibilitychange, xóa user và đặt loading. `RequireAuth` trả màn hình loading khiến toàn bộ màn hình nghiệp vụ bị unmount. Ngoài ra revision hiện thay đổi khi token đổi, cả khi chỉ refresh cùng một người; fragment cũng được key theo revision.

   Bằng chứng: `frontend/src/hooks/usePermissions.ts:67`, `frontend/src/App.tsx:90`, `frontend/src/utils/authStorage.ts:65`.

   Đề xuất: tách thay đổi credential khỏi thay đổi danh tính. Khi kiểm tra lại cùng tài khoản, giữ nội dung form và dữ liệu; có thể tạm khóa nút ghi trong lúc xác minh. Chỉ xóa trạng thái, kết nối và cache cá nhân khi thực sự đổi người hoặc kết thúc phiên. Đây là phần cần điều chỉnh trong bản sửa vừa triển khai.

10. **Đổi email hợp lệ ở HRM có thể bị chặn đăng nhập và bị bỏ qua khi đồng bộ.**

    Hàm chọn tài khoản đang coi email thật đổi khác là mâu thuẫn, ngay cả khi chỉ có một hrmId đã xác nhận và email mới chưa thuộc người nào khác. Cả đăng nhập lẫn đồng bộ dùng chung hàm nên đồng bộ cũng không tự giải quyết được trường hợp này.

    Bằng chứng: `backend/src/modules/auth/identity-resolution.ts:14`.

    Đề xuất: giữ ID HRM là định danh; phân biệt thay đổi hồ sơ hợp lệ với xung đột email thuộc tài khoản khác. Chỉ trường hợp liên kết/xung đột thật cần đối soát; không coi thay đổi họ tên/email là thay đổi người dùng.

11. **Còn truy vấn và lần gọi HRM có thể giảm.**

    Mỗi request xác thực gọi resolve bằng findMany OR. `/auth/me` tiếp tục findUnique và tính lại role từ đầu. Cache HRM không có in-flight deduplication nên các request đồng thời lúc cache miss có thể gọi trùng. invalidateCache hiện bỏ qua userId và xóa toàn bộ cache HRM, kể cả khi chỉ sửa quyền một người.

    Bằng chứng: `backend/src/modules/auth/hrm-identity.service.ts:44`, `:76`, `backend/src/modules/auth/auth.controller.ts:26`, `backend/src/modules/auth/jwt.strategy.ts:29`.

    Đề xuất: sau khi biết ID HRM, ưu tiên lookup unique hrmId và tái sử dụng actor đã load; lookup legacy chỉ phục vụ báo cáo/chuyển đổi. Dedupe các lần gọi cùng token và tách cache hồ sơ HRM khỏi quyền QLTB. Giữ kiểm tra trạng thái và cơ chế thu hồi quyền kịp thời. Chưa đo benchmark nên không đưa phần trăm tăng tốc.

12. **Token còn được đọc bằng JavaScript trên domain dùng chung; CORS đang cho mọi origin.**

    Refresh token được lưu localStorage và cookie do JS tạo nên không phải HttpOnly. API dùng CORS phản chiếu mọi origin với credentials. Đây là phạm vi cần thu hẹp khi hoàn thiện kiến trúc phiên, không phải bằng chứng đã xảy ra đánh cắp token.

    Bằng chứng: `frontend/src/utils/authStorage.ts:30`, `:140`, `backend/src/main.ts:23`.

    Đề xuất: danh sách origin được phép; dần đưa login/refresh/logout qua backend và cookie HttpOnly, Secure của QLTB. Việc thay giao thức SSO phải phối hợp với cổng ứng dụng, không thể giả định tài liệu hiện có đã cung cấp OIDC/authorization-code flow.

**Mô hình quyền đề xuất để review**

```text
Được thực hiện thao tác =
  Phiên HRM hợp lệ và tài khoản đang hoạt động
  AND được HRM cấp ứng dụng QLTB
  AND tài khoản QLTB được liên kết đúng, đang hoạt động
  AND có quyền hành động QLTB từ nguồn quyền đã chốt
  AND nằm trong phạm vi bộ phận / phân công / tài nguyên được phép
```

HRM quản lý danh tính, trạng thái và cấp ứng dụng. QLTB quản lý quyền nghiệp vụ và phạm vi dữ liệu theo cấu hình hiện có. Nếu chuyển quyền chi tiết sang HRM, cần bảng ánh xạ và quy trình chuyển đổi riêng; không cộng hai bộ quyền một cách mặc định.

Thứ tự: chặn đường vượt quyền/backend và fallback xác thực → sửa nhóm quyền vô hiệu hóa/nhánh gộp lịch sử → tích hợp application gate và logout HRM → thống nhất resolver quyền → giữ form khi revalidate → tối ưu truy vấn/cache và vận chuyển phiên.

**Bằng chứng và giới hạn kiểm tra**

- Đã đọc OpenAPI từ nguồn người dùng cung cấp, không thực thi JavaScript lấy từ tài liệu.
- Đã kiểm tra controller, service, guard, helper, các đường web/MCP và trạng thái cấu hình liên quan; không in API key hay mật khẩu cấu hình.
- Đã chạy mô phỏng trong bộ nhớ cho quyền nhóm bị khóa, mâu thuẫn ADMIN và nhánh chuyển tác giả khi xóa. Không dùng endpoint ghi dữ liệu thật.
- Bộ 68 kiểm thử trước tập trung nhận diện và phiên; chưa bao phủ ma trận quyền của mọi endpoint. Chưa tạo hoặc sửa test/code trong lượt kiểm tra này.
- Tài liệu chưa công bố đầy đủ schema response applications, danh sách trạng thái HRM, TTL/claims ký JWT và quy ước cookie SSO; application key của QLTB cần được xác nhận, không đoán.
- Chưa có phiên thật để kiểm tra thu hồi refresh token, application assignment hoặc phát hiện quyền production. Không kết luận rằng tất cả rủi ro trong workspace đang được khai thác hoặc đều tồn tại trên server đang chạy.
