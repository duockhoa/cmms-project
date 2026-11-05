**Kế hoạch cải tiến đăng nhập và phân quyền QLTB — bản đề xuất để review**

Ngày lập: 03/11/2026.

Bản nền đã commit và push: [`fca7ae38bf9959577cd5acb9b4506799f6a1500f`](https://github.com/duockhoa/cmms-project/commit/fca7ae38bf9959577cd5acb9b4506799f6a1500f), nhánh `origin/master`. Đã xác nhận SHA trên remote trùng SHA local. Bản này gồm 41 file về nhận diện/phiên; 52 kiểm thử backend, 16 kiểm thử frontend và cả hai bản build đều đạt khi kiểm tra riêng đúng nội dung commit.

Các thay đổi OEE có sẵn và báo cáo rà soát mới được giữ ngoài commit nền. Cập nhật 04/11/2026: đã triển khai phần mã nguồn và kiểm thử cho các mốc 1–4; xem [báo cáo triển khai](hrm-auth-implementation-status.md). Mốc 0 còn cần xác nhận cấu hình HRM và xuất quyền trên môi trường đích; migration và nghiệm thu staging chưa thực hiện. Mốc 5 đã có phiên backend qua cookie HttpOnly, CSRF và giới hạn xác thực; xem [hướng dẫn phiên trình duyệt](http-only-browser-sessions.md). Cầu SSO cũ còn truyền refresh token tạm thời qua JavaScript một lần; muốn bỏ hẳn bước này cần phía cổng hỗ trợ mã handoff.

Căn cứ: [báo cáo 12 phát hiện](hrm-auth-permissions-review.md) và [tài liệu HRM](https://docs.dkpharma.io.vn/api-docs). Tài liệu công bố API cấp ứng dụng, permissionKeys và logout thu hồi refresh token; một số chi tiết giao thức cần xác nhận ở mốc chuẩn bị.

**Nguyên tắc đề xuất**

```text
Cho phép một thao tác khi đồng thời thỏa mãn:
  Phiên HRM hợp lệ + người dùng HRM đang hoạt động
  + được HRM cấp ứng dụng QLTB
  + tài khoản QLTB liên kết đúng và không bị khóa
  + có quyền hành động trong QLTB
  + thuộc phạm vi tài nguyên/bộ phận/phân công được phép.
```

HRM quản lý danh tính, tình trạng nhân sự và quyền vào ứng dụng. QLTB giữ quyền nghiệp vụ và phạm vi dữ liệu theo cấu hình hiện có. Quyền quản trị HRM không tự biến thành quyền quản trị QLTB. Muốn chuyển quyền chi tiết sang HRM cần bảng ánh xạ được review riêng.

**Mốc 0 — Chốt hợp đồng tích hợp và ma trận quyền**

Công việc:

- Xác nhận application key/ID thật của QLTB và cấu trúc response `/users/me/applications` bằng API chỉ đọc với tài khoản thử nghiệm phù hợp.
- Xác nhận các permissionKeys HRM đang có, trạng thái tài khoản, thời hạn token, hành vi logout và quy tắc cookie/handoff của cổng ứng dụng. Không suy đoán JWT claims hay tự đặt application key.
- Liệt kê toàn bộ route backend theo các cột: phương thức, đường dẫn, loại xác thực, quyền hành động, phạm vi dữ liệu, vai trò được phép.
- Phân loại rõ route công khai, route người dùng và route máy đồng bộ. Kiểm tra MCP có đang được triển khai hay không.
- Xuất báo cáo cấu hình nhóm quyền/người dùng hiện tại ở chế độ chỉ đọc để tránh siết quyền làm chặn nhầm nghiệp vụ hợp lệ.
- Chốt quy tắc ADMIN/SUPER_ADMIN và quyền trực tiếp của người dùng khi một nhóm bị vô hiệu hóa; chốt ưu tiên giữa trạng thái HRM và thao tác khóa QLTB của quản trị viên.

Bàn giao: ma trận quyền và bảng ánh xạ tích hợp cụ thể. Không đổi quyền hoặc liên kết tài khoản trong bước này.

**Mốc 1 — Chặn vượt quyền ở backend, ưu tiên trước khi triển khai bản mới**

Công việc:

- Xây dựng một bộ tính quyền duy nhất dùng cho permission guard, service, `/auth/me` và kết quả gửi frontend.
- Áp dụng kiểm tra quyền cho mọi route nghiệp vụ theo ma trận. Route chưa có chính sách rõ ràng phải bị từ chối thay vì mặc định cho phép; các ngoại lệ công khai được khai báo rõ.
- Bổ sung kiểm tra bộ phận, phân công và quyền sở hữu đối với từng tài nguyên. ID do client gửi không phải bằng chứng người dùng được phép truy cập tài nguyên đó.
- Khi nhóm bị vô hiệu hóa, bỏ toàn bộ quyền đến từ nhóm. Quyền trực tiếp được xử lý theo chính sách đã chốt, tài khoản bị khóa không được dùng quyền riêng để vượt khóa.
- Thống nhất ADMIN giữa helper, guard, `/auth/me` và giao diện; loại bỏ guard cũ không sử dụng.
- Tách API key EVN khỏi luồng đăng nhập người dùng. Cấp danh tính máy với danh sách route/phương thức/quyền hạn cụ thể; bỏ key mặc định và việc cấp ADMIN toàn cục.
- Nếu MCP đang được sử dụng: bỏ mật khẩu dự phòng và việc tự ký token thay HRM; JWT verify thất bại phải dừng ngay, không tiếp tục bằng decode. Dùng chung bộ chọn danh tính, trạng thái và kiểm tra quyền với API chính.

Điều kiện nghiệm thu:

- Không có phiên: 401; có phiên nhưng thiếu quyền/cấp ứng dụng/phạm vi: 403.
- Mọi trường hợp bị từ chối đều không gọi hàm ghi CSDL.
- Nhóm quyền đã tắt không còn cấp quyền; ADMIN được xử lý nhất quán.
- Bot EVN không gọi được API quản trị người dùng, thay quyền hoặc xóa thiết bị ngoài phạm vi được cấp.
- Token giả/sai chữ ký/hết hạn bị từ chối ở cả web, API và MCP; không có fallback mật khẩu mặc định.

**Mốc 2 — Hoàn thiện cấp ứng dụng và vòng đời đăng nhập HRM**

Công việc:

- Kiểm tra `/users/me/applications` ở backend trước khi cấp quyền vào QLTB hoặc provision tài khoản mới. Người chưa được cấp QLTB không được tự tạo tài khoản để vào hệ thống.
- Giữ bảng quyền nghiệp vụ QLTB làm nguồn quyền chi tiết theo nguyên tắc trên. Nếu cần dùng `/users/me/permissions`, chỉ áp dụng key đã có ánh xạ được duyệt, không cộng toàn bộ quyền HRM vào quyền nội bộ.
- Ràng buộc cặp token với cùng ID HRM đã xác minh; token chuyển từ cổng ứng dụng chưa chứng minh được cùng chủ thể không được tự dùng để gia hạn phiên khác.
- Thêm logout backend gọi `/auth/logout` bằng refresh token thuộc phiên hiện tại, sau đó xóa phiên/cache/kết nối ở client và các tab liên quan.
- Khi HRM mất kết nối trong lúc logout, vẫn kết thúc phiên cục bộ và thông báo chính xác trạng thái thu hồi; không báo đã thu hồi thành công khi chưa được HRM xác nhận.
- Định nghĩa thời gian hiệu lực cache cấp ứng dụng và cách cập nhật khi HRM đổi quyền. Không cache quyền cũ dài hạn chỉ để giảm số lần gọi API.

Điều kiện nghiệm thu:

- Có tài khoản HRM nhưng không được cấp QLTB: không vào được API nghiệp vụ.
- Được cấp QLTB nhưng không có quyền sửa/xóa: chỉ làm được thao tác được cho phép.
- Sau logout thành công, refresh token đó không gia hạn được nữa.
- Không coi việc thu hồi refresh token là bằng chứng access token mất hiệu lực ngay; hành vi access token phải được xác minh với HRM.
- Đổi A → B hoặc nhận token trả về muộn không thể chuyển danh tính ngược về A.

**Mốc 3 — Giữ đúng liên kết tài khoản và lịch sử**

Công việc:

- Bỏ nhánh tự chuyển lịch sử sang người trùng tên trong `deleteUser`. Với tài khoản đã có lịch sử, thao tác quản trị mặc định là vô hiệu hóa và giữ nguyên tác giả.
- Nếu cần gộp tài khoản, lập quy trình riêng có bằng chứng định danh và bản đối chiếu được duyệt; không gộp ngầm khi xóa hay đồng bộ.
- Phân biệt đổi email/họ tên hợp lệ với việc liên kết nhầm người. ID HRM không đổi và email mới không thuộc tài khoản khác không nên tự gây lỗi đăng nhập.
- Bảo đảm đồng bộ HRM không tự mở lại tài khoản đã bị quản trị QLTB khóa theo chính sách đã chốt. Nếu cần tách trạng thái trong schema, trình rõ migration và phương án chuyển dữ liệu trước khi chạy.
- Đối soát riêng tài khoản thiếu liên kết `941` và 7 nhóm trùng tên đã phát hiện. Mọi sửa liên kết hoặc lịch sử phải có danh sách cụ thể để review, không suy luận chỉ từ tên.

Điều kiện nghiệm thu:

- Xóa/vô hiệu hóa một người không làm thay đổi người thực hiện trong phiếu và lịch sử cũ.
- Hai nhân viên trùng tên vẫn là hai tài khoản độc lập.
- Đổi hồ sơ HRM hợp lệ không đổi ID nội bộ, quyền hay tác giả lịch sử.
- Đồng bộ không tự mở khóa QLTB hoặc hợp nhất các bản ghi mâu thuẫn.

**Mốc 4 — Giữ biểu mẫu khi kiểm tra lại phiên và tối ưu hiệu năng**

Công việc:

- Tách thay đổi token khỏi thay đổi người dùng. Refresh token của cùng một người không được mặc định coi là đổi tài khoản.
- Khi quay về tab, xác minh lại phiên mà vẫn giữ nội dung biểu mẫu. Có thể tạm khóa nút ghi trong lúc chưa xác minh xong; chỉ xóa dữ liệu cá nhân và gỡ màn hình khi đã xác nhận đổi người hoặc kết thúc phiên.
- Giữ cách loại bỏ phản hồi cũ khi thực sự đổi danh tính, bao gồm hồ sơ, quyền, thông báo và catalog.
- Ưu tiên truy vấn unique theo hrmId sau khi đã xác minh. Tránh `/auth/me` và permission guard cùng tải lại dữ liệu đã có trong actor nếu không cần.
- Gom các lần gọi HRM đồng thời cho cùng token, tách cache hồ sơ HRM khỏi quyền QLTB. Đổi quyền một người không cần xóa toàn bộ cache HRM của mọi người.
- Ghi số lần gọi HRM, số truy vấn CSDL và thời gian phản hồi trước/sau để đánh giá, không đặt mục tiêu tăng tốc bằng phần trăm khi chưa có số đo.

Điều kiện nghiệm thu:

- Đang nhập phiếu, chuyển tab rồi quay lại: nội dung chưa lưu vẫn còn khi vẫn là cùng một người.
- Tự refresh cùng phiên không làm mất biểu mẫu hoặc kết nối sai người.
- Chuyển thật sang tài khoản khác: không giữ hồ sơ, quyền hoặc dữ liệu cá nhân của người trước.
- Các request đồng thời cùng token dùng chung lần xác minh HRM đang chạy; quyền bị thu hồi vẫn được thực thi kịp thời theo thời hạn cache đã chốt.

**Mốc 5 — Thu hẹp nơi giữ token và nguồn truy cập**

Công việc:

- Chốt giao thức SSO cùng phía cổng ứng dụng trước khi thay cookie. Tài liệu hiện tại chưa đủ để tự giả định đã hỗ trợ OIDC/authorization-code flow.
- Đưa login/refresh/logout qua backend và chuyển sang cookie HttpOnly, Secure của QLTB theo giao thức được duyệt; tránh giữ refresh token trong localStorage hoặc cookie JS đọc được trên nhiều ứng dụng.
- Chỉ cho phép các origin cần thiết trong CORS; giữ các kênh máy được xác thực riêng.
- Bổ sung CSRF và giới hạn tần suất phù hợp khi dùng cookie phiên. Không ghi token, mật khẩu hay API key vào log hoặc báo cáo.

Điều kiện nghiệm thu: đăng nhập từ cổng ứng dụng vẫn hoạt động; các origin ngoài danh sách không đọc được response có thông tin phiên; JavaScript của trang không đọc được refresh token của phiên QLTB mới. Mốc này được triển khai phối hợp, không ép đổi giao thức một phía.

**Cách triển khai và kiểm chứng**

- Tạo nhánh cải tiến riêng từ commit nền; chia commit/PR theo các mốc để review và khôi phục độc lập. Không trộn phần OEE đang làm vào nhánh này.
- Dùng dữ liệu mô phỏng cho kiểm thử âm của từng route, sau đó nghiệm thu trên staging với phiên HRM thật của các nhóm: quản trị, quản lý bộ phận, kỹ thuật viên, người dùng thường, người chưa được cấp ứng dụng và tài khoản bị khóa.
- Chạy lại 68 kiểm thử nền, bổ sung kiểm thử cho toàn bộ lỗi mới và ma trận quyền. Không chạy các test cũ có lệnh reset database trên CSDL vận hành.
- Cần có ít nhất một lượt kiểm thử trình duyệt thật cho form chưa lưu, nhiều tab, refresh tự động, đổi người và logout; kiểm thử mô phỏng đơn thuần chưa thay thế được bước này.
- Mọi migration dữ liệu, thay quyền hiện hữu, đổi liên kết hoặc chuyển giao thức SSO phải có nội dung cụ thể được review trước khi áp dụng.
- Sau khi staging đạt, báo lại thay đổi, kết quả và phần còn hạn chế trước khi triển khai server. Mỗi đợt giữ bản build/cấu hình trước đó để khôi phục; không tự khôi phục bằng cách viết lại lịch sử người thao tác.

Thứ tự triển khai: xác nhận cấu hình mốc 0, nghiệm thu các mốc 1–4 trên staging rồi triển khai server; mốc 5 thực hiện khi đã thống nhất giao thức với phía cổng ứng dụng. Trạng thái kiểm chứng và các bước còn lại được ghi trong báo cáo triển khai.
