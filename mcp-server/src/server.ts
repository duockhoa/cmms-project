import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { equipmentToolDefinitions } from './tools/equipment.js';
import { workOrderToolDefinitions } from './tools/work-orders.js';
import { inventoryToolDefinitions } from './tools/inventory.js';
import { scheduleToolDefinitions } from './tools/schedules.js';
import { analyticsToolDefinitions } from './tools/analytics.js';
import { checklistToolDefinitions } from './tools/checklists.js';
import { prisma } from './db.js';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: process.env.MCP_SERVER_NAME || 'cmms-mcp-server',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
  });

  const allTools = [
    ...equipmentToolDefinitions,
    ...workOrderToolDefinitions,
    ...inventoryToolDefinitions,
    ...scheduleToolDefinitions,
    ...checklistToolDefinitions,
    ...analyticsToolDefinitions,
  ];

  for (const toolDef of allTools) {
    // Register tool with McpServer
    // In SDK, parameters can be passed as zod raw shapes
    const shape = (toolDef.parameters as any).shape || {};
    server.tool(
      toolDef.name,
      toolDef.description,
      shape,
      async (args: any) => {
        try {
          const result = await toolDef.handler(args);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Lỗi khi thực thi ${toolDef.name}: ${error.message || String(error)}`,
              },
            ],
          };
        }
      },
    );
  }

  // Register some helpful MCP Prompts
  server.prompt(
    'analyze_equipment_health',
    'Hướng dẫn AI phân tích tình trạng kỹ thuật, nguyên nhân hỏng hóc và rủi ro của thiết bị',
    {
      equipmentCode: z.string().describe('Mã thiết bị cần phân tích (VD: EQ-0001)'),
    },
    async ({ equipmentCode }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Hãy gọi tool 'get_equipment_details' cho mã thiết bị '${equipmentCode}'. Sau đó phân tích:\n1. Tình trạng hoạt động và số giờ vận hành hiện tại.\n2. Các sự cố thường gặp và nguyên nhân hỏng hóc trong quá khứ.\n3. Đánh giá phụ tùng nào hay bị hao mòn nhất.\n4. Đưa ra khuyến nghị bảo trì phòng ngừa để giảm thiểu thời gian dừng máy.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'generate_weekly_maintenance_report',
    'Yêu cầu AI tổng hợp báo cáo bảo trì tuần toàn diện',
    {},
    async () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Hãy gọi các tools 'get_maintenance_kpis', 'get_active_work_orders', và 'get_low_stock_alerts' để lập một bản báo cáo tuần tóm tắt:\n1. Tình hình tổng thể (tỷ lệ máy sẵn sàng, số phiếu đã xong vs còn tồn đọng).\n2. Các sự cố khẩn cấp cần chú ý.\n3. Cảnh báo kho vật tư đang thiếu hụt và ước tính chi phí bổ sung.\n4. Kế hoạch công việc ưu tiên cho tuần tới.`,
          },
        },
      ],
    }),
  );

  return server;
}
