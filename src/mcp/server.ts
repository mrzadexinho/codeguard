#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RuleEngine } from '../rules/engine.js';
import { registerReviewTools } from './tools/review-tools.js';
import { registerAnalysisTools } from './tools/analysis-tools.js';

async function main() {
  const server = new McpServer({
    name: 'codeguard',
    version: '0.2.0',
  });

  const engine = new RuleEngine();

  registerReviewTools(server, engine);
  registerAnalysisTools(server, engine);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('codeguard MCP server running');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
