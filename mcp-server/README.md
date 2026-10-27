# CMMS Model Context Protocol (MCP) Server

Máy chủ MCP cung cấp giao diện chuẩn hóa giúp các mô hình ngôn ngữ lớn (LLMs) như **ChatGPT**, **Gemini**, **Claude**, **Cursor**, v.v. kết nối trực tiếp vào cơ sở dữ liệu ứng dụng CMMS để truy xuất dữ liệu, kiểm tra trạng thái thiết bị, phân tích sự cố và đề xuất kế hoạch bảo dưỡng.

---

## 🚀 Tính năng & Công cụ (Tools) cung cấp cho AI

### 1. Quản lý Thiết bị (Equipment)
- **`search_equipment`**: Tìm kiếm thiết bị theo mã (code/oldCode), tên máy, vị trí/phân xưởng, loại máy hoặc trạng thái (`OPERATIONAL`, `UNDER_MAINTENANCE`, `INCIDENT`, `DISCOMMISSIONED`).
- **`get_equipment_details`**: Xem đầy đủ hồ sơ thiết bị, thông số kỹ thuật, cụm chức năng, danh sách phụ tùng thay thế và 5 sự cố / phiếu sửa chữa gần nhất.
- **`get_equipment_status_summary`**: Thống kê số lượng máy móc theo trạng thái và theo từng phân xưởng.

### 2. Phiếu Bảo trì & Sự cố (Work Orders & Requests)
- **`get_active_work_orders`**: Tra cứu các phiếu sửa chữa đang chờ duyệt, đang thực hiện, lọc theo mức độ ưu tiên (`URGENT`, `HIGH`...) hoặc kỹ thuật viên phụ trách.
- **`get_work_order_details`**: Xem chi tiết 1 phiếu: nguyên nhân hỏng hóc, giải pháp khắc phục, danh sách vật tư phụ tùng đã dùng, chi phí và thời gian thực hiện.
- **`get_pending_maintenance_requests`**: Liệt kê các yêu cầu báo sự cố mới từ công nhân/phân xưởng đang chờ xử lý.

### 3. Quản lý Kho & Phụ tùng (Inventory)
- **`search_inventory_items`**: Tìm kiếm phụ tùng, linh kiện, dầu mỡ theo tên hoặc mã vật tư.
- **`get_low_stock_alerts`**: Thống kê toàn bộ các phụ tùng có số lượng tồn kho $\le$ tồn kho tối thiểu (`minQuantity`) để AI tự động cảnh báo và tính toán chi phí đặt hàng.
- **`get_recent_inventory_transactions`**: Xem lịch sử xuất/nhập/điều chỉnh kho gần nhất.

### 4. Kế hoạch Bảo dưỡng định kỳ (Schedules)
- **`get_upcoming_maintenance_schedules`**: Xem danh sách các lịch bảo trì định kỳ sắp đến hạn trong $N$ ngày tới để chuẩn bị vật tư và phân công kỹ thuật viên.

### 5. Báo cáo & Phân tích chuyên sâu (Analytics & Custom Queries)
- **`get_maintenance_kpis`**: Báo cáo tổng quan: tỷ lệ máy sẵn sàng vận hành, tỷ lệ hoàn thành phiếu sửa chữa, tổng chi phí vật tư và giờ công bảo trì.
- **`get_top_incident_equipment`**: Top máy móc hỏng hóc hoặc tốn chi phí sửa chữa nhiều nhất.
- **`execute_readonly_sql_query`**: Cho phép AI chạy câu lệnh SQL `SELECT` an toàn (chặn triệt để INSERT/UPDATE/DELETE/DROP) để trả lời bất kỳ câu hỏi tùy biến nào của quản lý.

---

## 🛠 Hướng dẫn Cài đặt & Khởi động

### 1. Cài đặt thư viện
```bash
cd mcp-server
npm install
npm run build
```

### 2. Hai chế độ chạy

#### Chế độ A: Chạy qua Stdio (Dành cho Claude Desktop, Cursor, Gemini CLI, Agent cục bộ)
```bash
npm start
# hoặc: node dist/index.js
```

#### Chế độ B: Chạy qua HTTP/SSE (Cổng 3002 - Dành cho Remote AI, Web, ChatGPT)
```bash
npm run start:sse
# hoặc chế độ dev: npm run dev:sse
```
Server sẽ lắng nghe tại:
- **SSE Stream**: `http://localhost:3002/sse`
- **Messages**: `http://localhost:3002/messages`
- **Health Check**: `http://localhost:3002/health`

---

## 🤖 Hướng dẫn Kết nối với từng Nền tảng AI

### 1. Kết nối với Gemini (qua Gemini CLI hoặc Gemini Agent)
Thêm cấu hình server vào file cấu hình của Gemini Agent:
```json
{
  "mcpServers": {
    "cmms-app": {
      "command": "node",
      "args": ["C:/Users/Admin/Desktop/PJ01/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "mysql://root:123456@localhost:3306/dk_cmms"
      }
    }
  }
}
```

### 2. Kết nối với Claude Desktop
Mở file `%APPDATA%\Claude\claude_desktop_config.json` và thêm cấu hình:
```json
{
  "mcpServers": {
    "cmms-server": {
      "command": "node",
      "args": ["C:/Users/Admin/Desktop/PJ01/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "mysql://root:123456@localhost:3306/dk_cmms"
      }
    }
  }
}
```
Khởi động lại Claude Desktop, bạn sẽ thấy biểu tượng chiếc búa (Tools) kích hoạt các công cụ của CMMS.

### 3. Kết nối với Cursor
1. Mở Cursor Settings ➔ **Features** ➔ **MCP**.
2. Bấm **+ Add New MCP Server**.
3. Điền thông tin:
   - **Name**: `cmms`
   - **Type**: `command`
   - **Command**: `node C:/Users/Admin/Desktop/PJ01/mcp-server/dist/index.js`

### 4. Kết nối với ChatGPT (OpenAI Custom GPT)
OpenAI Custom GPTs kết nối thông qua chuẩn **OpenAPI / Swagger**. Backend NestJS của app đã có sẵn Swagger tài liệu API!

1. Khởi động Backend: `npm run start:dev` (chạy tại cổng `3001`).
2. Mở cổng ra internet (nếu chưa deploy server thực):
   ```bash
   npx ngrok http 3001
   ```
3. Trên giao diện ChatGPT Plus:
   - Vào **Explore GPTs** ➔ **Create a GPT**.
   - Tab **Configure** ➔ Bấm **Create new action**.
   - Tại ô **Schema**, bấm **Import from URL** và nhập link Swagger của backend:
     `https://<link-ngrok-cua-ban>/docs-json`
   - ChatGPT sẽ nạp toàn bộ các endpoint tra cứu của ứng dụng CMMS để người dùng chat và phân tích dữ liệu trực tiếp.
