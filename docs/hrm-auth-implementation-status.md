# Triển khai cải tiến đăng nhập và phân quyền QLTB

Ngày kiểm tra: 04/11/2026. Phạm vi: workspace hiện tại. Chưa triển khai staging/production, chưa áp dụng migration vào CSDL và chưa nghiệm thu bằng phiên HRM thật.

## Đối chiếu kế hoạch

| Mốc | Kết quả trong mã nguồn | Phần còn lại trên môi trường đích |
| --- | --- | --- |
| 0 | Ma trận 255 route HTTP sinh từ controller/policy; công cụ xuất báo cáo quyền chỉ đọc | Xác nhận application ID/key và response HRM thực tế; xuất báo cáo quyền trước/sau; đối soát danh tính theo ID |
| 1 | Guard toàn cục từ chối route chưa có policy; resolver quyền dùng chung; nhóm vô hiệu hóa không cấp quyền; EVN giới hạn đúng POST đồng bộ; MCP kiểm tra danh tính và phạm vi | Nghiệm thu từng vai trò, đặc biệt route có quyền liên quan nhiều module và dữ liệu khác bộ phận |
| 2 | Application gate trước provision; ID/key lấy bắt buộc từ môi trường; refresh kiểm tra cùng HRM ID; logout thu hồi token sau khi xác minh chủ thể | Kiểm chứng thu hồi refresh token thật và thời điểm mất hiệu lực access token tại HRM |
| 3 | Xóa người dùng chuyển thành khóa cục bộ; giữ nguyên lịch sử; HRM không mở khóa cục bộ; nhân sự mất khỏi snapshot được ghi hrmIsActive=false kể cả đã bị khóa; đổi email không chuyển danh tính | Review migration, backup, áp dụng staging; đối soát tài khoản thiếu liên kết và nhóm trùng tên bằng bằng chứng định danh |
| 4 | Tách phiên/token khỏi danh tính; giữ form khi revalidate; bỏ phản hồi phiên cũ; gom xác minh HRM đồng thời; /auth/me tái sử dụng tài khoản đã load trong JWT | Đo số request/truy vấn và độ trễ bằng workload staging; chưa có benchmark trước/sau |
| 5 | Cookie phiên HttpOnly host-only; refresh mã hóa tại backend; CSRF/Origin; giới hạn xác thực; CORS và WebSocket giới hạn origin | Migration bảng phiên, cấu hình khóa mã hóa và nghiệm thu HRM thật; phía cổng cần mã handoff để bỏ hoàn toàn truyền refresh token qua JavaScript ở luồng SSO cũ |

## Quy tắc được thực thi

- ADMIN/SUPER_ADMIN có hiệu lực được toàn quyền. Nếu nhóm gán cho tài khoản bị vô hiệu hóa, quyền từ nhóm và bypass vai trò cũ bị bỏ; quyền trực tiếp còn được xét. Tài khoản bị khóa không được dùng bất kỳ quyền nào.
- HRM quyết định danh tính/trạng thái/cấp ứng dụng; QLTB quyết định quyền nghiệp vụ/phạm vi. Không tự nhập quyền HRM thành quyền quản trị QLTB.
- Thiếu `HRM_APPLICATION_ID` hoặc `HRM_APPLICATION_KEY`: backend ở chế độ HRM báo lỗi cấu hình khi khởi động. Cần cấu hình cả hai bằng dữ liệu thật trước khi restart. Không có ID/key mặc định.
- Cache hồ sơ và cấp ứng dụng có TTL 30 giây; `/auth/me` kiểm tra lại với HRM. Quyền/trạng thái cục bộ được đọc trên mỗi request. Không cam kết thu hồi access token ngay khi logout nếu HRM chưa xác nhận hành vi này.
- Logout vẫn có thể thu hồi token sau khi gỡ quyền ứng dụng: refresh để xác minh chủ thể, rồi thu hồi refresh token mới nếu HRM xoay token. Nếu HRM không xác minh được chủ thể hoặc không xác nhận logout, client kết thúc phiên cục bộ và báo thu hồi chưa được xác nhận.

## Kết quả kiểm thử

- 95/95 kiểm thử backend thuộc 13 suite: policy inventory, HTTP guard, application gate, refresh/logout, danh tính, hồ sơ, scope, sync nhân sự, gộp thủ công, phiên HttpOnly và response sanitizer. HTTP test dùng JWT có chữ ký và storage giả lập, không reset CSDL.
- 18/18 kiểm thử phiên frontend: phiên cũ/mới, phản hồi muộn, refresh, cache, chuyển tài khoản, logout và chuyển refresh legacy một lần.
- Chrome headless: 11 kiểm tra đạt; giữ form khi focus/refresh cùng người, khóa ghi trong lúc xác minh, ẩn form trước khi xác minh người mới, đổi người xóa form, logout xóa form, hai tab cùng nhận đổi tài khoản/logout, JavaScript không thấy cookie HttpOnly và browser vẫn gửi cookie cho backend. Không có lỗi trình duyệt. Fixture mô phỏng HRM/storage, không gọi dữ liệu vận hành.
- Chrome cũng đạt 7 kiểm tra giao diện gộp thủ công: xem trước, tác động, đổi lựa chọn, bằng chứng, xác nhận cùng người, preview lỗi thời và kết quả audit.
- Build backend, frontend và mcp-server đạt. Schema Prisma hợp lệ. Ma trận có 255 route HTTP, gồm các alias; kiểm tra inventory xác nhận mọi handler có policy với mã quyền hợp lệ.
- Các kết quả này chưa thay thế kiểm thử với CSDL staging, HRM thật và cấu hình Nginx/PM2 trên máy chủ.

Chạy lại từ thư mục tương ứng:

```bash
# backend
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/common/auth/authorization.spec.ts src/common/auth/http-authorization.spec.ts src/modules/auth/hrm-application.spec.ts src/modules/auth/hrm-identity.service.spec.ts src/modules/auth/jwt-identity.spec.ts src/modules/auth/identity-resolution.spec.ts src/modules/auth/auth.spec.ts src/modules/auth/auth-profile.spec.ts src/modules/auth/browser-session.spec.ts src/common/utils/data-scope.helper.spec.ts src/modules/users/users.service.spec.ts src/common/interceptors/sanitize-response.interceptor.spec.ts
npm run build
npx prisma validate

# frontend
node tests/auth-session.test.cjs
npm run test:auth:browser
npm run build

# mcp-server
npm run build
```

Test trình duyệt tự chạy Vite trên loopback/cổng tự chọn, Chrome/Edge headless với profile tạm và dọn tiến trình sau test. Nếu không tự tìm thấy trình duyệt, đặt `AUTH_TEST_BROWSER` thành đường dẫn executable. Không dùng profile trình duyệt cá nhân.

## Chuẩn bị staging và migration

1. Sao lưu CSDL và giữ bản build/cấu hình đang chạy. Dùng CSDL staging riêng để diễn tập. Kiểm tra lịch sử migration bằng `npx prisma migrate status`; nếu có drift hoặc lịch sử chưa baseline thì đối soát trước khi deploy.
2. Xác nhận ID/key ứng dụng từ HRM; thêm vào `backend/.env` cùng các origin frontend thực tế. Mẫu cấu hình nằm trong `.env.example`. Không chép giá trị ID/key minh họa trong test vào server.
3. Từ backend đã cài dependency và sinh Prisma client mới, xuất báo cáo chỉ đọc trước migration:

   ```bash
   node --env-file=.env -r ts-node/register scripts/audit-auth-access.ts --before-migration > auth-access-before.json
   node -r ts-node/register scripts/export-auth-route-matrix.ts > auth-route-matrix.md
   ```

   Báo cáo quyền chứa ID nội bộ và cấu hình phân quyền; giữ trong vùng quản trị, không đưa lên webroot hoặc commit dữ liệu thật.

4. Review `prisma/migrations/20261103100000_separate_hrm_and_local_access/migration.sql`. Migration thêm `accessBlocked=false`, `hrmIsActive=NULL` và đặt `accessBlocked=true` cho toàn bộ tài khoản đang `isActive=false`. Không sửa ID, email, vai trò hay tác giả lịch sử. Lựa chọn này giữ trạng thái khóa hiện hữu; tài khoản trước đây chỉ bị HRM vô hiệu hóa cũng cần review trước khi mở khóa cục bộ.
5. Khi lịch sử migration hợp lệ và staging đã có backup, chạy `npx prisma migrate deploy`, sau đó `npx prisma generate`, `npm run build`. Không dùng `db push` thay cho migration này: `db push` không chạy câu UPDATE bảo toàn trạng thái khóa.
6. Xuất lại báo cáo bằng công cụ audit, bỏ `--before-migration`, so sánh ID/quyền. Đồng bộ HRM rồi kiểm tra nhân sự đang hoạt động, bị xóa, bị khóa QLTB, email thay đổi và tài khoản trùng tên. Không tự gộp tài khoản hay chuyển lịch sử.
7. Nghiệm thu HRM thật cho quản trị, quản lý bộ phận, kỹ thuật viên, người thường, người chưa được cấp ứng dụng và tài khoản khóa. Kiểm tra danh sách/chi tiết/phân công/sửa/xóa của sự cố, phiếu sửa chữa, gia công, tệp đính kèm, checklist và MCP. Tài khoản thiếu quyền hoặc khác phạm vi phải bị từ chối trước thao tác ghi.
8. Thử logout rồi dùng lại refresh token bằng công cụ kiểm thử phía server, không ghi token vào log. Kiểm tra đăng nhập từ cổng ứng dụng, focus tab, form chưa lưu, nhiều tab, refresh và đổi người.

## Triển khai máy chủ sau nghiệm thu

Chỉ dùng bản mã đã review và commit. Migration áp dụng trước khi chạy backend mới. Từ backend: `npm ci`, `npx prisma migrate deploy`, `npx prisma generate`, `npm run build`, rồi `pm2 restart cmms-backend --update-env`. Build frontend và triển khai `dist/` vào webroot Nginx đang cấu hình (`/var/www/cmms` theo thông tin máy chủ trước đó). Kiểm tra `nginx -t` trước reload. Nếu dùng MCP độc lập, build/restart tiến trình đó và kiểm tra xác thực của nó.

Bản HttpOnly còn cần migration `20261104120000_add_browser_sessions`, khóa `SESSION_ENCRYPTION_KEY` và đưa FE/BE lên cùng đợt; xem [hướng dẫn chi tiết](http-only-browser-sessions.md).

Phần gộp thủ công cần migration `20261104150000_add_manual_user_merge`; chỉ gộp sau khi xem trước và đối soát cùng người. Quyền đích không được cộng quyền nguồn. Xem [hướng dẫn gộp thủ công](manual-user-merge.md).

Nếu cần quay về bản build cũ, giữ hai cột bổ sung và các cờ khóa; chưa tự xóa cột hay phục hồi dữ liệu danh tính. Bản backend cũ không có các kiểm tra khóa/quyền mới, nên cần chốt phương án rollback với cấu hình truy cập phù hợp trước khi đưa production.
