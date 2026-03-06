# codeguard

[![CI](https://github.com/mrzadexinho/codeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/mrzadexinho/codeguard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@mrzadexinho/codeguard.svg)](https://www.npmjs.com/package/@mrzadexinho/codeguard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Context-aware AI code review MCP server. Automated pattern detection for bugs, security vulnerabilities, insecure defaults, and silent failures.

## Problem

AI assistants review code but miss common anti-patterns that automated detection catches instantly. codeguard runs 25 context-aware rules locally with zero API calls, returning structured findings with confidence scores. The context layer understands comments, strings, imports, and file types to eliminate false positives.

## Quick Start

### As MCP Server

Works with any MCP-compatible client — **Claude Code**, Claude Desktop, Cursor, Windsurf, VS Code (Copilot), Continue.dev, Zed, Cline, and more.

```json
{
  "mcpServers": {
    "codeguard": {
      "command": "npx",
      "args": ["-y", "@mrzadexinho/codeguard"]
    }
  }
}
```

### As Library

```typescript
import { RuleEngine } from '@mrzadexinho/codeguard';

const engine = new RuleEngine();
const result = engine.reviewFile('app.ts', sourceCode);

for (const finding of result.findings) {
  console.log(`[${finding.rule}] ${finding.severity}: ${finding.message}`);
  console.log(`  ${finding.file}:${finding.line} (confidence: ${finding.confidence})`);
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `review_file` | Review a source file for bugs, security issues, and code quality problems |
| `review_diff` | Review a git diff, focuses analysis on changed lines |
| `check_error_handling` | Specialized silent failure detection (empty catches, swallowed errors) |
| `list_rules` | List all available rules with IDs, categories, and severities |

## Context-Aware Analysis

Unlike simple pattern matchers, codeguard understands code context:

- Skips patterns inside **comments** (single-line, block, Python docstrings)
- Skips patterns inside **string literals** (template literals, multi-line strings)
- Detects **file type** (test, config, migration, generated) to adjust rule behavior
- Tracks **imports** to understand what utilities are available
- Identifies **try-catch regions** for error handling analysis

This eliminates false positives like flagging `password` inside a comment or `eval` inside a string.

## Rules (25 total)

### Error Handling (6 rules, ERR001-ERR006)
Detects empty catch blocks, catch-only-log patterns, unhandled promise rejections, pointless re-throws, async functions without error handling, and optional chaining on security-critical paths.

### Security (10 rules, SEC001-SEC010)
Detects dynamic code execution, unsafe HTML injection, hardcoded credentials, SQL injection, shell command injection, fail-open environment defaults, debug flags left on, permissive CORS, weak cryptographic algorithms, and unsafe deserialization.

### Code Quality (7 rules, QA001-QA007)
Detects debug logging in production, TODO/FIXME/HACK markers, magic numbers, deeply nested control flow, overly long functions, unused imports, and duplicate conditions.

Run `list_rules` to see all rules with their IDs, severities, and supported languages.

## Architecture

```
codeguard/
  src/
    context/         # Context-aware analysis layer
      analyzer       # Single-pass scanner: comments, strings, imports, regions
      types          # FileContext, LineContext, FileType
    parser/          # Diff and source file parsing
      diff-parser    # Unified diff to structured DiffFile[]
      code-parser    # Source to ParsedFile with language detection
    rules/           # Pattern matching engine
      engine         # RuleEngine: builds context, applies rules, filters, sorts
      error-handling # ERR001-006
      security       # SEC001-005, SEC010
      insecure-defaults # SEC006-009 (TrailOfBits patterns)
      code-quality   # QA001-007
    mcp/             # MCP server layer
      tools/         # 4 MCP tools
  tests/             # 142 tests mirroring src/ structure
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Context layer | Single-pass analyzer eliminates false positives in comments/strings |
| Regex pattern matching | Zero dependencies, instant results, no AST parser needed |
| Confidence scores (0-100) | Filter noise: use `min_confidence: 80` for high-signal only |
| Category filtering | Focus analysis: `['security']` for security-only review |
| Language detection | Auto-filters rules by file extension |
| File type awareness | Skips security rules in test files, adjusts behavior for configs |

## Confidence Scoring

- **90-100**: Near-certain detection (empty catch, unsafe deserialization)
- **80-89**: High confidence (hardcoded secrets, injection patterns, insecure defaults)
- **70-79**: Moderate confidence (log-only catches, deep nesting, unused imports)
- **60-69**: Low confidence (magic numbers, optional chain heuristics, async error handling)

Use `min_confidence: 80` to get only high-signal findings.

## Supported Languages

TypeScript, JavaScript, Python, Java, Go, Rust, Ruby, PHP, C/C++, C#, Swift, Kotlin

## Development

```bash
git clone https://github.com/mrzadexinho/codeguard.git
cd codeguard
npm install
npm run build
npm test
```

## License

MIT
