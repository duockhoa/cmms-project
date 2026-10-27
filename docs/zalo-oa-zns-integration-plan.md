# Kế Hoạch Tích Hợp Thông Báo Zalo OA & ZNS Cho Hệ Thống CMMS
**Tài liệu kỹ thuật & Kế hoạch triển khai (Technical Specification & Action Plan)**  
*Ngày lập: 19/10/2026*  
*Trạng thái: Dự thảo kế hoạch (Chưa can thiệp code)*

---

## 1. Mục Tiêu & Mô Hình Tích Hợp (Hybrid Architecture)

### 1.1. Mục tiêu
- Tự động hóa gửi thông báo sự cố, giao việc bảo dưỡng, phê duyệt yêu cầu tới Zalo cá nhân của kỹ thuật viên và cán bộ quản lý.
- Đảm bảo **100% người dùng nhận được thông báo quan trọng**, không bị thất lạc.
- Tối ưu hóa chi phí vận hành bằng mô hình **Hybrid thông minh (Kết hợp Tin nhắn OA miễn phí và ZNS qua số điện thoại)**.

### 1.2. Sơ đồ luồng gửi tin thông minh (Smart Fallback Router)

```
       [Sự kiện nghiệp vụ] (Báo sự cố khẩn cấp / Giao Work Order / Phê duyệt)
                                │
                                ▼
                   [NotificationEventListener]
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
     [In-App WebSocket]     [Email MailService]     [ZaloSmartRouterService]
     (Hiển thị web)         (Gửi email DKPharma)    (Xử lý Zalo đa kênh)
                                                    │
                                                    ▼
                                    Nhân viên đã liên kết Zalo OA?
                                    (User.zaloUserId != null)
                                           │              │
                                          CÓ            KHÔNG
                                           │              │
                                           ▼              │
                             Thử gửi tin nhắn OA trực tiếp  │
                             (Miễn phí qua API OA)        │
                                   │              │       │
                               Thành công      Thất bại   │
                                   │       (Hết hạn tương tác)
                                   │              │       │
                                   │              ▼       ▼
                                   │       [TỰ ĐỘNG CHUYỂN HƯỚNG ZNS]
                                   │       Gửi tin ZNS theo Số điện thoại
                                   │       (Zalo Cloud - Trừ phí ZCA ~200đ)
                                   │              │
                                   ▼              ▼
                              [Ghi log vào ZaloNotificationLog]
```

---

## 2. Chuẩn Bị Tài Nguyên Phía Zalo (Checklist Doanh Nghiệp)

| STT | Hạng mục | Chi tiết thực hiện | Trách nhiệm | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Zalo OA Doanh nghiệp** | Đăng ký và nộp GPKD để lấy tích vàng xác thực OA. | Quản trị/Pháp lý | Đã có OA |
| 2 | **Tài khoản ZCA** | Đăng nhập `account.zalo.cloud` -> Tạo ZCA -> Liên kết với Zalo OA -> Nạp thử 100.000đ. | Quản trị/Kế toán | Cần làm |
| 3 | **Zalo Developers App** | Tạo App tại `developers.zalo.me`, liên kết với OA, xin quyền API (ZNS, Quản lý tin nhắn). | Kỹ thuật (Dev) | Cần làm |
| 4 | **Đăng ký mẫu tin ZNS** | Gửi duyệt 2 - 3 template thông báo cơ bản lên Zalo Cloud. | Quản trị + Dev | Cần làm |

### Danh sách các mẫu tin ZNS cần đăng ký trước:
1. **Mẫu 1: Thông báo sự cố thiết bị khẩn cấp (Emergency Request)**
   - *Tham số:* `<ten_nguoi_nhan>`, `<ma_su_co>`, `<ten_thiet_bi>`, `<vi_tri>`, `<thoi_gian>`, `<link_chi_tiet>`
2. **Mẫu 2: Phân công phiếu bảo trì / công việc (Work Order Assignment)**
   - *Tham số:* `<ten_ky_thuat_vien>`, `<ma_phieu>`, `<ten_thiet_bi>`, `<loai_cong_viec>`, `<han_hoan_thanh>`, `<link_chi_tiet>`
3. **Mẫu 3: Phê duyệt / Từ chối yêu cầu bảo trì (Request Approval / Rejection)**
   - *Tham số:* `<ten_nguoi_yeu_cau>`, `<ma_yeu_cau>`, `<trang_thai>`, `<nguoi_duyet>`, `<ly_do>`, `<link_chi_tiet>`

---

## 3. Thiết Kế Kỹ Thuật (Technical Design)

### 3.1. Cập nhật Cơ sở dữ liệu (Prisma Schema)

#### A. Mở rộng Model `User`:
```prisma
model User {
  // ... các trường hiện tại ...
  phoneNumber       String?   @unique   // Số điện thoại đăng ký Zalo (chuẩn hóa 84xxxxxxxxx)
  zaloUserId        String?   @unique   // ID người dùng trên Zalo OA (App-scoped UID)
  zaloFollowedAt    DateTime?           // Thời điểm bấm quan tâm OA
  isZaloNotifyActive Boolean  @default(true) // Cài đặt cá nhân: Có muốn nhận tin Zalo không
}
```

#### B. Thêm Model `ZaloNotificationLog` (Theo dõi & Kiểm soát chi phí):
```prisma
model ZaloNotificationLog {
  id            String   @id @default(uuid())
  userId        String?
  channel       String   // "OA_DIRECT" | "ZNS"
  recipient     String   // SĐT hoặc Zalo UID
  templateId    String?  // Mã template ZNS nếu gửi qua ZNS
  status        String   // "SUCCESS" | "FAILED" | "PENDING"
  messageId     String?  // ID trả về từ Zalo API
  price         Float?   @default(0) // Chi phí tin nhắn (nếu là ZNS)
  errorMessage  String?  @db.Text
  metadata      String?  @db.Text // JSON lưu context (mã WO, mã sự cố)
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

#### C. Cấu hình hệ thống (Bảng `SystemSetting` hoặc `.env`):
- `ZALO_APP_ID`: ID ứng dụng Zalo Developers
- `ZALO_APP_SECRET`: Khóa bí mật ứng dụng
- `ZALO_OA_ID`: ID của Zalo Official Account
- `ZALO_OA_SECRET_KEY`: Khóa bí mật OA
- `ZALO_REFRESH_TOKEN`: Refresh token dùng để lấy Access Token mới

---

### 3.2. Cấu trúc Module Backend mới: `ZaloModule`

Thư mục dự kiến: `backend/src/modules/zalo/`
```
backend/src/modules/zalo/
├── dto/
│   ├── send-zns.dto.ts
│   └── send-oa-message.dto.ts
├── services/
│   ├── zalo-auth.service.ts       // Quản lý PKCE OAuth 2.0, tự động refresh Access Token
│   ├── zalo-zns.service.ts        // Gọi API ZNS (Zalo Cloud) theo SĐT
│   ├── zalo-oa.service.ts         // Gọi API OA gửi tin trực tiếp theo Zalo UID
│   └── zalo-smart-router.service.ts // Điều hướng thông minh (OA -> ZNS Fallback)
├── zalo.controller.ts             // Nhận Webhook từ Zalo (Follow/Unfollow, QR Linking)
└── zalo.module.ts
```

#### Cơ chế tự động quản lý Token (PKCE Token Auto-Refresh):
- Zalo Access Token có hạn sử dụng **25 giờ**.
- `ZaloAuthService` sẽ chạy Cronjob định kỳ mỗi 12 giờ hoặc kiểm tra trước mỗi lần gọi API:
  * Nếu Access Token sắp hết hạn -> Dùng `refresh_token` gọi API `https://oauth.zalo.me/v4/oa/access_token` để lấy cặp Token mới.
  * Tự động lưu Token mới vào bảng `SystemSetting` trong DB, đảm bảo hệ thống không bao giờ bị gián đoạn.
  * Hỗ trợ **Simulation Mode**: Nếu thiếu biến môi trường, hệ thống chỉ in log ra Console, không gây lỗi hệ thống.

---

### 3.3. Tích hợp vào Bộ lắng nghe sự kiện (`NotificationEventListener`)

File cần tích hợp: [`notification-event.listener.ts`](file:///c:/Users/Admin/Desktop/PJ01/backend/src/modules/notifications/listeners/notification-event.listener.ts)

Thêm kênh gọi song song với Email và WebSocket:
```typescript
// Trong handleRequestCreated:
// 1. WebSocket Gateway (Đã có)
// 2. Email MailService (Đã có)
// 3. Zalo Smart Dispatcher (Mới):
await this.zaloSmartRouter.dispatch({
  targetUsers: [responsibleTech, ...managers],
  eventType: 'REQUEST_CREATED',
  title: 'Báo cáo sự cố mới',
  znsTemplateId: 'TEMPLATE_EMERGENCY_REQUEST',
  params: {
    ten_thiet_bi: equipment.name,
    ma_su_co: request.requestCode,
    vi_tri: location.name,
    link_chi_tiet: `${this.frontendUrl}/requests?id=${request.id}`
  }
});
```

---

### 3.4. Giao diện Frontend (UI/UX)

1. **Trang Thông tin cá nhân (`/profile`):**
   - Bổ sung trường nhập **Số điện thoại**.
   - Hiển thị khối **"Liên kết Zalo nhận thông báo"**:
     * Trạng thái: *Chưa liên kết* / *Đã liên kết với Zalo [Tên]*
     * Nút bấm: Quét mã QR dẫn tới Zalo OA (kèm mã hash liên kết) hoặc bấm nút Follow OA.
2. **Trang Cài đặt hệ thống (Dành cho Quản trị viên):**
   - Tab **"Cấu hình Zalo OA & ZNS"**:
     * Trạng thái kết nối Zalo API (Active / Disconnected).
     * Xem số dư ước tính hoặc kiểm tra hạn mức ZCA.
     * Nút **"Gửi tin nhắn thử nghiệm"** (Test Connection) tới 1 SĐT bất kỳ.
     * Bảng nhật ký gửi tin nhắn Zalo (`ZaloNotificationLog`).

---

## 4. Kế Hoạch Triển Khai Theo Giai Đoạn (Roadmap)

```
[Giai đoạn 1: Chuẩn bị tài nguyên] ──> [Giai đoạn 2: CSDL & Backend Service]
                 │                                        │
                 ▼                                        ▼
[Giai đoạn 4: Kiểm thử E2E & Vận hành] <── [Giai đoạn 3: UI & Tích hợp Event]
```

### Chi tiết các bước:
- **Giai đoạn 1 (Bên ngoài code):**
  1. Đăng ký & liên kết tài khoản ZCA với Zalo OA.
  2. Tạo App trên Zalo Developers, lấy App ID & Secret.
  3. Tạo mẫu tin ZNS chờ Zalo duyệt.
- **Giai đoạn 2 (Backend Core):**
  1. Chạy Prisma migration thêm `phoneNumber`, `zaloUserId` vào `User` và bảng `ZaloNotificationLog`.
  2. Tạo module `ZaloModule` gồm: `ZaloAuthService`, `ZaloZnsService`, `ZaloOaService`, `ZaloSmartRouterService`.
  3. Viết API test gửi tin và cơ chế Simulation Mode an toàn.
- **Giai đoạn 3 (Frontend & Sự kiện):**
  1. Thêm tab liên kết Zalo và cài đặt SĐT trong hồ sơ người dùng.
  2. Ghép `ZaloSmartRouterService` vào các sự kiện trong `NotificationEventListener`.
- **Giai đoạn 4 (Testing & Nghiệm thu):**
  1. Gửi tin thử nghiệm trên môi trường Sandbox/Test.
  2. Đo lường tốc độ nhận tin, tỉ lệ thành công và kiểm tra số dư ZCA.

---

## 5. Dự Toán Chi Phí & Quy Tắc Tiết Kiệm Ngân Sách

- **Cước phí ZNS:** Dao động khoảng **150đ - 300đ / tin**.
- **Quy tắc kiểm soát chi phí (Rate Limit & Filtering):**
  * Chỉ gửi ZNS đối với **sự cố khẩn cấp (Emergency)** hoặc **giao việc trực tiếp cho cá nhân**. Không gửi ZNS cho các thông báo cập nhật chung (để WebSocket và Email đảm nhiệm).
  * Ưu tiên gửi tin OA miễn phí nếu kỹ thuật viên đang trực tuyến và có tương tác với OA.
  * Giới hạn tối đa số tin ZNS trên 1 sự cố để tránh trường hợp vòng lặp sự kiện làm hao hụt số dư ZCA.
