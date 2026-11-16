# Cải thiện vòng đời token HRM — 16/11/2026

Trạng thái: đã triển khai trong workspace; chưa chạy migration, dọn dữ liệu hoặc phát hành lên CSDL/máy chủ vận hành. Kiểm thử MySQL sử dụng CSDL tạm ngẫu nhiên trên loopback và HRM giả lập, không đọc/reset dữ liệu ứng dụng.

## Hành vi mới

- QLTB lưu một access token trong binding `qltb.auth.session.v2`, bỏ bản sao `localStorage.accessToken` và không tạo cookie JavaScript `accessToken`/`access_token` nữa. Refresh token mới vẫn chỉ được backend lưu mã hóa AES-256-GCM.
- Cookie phiên `__Host-qltb-session` vẫn là HttpOnly, Secure, SameSite=Lax, host-only. Cookie domain chung do HRM sở hữu được giữ nguyên. QLTB chỉ dọn các alias host-only của chính host hiện tại.
- Lần truy cập đầu có thể chuyển tiếp một cặp cookie legacy không mâu thuẫn. Sau khi đã có binding QLTB, các cookie ambient không thay thế phiên đó. SSO đổi người cần handoff URL rõ ràng hoặc đăng nhập trực tiếp. Các token được gỡ khỏi URL ngay khi nhận.
- Logout ghi dấu cục bộ `qltb.auth.logged-out.v1`, đồng bộ qua các tab và chặn tự nhận lại cả cookie HRM lẫn phiên HttpOnly còn sót. Đăng nhập trực tiếp hoặc handoff URL hợp lệ bắt đầu phiên mới.
- Mỗi lần lưu phiên có generation riêng, kể cả khi HRM trả cùng một JWT. Phản hồi logout/request cũ không xóa hoặc ghi đè lần đăng nhập mới.
- Access token hết hạn vẫn giữ binding tham chiếu HRM để backend khôi phục đúng phiên. Binding phía trình duyệt không thay thế việc xác minh trên backend. Kiểm tra lại quyền tạm khóa xác thực và giữ biểu mẫu của đúng chủ thể.

## Refresh và đăng nhập đồng thời

`BrowserSession` bổ sung `accessToken` mã hóa, `refreshedAt`, `state`, `source`, `tokenOwnership`. Bản ghi cũ mặc định `source=UNKNOWN`, `tokenOwnership=UNKNOWN`; bật cấu hình mới không tự đổi quyền sở hữu của bản ghi cũ.

Refresh khóa hàng MySQL. Các request đến trong vòng 10 giây sử dụng lại access token vừa cấp nếu còn hơn 10 giây hiệu lực. Quyền HRM và trạng thái cục bộ vẫn được xác minh trước khi trả token. Cơ chế này dùng được giữa nhiều worker.

Token xoay vòng được commit ở trạng thái `VALIDATION_PENDING` trước khi kiểm tra hồ sơ/quyền. Nếu kiểm tra tạm lỗi, lần sau kiểm tra lại cùng cặp token. SSO lưu cặp token ở `ADOPTION_PENDING` với hạn tạm 2 phút trước bước xác minh cuối cùng; chỉ đổi cookie, thay phiên cũ và áp hạn phiên đầy đủ sau khi xác minh thành công. Retry cùng operation khôi phục đúng bản ghi đó. Phản hồi khác chủ thể làm phiên thành `INVALID` và bỏ quyền sở hữu token đó.

Nếu HRM timeout, trả kết quả không xác định, hoặc ghi CSDL thất bại sau khi đã gửi yêu cầu đổi token, phiên được đánh dấu `REFRESH_UNCERTAIN` khi có thể ghi được. API trả mã `SESSION_REAUTH_REQUIRED`; frontend dừng tự thử và yêu cầu đăng nhập lại. Không có giao dịch nguyên tử giữa HRM và MySQL: mất phản hồi hoặc CSDL hoàn toàn mất kết nối vẫn cần HRM hỗ trợ đối soát/khôi phục để xử lý triệt để.

Frontend dùng khóa trình duyệt khi có hỗ trợ; backend vẫn kiểm soát độc lập. `X-Auth-Operation` nhận UUID ngẫu nhiên cho login/SSO. `BrowserAuthOperation` giữ fingerprint HMAC của ngữ cảnh và kết quả mã hóa trong 2 phút. Gửi lại cùng thao tác không gọi HRM tạo cặp token mới. Mất phản hồi SSO được thử lại bằng cùng operation ID, chỉ giữ refresh token tạm trong bộ nhớ.

Hai yêu cầu thay cùng cookie cũ chỉ tạo được một phiên kế tiếp. Phiên cũ trở thành `REPLACED`, xóa token và giữ tombstone 10 phút. Hai lượt đăng nhập đầu tiên độc lập, chưa có cookie và có operation ID khác nhau, vẫn là hai thao tác riêng; không áp unique theo HRM ID vì phải hỗ trợ nhiều thiết bị.

## Logout và quyền thu hồi HRM

Phản hồi logout có `localLoggedOut`, `hrmRevocation`, và `revoked` để tương thích. `revoked=true` chỉ khi có xác nhận thu hồi HRM.

| Trạng thái HRM | Ý nghĩa |
|---|---|
| `not_requested_shared` | Không yêu cầu thu hồi vì token dùng chung hoặc chưa xác định quyền sở hữu |
| `revoked` | HRM xác nhận thu hồi token riêng của ứng dụng |
| `pending` | Phiên QLTB đã kết thúc; tác vụ thu hồi riêng đang chờ thử lại |
| `unknown` | Phiên QLTB đã kết thúc; chưa xác định được kết quả thu hồi |

Mặc định `HRM_REFRESH_TOKEN_SCOPE=shared`: không gửi logout lên HRM. Chỉ đặt `application` sau khi HRM xác nhận token tạo từ direct login có thể bị thu hồi độc lập, và `/auth/logout` không làm mất phiên của ứng dụng khác. Chỉ các phiên DIRECT_LOGIN/MCP_LOGIN mới tạo khi chế độ này bật mới được ghi `tokenOwnership=APPLICATION`. Phiên SSO luôn là SHARED; dữ liệu cũ luôn UNKNOWN.

Thu hồi gửi token hiện tại trực tiếp, không refresh thêm một lần trước logout. `HrmRevocationTask` lưu token mã hóa trong giao dịch kết thúc/thay/xóa phiên, để không mất token cần thu hồi khi phiên cục bộ bị dọn. Tác vụ khóa hàng, tối đa 5 lần thử, tăng khoảng chờ, hạn lưu tối đa 24 giờ. Số tác vụ hết hạn bị loại được ghi trong báo cáo bảo trì; cần theo dõi trường hợp thu hồi không thành công. Access token đã cấp tuân theo TTL và cơ chế vô hiệu của HRM; xóa phiên QLTB chỉ ngăn việc gia hạn qua phiên đó.

## MCP

MCP tích hợp sử dụng dịch vụ phiên chung. Consent đọc cookie HttpOnly QLTB và bỏ các cookie access token dùng chung. Nếu access token hết hạn nhưng phiên còn hợp lệ, form consent gửi CSRF để gia hạn đúng phiên, không yêu cầu đăng nhập HRM lại. Bước consent kiểm tra Origin, PKCE S256, trạng thái người dùng và danh tính đã hiển thị.

MCP độc lập chuyển các endpoint OAuth về backend qua `CMMS_API_URL`; không tự gọi `/auth/login` HRM nữa. Backend quản lý đăng ký client, consent và authorization code cho cả hai đường. Client cũ có thể phải kết nối/cấp quyền lại sau đợt chuyển đổi. Authorization code được dọn mỗi phút, hạn 5 phút; số client/code được giới hạn. Discovery chỉ công bố authorization_code và S256, khớp khả năng hiện tại.

## Chuẩn bị và triển khai

1. Xác nhận commit/build đang chạy và thống kê số phiên/token còn hiệu lực, hết hạn ở QLTB và HRM. Chưa có số đo production trong lượt sửa này. Bản ghi token HRM đã hết hiệu lực có thể chỉ là lịch sử; không coi mọi dòng lưu là phiên còn dùng được.
2. Sao lưu, diễn tập migration `20261116100000_session_lifecycle` trên staging. Migration bổ sung cột và hai bảng, giữ refresh token cũ cùng định dạng mã hóa. Kiểm tra migration tạo BrowserSession trước đó đã được áp dụng.
3. Giữ nguyên `SESSION_ENCRYPTION_KEY` trên mọi worker. Dùng cùng khóa khi rollback; không đưa khóa/token vào log.
4. Triển khai migration trước backend mới. Đưa frontend/backend/MCP tương thích lên cùng đợt; backend mới không chạy trên schema cũ. Không dùng `db push --force-reset` cho triển khai.
5. Chạy `npm run sessions:audit` ở thư mục backend. Lệnh chỉ thống kê theo state/source/ownership và đếm bản ghi hết hạn; không xuất token/cookie/mật khẩu.
6. Xem kết quả rồi chạy `npm run sessions:cleanup` để dọn có giới hạn. Sau nghiệm thu, bật `SESSION_MAINTENANCE_ENABLED=true` để tiếp tục dọn phiên, operation hết hạn và thử lại tác vụ thu hồi. Cần bật bảo trì trong cấu hình phát hành để dữ liệu tạm không tích tụ lâu dài.
7. Thử nhóm nhỏ 24–48 giờ, rồi mở rộng. Theo dõi login, refresh exchanged/reused, lỗi cần đăng nhập lại, số phiên theo trạng thái và tác vụ thu hồi thất bại. Log sự kiện không chứa token.

```dotenv
HRM_REFRESH_TOKEN_SCOPE=shared
SESSION_MAINTENANCE_ENABLED=false
SESSION_MAINTENANCE_INTERVAL_SECONDS=3600
```

Worker bảo trì mặc định tắt; chu kỳ được phép từ 60 giây đến 24 giờ. Mỗi lượt dọn tối đa 10 lô, mỗi lô 500 phiên, kiểm tra lại hạn dưới khóa hàng trước khi xóa. Nhiều worker được kiểm soát bằng khóa CSDL; tác vụ không xóa phiên còn hạn. Tombstone đã loại token cũng được dọn khi hết hạn.

Quay lui: tắt worker bảo trì, dùng lại build đã lưu và giữ schema bổ sung cùng khóa mã hóa. Không drop bảng/cột mới trong lúc quay lui. Phần dữ liệu đã xóa hoặc token HRM đã thu hồi không được khôi phục bằng việc rollback ứng dụng. Giữ thông tin tác vụ chưa hoàn tất để xử lý tiếp. Bản cũ không có các bảo vệ logout/cookie mới nên cần đánh giá trước khi quay lui frontend.

## Kiểm chứng

Lượt kiểm chứng cuối trong workspace: 96 kiểm thử backend liên quan đạt; 29 kiểm thử frontend đạt; 10 kiểm tra MySQL thật trên CSDL tạm đạt; 11 kiểm tra phiên trên trình duyệt thật đạt (fixture cũng chạy 7 kiểm tra user merge). Build backend, frontend và MCP đều thành công.

- Backend: bộ test auth, quyền truy cập, sanitize response, user merge và MCP dùng dữ liệu giả; có các ca mất phản hồi, token xoay vòng, retry, thay phiên đồng thời và dọn theo lô.
- Frontend: các ca cookie chung/host, logout, expiry, chuyển người, generation khi JWT trùng nhau và SSO retry cùng operation.
- Trình duyệt thật: form qua focus/refresh, khóa thao tác khi xác minh, đổi người, hai tab và cookie HttpOnly.
- `npm run test:auth:mysql`: yêu cầu MySQL loopback và quyền tạo CSDL thử. Chỉ tạo CSDL tên ngẫu nhiên `codex_auth_test_*`, áp hai migration phiên vào đó, dùng hai kết nối độc lập, rồi xóa đúng CSDL vừa tạo. HRM giả lập; không đọc/reset bảng ứng dụng.
- Build backend/frontend/MCP. Các bài tích hợp nghiệp vụ cũ tự reset các CSDL thử riêng không nằm trong lệnh kiểm thử auth này; cần chạy theo quy trình kiểm thử nghiệp vụ của dự án.

Chưa nghiệm thu HRM thật, reverse proxy production, số liệu token thực tế hoặc phát hành nhóm nhỏ. Cấu hình thu hồi riêng tiếp tục tắt cho tới khi có xác nhận về hợp đồng HRM.

## Chạy thử ứng dụng local

Ngày 16/11/2026 đã áp SQL của migration bổ sung vào `localhost:3306/dk_cmms` sau khi đối chiếu schema: thêm 5 cột BrowserSession và 2 bảng, không reset dữ liệu. CSDL local có schema nền nhưng chưa có bảng lịch sử Prisma migration; không dùng thao tác này thay cho quy trình migration production.

Backend chạy tại `http://localhost:3001`, giao diện tại `http://localhost:5174/login`, Swagger tại `http://localhost:3001/api/v1/docs`. Dùng hostname `localhost` cho giao diện để khớp Origin cấu hình local.

Khởi động backend trong PowerShell tại thư mục `backend`:

```powershell
$env:NODE_ENV = 'development'
$env:LOCAL_REVIEW_MODE = 'true'
$env:SESSION_COOKIE_SECURE = 'false'
$env:SESSION_MAINTENANCE_ENABLED = 'false'
$env:HRM_REFRESH_TOKEN_SCOPE = 'shared'
node --env-file=.env -r ts-node/register src/main.ts
```

Khởi động frontend trong PowerShell khác tại thư mục `frontend`:

```powershell
npm run dev -- --host 127.0.0.1
```

`LOCAL_REVIEW_MODE=true` chỉ có tác dụng khi `NODE_ENV=development`: bỏ các bước tự đồng bộ dữ liệu Equipment/OEE/WorkOrder, tác vụ tự sinh lịch bảo trì và chuyển email sang mô phỏng. Các API nghiệp vụ và xác thực vẫn chạy bình thường. Tham số được truyền riêng cho tiến trình local; không sửa thông tin kết nối/bí mật trong `.env`.

Kiểm tra trên ứng dụng đang chạy: 9 kiểm tra HTTP/API đạt, gồm health/CSDL, Swagger, session/me chưa đăng nhập trả 401, CORS có credentials và header operation, origin lạ trả 403. 10 kiểm tra trình duyệt local đạt, gồm trạng thái ô nhập/nút submit, CORS, không có bản sao token, validate form trống, chặn trang yêu cầu đăng nhập và không có ngoại lệ JavaScript. Không gửi tài khoản giả hoặc đoán mật khẩu tới HRM. Đăng nhập/gia hạn/đăng xuất với HRM thật cần người dùng nhập tài khoản của mình trên giao diện local.
