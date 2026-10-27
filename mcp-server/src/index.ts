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

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('[MCP] Server connected and ready to process requests.');
}

runStdioServer().catch((error) => {
  console.error('[MCP FATAL]', error);
  process.exit(1);
});
