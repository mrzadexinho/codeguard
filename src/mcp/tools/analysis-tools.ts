import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuleEngine } from '../../rules/engine.js';

export function registerAnalysisTools(server: McpServer, engine: RuleEngine) {
  server.tool(
    'check_error_handling',
    'Specialized check for silent failures: empty catch blocks, swallowed errors, catch-only-log patterns, and missing error handling. Extracted from silent-failure-hunter patterns.',
    {
      file_path: z.string().describe('Path to the file to check'),
      content: z.string().describe('Content of the file'),
    },
    async ({ file_path, content }) => {
      const result = engine.reviewFile(file_path, content, {
        categories: ['error-handling'],
      });

      const lines: string[] = [];
      lines.push(`## Error Handling Check: ${file_path}`);
      lines.push(`Found ${result.findings.length} error handling issue(s)\n`);

      if (result.findings.length === 0) {
        lines.push('No error handling issues detected.');
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      for (const f of result.findings) {
        lines.push(`**[${f.rule}] ${f.severity.toUpperCase()}** — ${f.message}`);
        lines.push(`  Location: ${f.file}:${f.line} (confidence: ${f.confidence})`);
        if (f.snippet) lines.push(`  Code: \`${f.snippet.trim()}\``);
        if (f.suggestion) lines.push(`  Fix: ${f.suggestion}`);
        lines.push('');
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );

  server.tool(
    'list_rules',
    'List all available review rules with their IDs, categories, severities, and supported languages.',
    {},
    async () => {
      const rules = engine.getRules();

      const lines: string[] = [];
      lines.push(`## Available Rules (${rules.length})\n`);
      lines.push('| ID | Name | Category | Severity | Languages |');
      lines.push('|------|------|----------|----------|-----------|');

      for (const rule of rules) {
        lines.push(`| ${rule.id} | ${rule.name} | ${rule.category} | ${rule.severity} | ${rule.languages.slice(0, 3).join(', ')}${rule.languages.length > 3 ? '...' : ''} |`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    },
  );
}
