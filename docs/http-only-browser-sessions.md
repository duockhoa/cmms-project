# Phiên trình duyệt HttpOnly của QLTB

Triển khai trong mã nguồn ngày 04/11/2026. Chưa chạy migration hoặc đưa lên máy chủ.

## Luồng mới

1. Trình duyệt gọi `POST /api/v1/auth/login` với username/password qua HTTPS. Backend xác minh HRM, trạng thái cục bộ và quyền vào ứng dụng.
2. Backend lưu refresh token đã mã hóa AES-256-GCM trong bảng `BrowserSession`. Khóa mã hóa lấy từ `SESSION_ENCRYPTION_KEY`, mỗi bản ghi dùng nonce riêng và được ràng buộc với ID phiên.
3. Trình duyệt nhận cookie chứa mã phiên ngẫu nhiên, không chứa refresh token. CSDL chỉ giữ hash của mã cookie. Cookie production tên `__Host-qltb-session`, có `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, không có Domain.
4. JSON đăng nhập chỉ trả access token và metadata phiên/CSRF. Refresh token không được trả về từ các endpoint trình duyệt, không lưu trong localStorage hoặc cookie JavaScript của phiên mới.
5. `GET /api/v1/auth/session` trả metadata/CSRF nếu cookie còn hợp lệ. `POST /auth/refresh` gửi cookie tự động, `X-CSRF-Token` và HRM ID đang mong đợi. Backend kiểm tra Origin, CSRF, hạn phiên và chủ thể, khóa bản ghi MySQL bằng `FOR UPDATE` rồi gia hạn. Token HRM xoay vòng được cập nhật ở server; phản hồi refresh không thay cookie phiên.
6. `POST /auth/logout` kiểm tra Origin/CSRF/chủ thể và xóa bản ghi phiên, kể cả khi HRM chưa xác nhận thu hồi. Cookie cũ trở thành mã vô hiệu. Endpoint này không gửi header xóa cookie để phản hồi logout cũ không xóa cookie của tài khoản vừa đăng nhập ở tab khác. Access token phía client được dọn và các tab được thông báo như trước. Thời điểm vô hiệu access token tại HRM vẫn phụ thuộc hợp đồng HRM.

Access token vẫn được trình duyệt sử dụng cho API và luồng OAuth/MCP hiện hữu. Đợt này chuyển việc quản lý **refresh token**; không tuyên bố access token đã trở thành HttpOnly.

## Tương thích cổng HRM

- Với đăng nhập trực tiếp QLTB: JavaScript không nhận refresh token.
- Với cổng HRM cũ truyền cặp token qua URL hoặc cookie JavaScript: QLTB xóa token khỏi URL, chuyển refresh token vào bộ nhớ tạm và xóa bản lưu/cookie refresh cũ. Sau khi xác minh access token, `POST /auth/session` xác minh refresh token cùng HRM ID rồi tạo phiên backend. Giá trị tạm được tiêu thụ một lần và không được ghi lại vào storage.
- Đây là cầu chuyển tiếp cho giao thức cũ; refresh token do cổng cũ truyền vẫn đi qua JavaScript một lần. Muốn không truyền refresh token qua JavaScript ngay từ đầu cần phía cổng cấp mã handoff một lần để backend trao đổi trực tiếp. Không tự giả định HRM đã có endpoint trao đổi mã này.
- Nếu cổng chỉ chuyển access token và không có phiên backend tương ứng, người dùng có thể dùng access token hợp lệ; khi hết hạn cần đăng nhập lại để tạo phiên refresh backend. Không dùng refresh token của người khác để gia hạn.
- Cookie host-only của QLTB không đăng nhập hoặc đăng xuất thay cho các ứng dụng anh em. Cổng HRM vẫn chịu trách nhiệm phiên riêng của nó.

## Cấu hình trước khi restart

```dotenv
NODE_ENV=production
SESSION_COOKIE_SECURE=true
SESSION_ENCRYPTION_KEY=<64 ký tự hex ngẫu nhiên>
SESSION_MAX_AGE_SECONDS=2592000
TRUST_PROXY=loopback
```

Sinh khóa riêng bằng `openssl rand -hex 32`, lưu trực tiếp vào cấu hình bí mật của máy chủ. Không đưa khóa vào git, tài liệu hoặc log. Tất cả worker/instance QLTB dùng cùng khóa và cùng CSDL. Đổi/mất khóa làm các phiên đã lưu không giải mã được; người dùng phải đăng nhập lại. Giữ khóa khi rollback/khôi phục backup.

`SESSION_MAX_AGE_SECONDS` là hạn tuyệt đối của phiên QLTB, từ 60 giây đến 30 ngày; HRM có thể cho token hết hạn sớm hơn. Cookie production bắt buộc HTTPS. Chỉ môi trường development/test HTTP được dùng cookie không Secure (`qltb-session`).

Chỉ tin reverse proxy thật qua `TRUST_PROXY`. Với Nginx cùng máy, dùng `loopback` và đảm bảo Nginx chuyển `X-Forwarded-For`. Bộ giới hạn xác thực là 30 lần/phút/IP/worker, trả 429 khi vượt; không giả định bộ giới hạn này được chia sẻ giữa nhiều worker. Cấu hình proxy sai có thể khiến mọi người bị tính cùng IP. Origin frontend thực tế phải nằm trong danh sách CORS được phép; cookie SameSite=Lax phù hợp các ứng dụng cùng site qua HTTPS.

## Migration và build

Review và diễn tập staging trước khi chạy trên CSDL vận hành. Migration mới:

`backend/prisma/migrations/20261104120000_add_browser_sessions/migration.sql`

Migration tạo bảng phiên độc lập, không sửa ID người dùng, quyền hoặc lịch sử phiếu. Vẫn cần migration tách trạng thái HRM/khóa cục bộ của đợt trước. Khi lịch sử migration đã được đối soát và có backup:

```bash
cd ~/cmms/backend
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart cmms-backend --update-env

cd ../frontend
npm ci
npm run build
sudo rsync -a --delete dist/ /var/www/cmms/
sudo nginx -t
sudo systemctl reload nginx
```

Không dùng `db push` thay cho các migration có cập nhật dữ liệu. FE và BE phải được đưa lên cùng đợt: FE cũ gửi refresh token trong JSON sẽ không tương thích luồng mới. Bản build/cấu hình trước đó cần được giữ để rollback; không xóa bảng phiên khi rollback. Có thể cần đăng nhập lại trong đợt chuyển đổi.

Lập tác vụ bảo trì xóa bản ghi `BrowserSession` đã quá `expiresAt`; bản ghi hết hạn không được dùng để gia hạn kể cả khi chưa được dọn.

## Kiểm chứng và giới hạn

- 82 kiểm thử backend đạt, gồm HTTP login/bootstrap/refresh/logout, cookie flags, mã hóa, thiếu/sai CSRF, Origin, tài khoản khác/bị khóa, token xoay vòng và logout khi HRM lỗi. Các test dùng CSDL giả lập, chưa chứng minh khóa hàng trên MySQL thật.
- 18 kiểm thử frontend đạt, gồm chuyển refresh legacy một lần, không lưu refresh token và không gia hạn nhầm chủ thể.
- Chrome headless đạt 11 kiểm tra: giữ form/refresh/đổi người/nhiều tab và kiểm tra cookie do `BrowserSessionService` thật tạo. JavaScript không thấy cookie HttpOnly; trình duyệt vẫn gửi cookie để backend đọc phiên. Fixture dùng backend/storage giả lập, không truy cập HRM hoặc CSDL vận hành.
- Chưa nghiệm thu với HRM thật, MySQL staging và Nginx production. Cần kiểm tra đăng nhập từ cổng, refresh khi hai tab mở, gỡ quyền ứng dụng, khóa nhân sự, logout khi HRM mất kết nối và đăng nhập người mới trong lúc phiên cũ còn request đang chạy.
