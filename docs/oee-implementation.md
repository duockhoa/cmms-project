# OEE: triển khai theo Gap Analysis ngày 02/11/2026

## Phạm vi đã hoàn thành

Đã triển khai Fix A–F thuộc ưu tiên 1 và 2, cùng các mục ưu tiên 3: PA3, phân bổ nhiều lô trong cùng ca/ngày, theo dõi ngày thiết bị và dashboard đủ ba phương án. Chưa có bản `OEE Logic Specification – Ver 1.txt` trong dự án; các quy tắc dưới đây được đối chiếu với tài liệu Gap Analysis đính kèm. Các quy tắc phân bổ và ước tính phải bổ sung được nêu rõ để đối chiếu nghiệp vụ.

| Fix | Kết quả |
| --- | --- |
| A | Tổng hợp A/P/Q bằng tổng tử số / tổng mẫu số cho toàn kỳ, từng thiết bị, từng ngày và từng lô. Tốc độ lấy từ bản ghi ca; thay đổi cấu hình hiện tại không làm thay đổi P lịch sử. Không làm tròn sản lượng lý thuyết trước khi cộng. |
| B | Chấp nhận `runTimeMinutesOverride = 0`. Chỉ suy từ downtime khi thiếu override và thiếu dữ liệu thời gian. Từ chối override âm, không hữu hạn hoặc vượt tổng thời gian ghi nhận. |
| C | Hợp các khoảng chạy, hợp các khoảng nghỉ, rồi trừ phần giao. Xử lý hai lần ghi, khoảng trùng, nghỉ chồng hoàn toàn và ca qua đêm. Khi có bảng giờ, backend tính lại bằng cùng quy tắc với frontend. |
| D | Lưu `productCode`, `productGroup`, `batchOeeId`; lọc và tổng hợp lô qua nhiều ca/ngày. Khóa gồm mã thiết bị, mã sản phẩm và số lô. |
| E | Bảng `ProductSpeedConfig` định mức theo thiết bị × nhóm sản phẩm; giao diện cấu hình nhóm trong phần định mức thiết bị và chọn nhóm trên phiếu OEE. |
| F | Lưu `pa2PlanTimeMinutes`; dashboard và CSV có lựa chọn PA1/PA2/PA3. Bảng nhật ký sử dụng cùng phương án với thẻ tổng hợp. |

## Quy tắc tính toán

- PA1: lấy khoảng từ sự kiện đầu đến sự kiện cuối, trừ hợp thời gian dừng có kế hoạch để có thời gian sản xuất kế hoạch. Với dòng chỉ nhập phút, cộng thời lượng đó vì không biết vị trí trên trục giờ; nếu toàn bộ bảng không có thời gian, API cũ tiếp tục dùng các thời lượng gửi lên.
- Runtime: hợp các khoảng chạy máy, trừ phần giao với hợp các khoảng nghỉ ca. Không trừ thêm các đầu mục dừng khác khỏi khoảng chạy đã ghi. Khi chỉ nhập phút, không suy đoán phần giao nghỉ ca.
- PA2: `max(kết thúc ca chuẩn, sự kiện cuối) − min(bắt đầu ca chuẩn, sự kiện đầu)`. Theo công thức Fix F, đây là toàn khung ca; không trừ downtime lần nữa. Với dữ liệu chỉ có phút, dùng ít nhất độ dài ca chuẩn và cộng phần thời gian thủ công chưa định vị được.
- PA3: một khung 06:00–22:00, 960 phút cho mỗi thiết bị/ngày; không cộng 960 lần nữa cho từng ca hoặc từng lô. Chỉ tính runtime trong khung. Vì phiếu có sản lượng tổng, sản lượng trong khung được ước tính bằng tỷ lệ runtime trong khung / runtime của phiếu, áp dụng cùng tỷ lệ cho lượng đạt. Dữ liệu gốc không bị ghi đè.
- Ca chuẩn: CA_1 06:00–14:00; CA_2 14:00–22:00; CA_3 22:00–06:00 hôm sau; HANH_CHINH 07:30–17:00, theo cấu hình ca có sẵn trong code.
- Đã có phiếu nhưng sản lượng bằng 0: Q = 100%, P = OEE = 0. Chưa có phiếu: các chỉ số bằng 0. P hiển thị tối đa 120%, khi nhân OEE dùng tối đa 100%.
- Có nhóm sản phẩm: backend tra định mức nhóm; nếu chưa cấu hình, dùng định mức thiết bị. Không chọn nhóm: giữ cách nhập tốc độ thủ công của API cũ. Định mức được chụp vào bản ghi ca khi lưu.
- Chưa có danh mục ánh xạ mã sản phẩm → nhóm sản phẩm trong dự án, nên người nhập chọn/nhập nhóm trên phiếu. Không suy diễn nhóm từ mã sản phẩm.
- Mã lô thông thường có dạng `EQ1_SP1_LOT1`. Ký tự `%` và `_` bên trong từng thành phần được escape để tránh hai bộ mã khác nhau sinh cùng mã lô. Thiếu mã sản phẩm/số lô thì không tạo khóa tổng hợp.
- Ví dụ 08:00–17:00 trừ nghỉ 12:00–13:00 cho runtime **480 phút** (540 − 60). Con số 420 trong ví dụ của Gap Analysis là lỗi số học.

API analytics vẫn giữ các tên `avgAvailability`, `avgPerformance`, `avgQuality`, `avgOee` để tương thích client cũ; giá trị là tổng hợp có trọng số. `calculationMethod` nhận `PA1`, `PA2`, `PA3` và mặc định `PA1`. Cả API lịch sử và analytics nhận `batchOeeId`. Analytics trả thêm `batchSummary`, `batchOptions`, `equipmentDays`, `dataQuality` và `planTimeMinutes` theo phương án cho từng phiếu trong nhật ký. `totalShiftsRecorded` đếm thiết bị × ngày sản xuất × ca duy nhất; `totalRecordsRecorded` đếm số phiếu/lượt lô. Nhật ký analytics trả thời gian/sản lượng đã phân bổ cùng `recordedRunTimeMinutes`, `recordedTotalOutput` để đối chiếu số ghi gốc.

## Phân bổ nhiều lô và ngày thiết bị

- Tính trên toàn bộ các lô của thiết bị trước, sau đó mới áp dụng bộ lọc mã lô. Không cấp lại toàn bộ ca/ngày cho một lô chỉ vì đang lọc lô đó.
- Hợp các khung thời gian trên trục giờ của từng thiết bị, kể cả những khung mở rộng của các ca khác tên chồng nhau. Với PA1/PA2, mỗi đoạn khung thuộc nhiều phiếu được chia theo tỷ trọng runtime của phiếu; khi không có runtime, dùng thời gian ghi nhận. Với PA3, chia 960 phút giữa các lô theo runtime trong khung ngày, hoặc thời gian ghi nhận nếu tất cả đều bằng 0.
- Ví dụ hai lô cùng ca chạy 120 và 240 phút: PA2 của ca chuẩn 480 phút chia thành 160 và 320 phút; PA3 của ngày 960 phút chia thành 320 và 640 phút. Tổng mẫu số không đổi khi tách hoặc lọc các lô.
- Nếu phiếu cũ có khoảng chạy trùng nhau, mỗi đoạn chạy trùng chỉ tính một lần và chia đều cho các phiếu liên quan. Sản lượng khai báo của PA1/PA2 vẫn được giữ để đối chiếu; báo cáo cảnh báo dữ liệu chồng giờ. Không tự suy diễn rằng hai phiếu có cùng sản lượng là phiếu nhập trùng.
- Phiếu mới có khoảng chạy thực tế giao với phiếu hợp lệ đã lưu bị từ chối. Kiểm tra thực hiện bên trong transaction `ReadCommitted`, khóa theo thiết bị; bản ghi và số giờ vận hành được lưu/rollback cùng nhau. Không chặn trường hợp chỉ tiếp giáp giờ kết thúc/bắt đầu hoặc chạy trong khoảng nghỉ của phiếu trước.
- Phiếu chỉ có số phút chưa thể xác định vị trí thực tế. Các thời lượng này được xếp vào phần dung lượng ca còn lại theo thứ tự mã phiếu, giữ tổng phút khi còn đủ chỗ. Nếu tổng runtime khai báo vượt phần khung còn lại, giảm theo cùng tỷ lệ và cảnh báo `estimatedRuntimeReductionMinutes`. Kết quả mang nhãn ước tính; cần bổ sung giờ thực tế để có phân bổ chính xác.
- Nếu bảng giờ cũ khác runtime lưu trong DB, analytics dùng hợp khoảng giờ ghi nhận và báo `reconciledRuntimeRecords`. API lịch sử và snapshot trong DB được giữ nguyên.
- Lịch thiết bị bắt đầu từ ngày đầu có phiếu hợp lệ, kết thúc ở ngày nhỏ hơn giữa ngày cuối báo cáo và ngày hiện tại. Chưa có phiếu đầu tiên thì chưa bắt đầu theo dõi. Múi giờ cố định Asia/Bangkok (UTC+7), độc lập múi giờ máy chủ; sự kiện qua nửa đêm được đưa sang ngày kế tiếp đúng vị trí.
- Lịch phân biệt `RUNNING` (có chạy), `RECORDED_STOP` (có phiếu nhưng không chạy), `NO_RECORD` (không có phiếu). Không đồng nhất thiếu phiếu với máy thực tế không hoạt động. Lịch không phụ thuộc bộ lọc lô và có bộ lọc thiết bị/trạng thái riêng.
- Khi PA3 có ngày không có phiếu, vẫn tính 960 phút ở tổng thiết bị/ngày. Phần này trả ở `unassignedPlanMinutes`, không gán giả cho lô đang lọc. Vì thế tổng PA3 của các lô có thể nhỏ hơn tổng thiết bị khi có ngày chưa ghi nhận.
- Hiện chưa có lịch ngày làm việc/ngày nghỉ được xác định trong spec cung cấp, nên PA3 theo tất cả ngày lịch từ ngày đầu có dữ liệu, gồm ngày cuối tuần. Ngày hiện tại dùng đủ khung kế hoạch 960 phút; báo cáo giữa ngày có thể thấp vì ca chưa kết thúc.

PA3, lịch thiết bị và phần phân bổ được tính khi truy vấn; không thêm cột 960 phút cho từng phiếu, tránh tạo mẫu số trùng và tránh lưu lịch ngày đã lỗi thời sau khi hủy phiếu.

## Schema và dữ liệu cũ

Migration bổ sung: `backend/prisma/migrations/20261102090000_oee_batch_product_speed_pa2/migration.sql`. Chỉ thêm bảng/cột/index, không xóa dữ liệu và không tính lại snapshot A/P/Q/OEE lịch sử.

Trong môi trường MySQL cục bộ của lần triển khai này:

- Audit có 1 phiếu, đủ `plannedProductionMinutes` và tốc độ ca, không có sai lệch runtime so với bảng giờ.
- Đã áp dụng SQL bổ sung và chạy backfill cho phiếu đó.
- Backfill lấy mã sản phẩm từ `fieldSheetVer2.productCode`; không dùng tên sản phẩm để đoán mã. Thiếu dữ liệu xác định mã thì báo cáo để bổ sung sau.
- Backfill chỉ điền mã sản phẩm, mã lô OEE và thời gian PA2 còn thiếu. Runtime, sản lượng, kết quả OEE và giờ vận hành lịch sử được giữ nguyên. Chạy lại sẽ bỏ qua phiếu đã đủ trường.

Lịch sử migration hiện có của repository khai báo `provider = "sqlite"` trong `migration_lock.toml`, còn datasource thực tế là MySQL. `prisma migrate status` báo P3019. Lần triển khai này áp dụng trực tiếp đúng file SQL bổ sung bằng `prisma db execute`; không thay đổi hoặc reset lịch sử migration cũ. Việc chuẩn hóa/baseline toàn bộ lịch sử migration cần xử lý riêng trước khi dùng `prisma migrate deploy` cho các lần phát hành tiếp theo.

Các lệnh dưới đây chạy tại thư mục `backend` (Node 22, đọc kết nối từ `.env`):

```powershell
npm run oee:audit
npx prisma generate

# Áp dụng một lần trên cơ sở dữ liệu đã có bảng EquipmentOeeRecord,
# chỉ khi audit cho biết các cột mới chưa được thêm:
npx prisma db execute --file prisma/migrations/20261102090000_oee_batch_product_speed_pa2/migration.sql --schema prisma/schema.prisma

npm run oee:backfill
npm run oee:backfill -- --apply
npm run oee:verify
```

`oee:audit` chỉ đọc và hoạt động trước/sau migration. `oee:backfill` mặc định chỉ thống kê; `--apply` mới ghi. `oee:verify` chỉ chấp nhận database localhost, kiểm tra luồng dịch vụ trên MySQL trong transaction rồi rollback toàn bộ dữ liệu thử.

## Kiểm tra

- Ba bộ unit test bao phủ khoảng thời gian, ca qua đêm, override bằng 0, tính tổng có trọng số với tốc độ khác nhau, phân biệt mã sản phẩm, PA2 cho phiếu cũ, xác thực DTO, cập nhật định mức nhóm, phân bổ nhiều lô, PA3, ngày thiếu phiếu, bộ lọc lô và chặn lưu trùng giờ.
- Kiểm tra hai bản utility frontend/backend giống nhau để tránh lệch công thức.
- Kiểm tra MySQL thực tế với thiết bị thử tạo riêng trong transaction: cấu hình nhóm → lưu phiếu → báo cáo PA1/PA2/PA3/lô → thay định mức hiện tại → xác nhận P lịch sử giữ nguyên; hai lô cùng ca; lọc lô giữ phần thời gian đã chia; ngày thiếu phiếu; từ chối phiếu trùng giờ mà không cộng giờ vận hành; phiếu runtime = 0. Toàn bộ thiết bị/phiếu/cấu hình thử được rollback.
- Build TypeScript/backend, TypeScript/Vite/frontend và Prisma schema validation.

```powershell
npm test -- --runTestsByPath src/modules/equipment/oee-calculations.spec.ts src/modules/equipment/oee-records.service.spec.ts src/modules/equipment/oee-time-allocation.spec.ts
npm run build
npx prisma validate
```

## Điều kiện để có số liệu chính xác hơn

Các mục ưu tiên 3 đã được triển khai. Những phiếu thiếu khung giờ, sản lượng của phiếu nằm một phần ngoài 06:00–22:00 và phiếu cũ chồng giờ được gắn nhãn/cảnh báo để người dùng đối chiếu. Muốn phân bổ chính xác từng đơn vị sản phẩm theo giờ cần dữ liệu sản lượng có thời điểm; muốn loại ngày nghỉ khỏi PA3 cần quy tắc lịch sản xuất được xác nhận. Bản đặc tả gốc cũng cần được đối chiếu khi có để xác nhận các quy tắc nghiệp vụ bổ sung trên.
