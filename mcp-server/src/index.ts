import { verifyAccessToken } from './auth.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { checkDbConnection } from './db.js';

async function runStdioServer() {
  console.error('[MCP] Starting CMMS MCP Server via Stdio transport...');

  const dbOk = await checkDbConnection();
  if (!dbOk) {
    console.error('[MCP ERROR] Could not connect to database dk_cmms. Exiting.');
    process.exit(1);
  }
  console.error('[MCP] Database connected successfully.');

  const token = process.env.MCP_STDIO_ACCESS_TOKEN;
  const verified = token ? await verifyAccessToken(token) : null;
  if (!verified?.dbUser?.permissions?.includes('ALL')) throw new Error('A centrally authenticated administrator token is required.');
  const server = createMcpServer(async () => (await verifyAccessToken(token!))?.dbUser);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('[MCP] Server connected and ready to process requests.');
}

runStdioServer().catch((error) => {
  console.error('[MCP FATAL]', error);
  process.exit(1);
});
