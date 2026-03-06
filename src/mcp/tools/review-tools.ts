import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RuleEngine } from '../../rules/engine.js';
import { parseDiff } from '../../parser/diff-parser.js';
import type { Finding } from '../../rules/types.js';

export function registerReviewTools(server: McpServer, engine: RuleEngine) {
  server.tool(
    'review_file',
    'Review a source file for bugs, security issues, silent failures, and code quality problems. Returns findings with confidence scores and severity.',
    {
      file_path: z.string().describe('Path to the file to review'),
      content: z.string().describe('Content of the file'),
      min_confidence: z.number().min(0).max(100).optional().describe('Minimum confidence threshold (0-100, default: 0). Use 80+ for high-signal only.'),
      categories: z.array(z.enum(['error-handling', 'security', 'code-quality'])).optional().describe('Filter to specific categories'),
    },
    async ({ file_path, content, min_confidence, categories }) => {
      const result = engine.reviewFile(file_path, content, {
        minConfidence: min_confidence,
        categories,
      });

      return {
        content: [{
          type: 'text' as const,
          text: formatFindings(result.findings, result.summary),
        }],
      };
    },
  );

  server.tool(
    'review_diff',
    'Review a git diff for bugs, security issues, and code quality problems. Focuses analysis on changed lines. Returns findings with confidence scores.',
    {
      diff: z.string().describe('Unified diff output (from git diff)'),
      min_confidence: z.number().min(0).max(100).optional().describe('Minimum confidence threshold (0-100, default: 0)'),
      categories: z.array(z.enum(['error-handling', 'security', 'code-quality'])).optional().describe('Filter to specific categories'),
    },
    async ({ diff, min_confidence, categories }) => {
      const parsed = parseDiff(diff);
      const files = parsed.files
        .filter((f) => f.status !== 'deleted')
        .map((f) => {
          const addedLines = f.hunks
            .flatMap((h) => h.lines)
            .filter((l) => l.type === 'add' || l.type === 'context')
            .map((l) => l.content);
          return { path: f.path, content: addedLines.join('\n') };
        });

      const result = engine.reviewFiles(files, {
        minConfidence: min_confidence,
        categories,
      });

      return {
        content: [{
          type: 'text' as const,
          text: formatFindings(result.findings, result.summary),
        }],
      };
    },
  );
}

function formatFindings(findings: Finding[], summary: { totalFindings: number; critical: number; high: number; medium: number; low: number; filesReviewed: number; rulesApplied: number }): string {
  const lines: string[] = [];

  lines.push(`## Review Summary`);
  lines.push(`- Files reviewed: ${summary.filesReviewed}`);
  lines.push(`- Rules applied: ${summary.rulesApplied}`);
  lines.push(`- Total findings: ${summary.totalFindings}`);

  if (summary.totalFindings === 0) {
    lines.push(`\nNo issues found.`);
    return lines.join('\n');
  }

  lines.push(`- Critical: ${summary.critical} | High: ${summary.high} | Medium: ${summary.medium} | Low: ${summary.low}`);
  lines.push('');

  const grouped = groupBy(findings, (f) => f.severity);

  for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
    const group = grouped[severity];
    if (!group || group.length === 0) continue;

    lines.push(`### ${severity.toUpperCase()} (${group.length})`);
    for (const f of group) {
      lines.push(`- **[${f.rule}]** ${f.message}`);
      lines.push(`  ${f.file}:${f.line} (confidence: ${f.confidence})`);
      if (f.snippet) lines.push(`  \`${f.snippet.trim()}\``);
      if (f.suggestion) lines.push(`  Fix: ${f.suggestion}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (groups[k] ??= []).push(item);
  }
  return groups;
}
