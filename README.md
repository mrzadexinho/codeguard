# codeguard

[![CI](https://github.com/mrzadexinho/codeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/mrzadexinho/codeguard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/codeguard-mcp.svg)](https://www.npmjs.com/package/codeguard-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

AI code review MCP server. Automated pattern detection for bugs, security vulnerabilities, and silent failures.

## Problem

AI assistants review code but miss common anti-patterns that automated detection catches instantly: empty catch blocks, hardcoded secrets, SQL injection, swallowed errors. codeguard runs 14 pattern-matching rules locally with zero API calls, returning structured findings with confidence scores.

## Quick Start

### As MCP Server (Claude Code)

```json
{
  "mcpServers": {
    "codeguard": {
      "command": "npx",
      "args": ["-y", "codeguard-mcp"]
    }
  }
}
```

### As Library

```typescript
import { RuleEngine } from 'codeguard-mcp';

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

## Rules (14 total)

### Error Handling (4 rules, ERR001-ERR004)
Detects empty catch blocks, catch-only-log patterns, unhandled promise rejections, and pointless re-throws.

### Security (5 rules, SEC001-SEC005)
Detects dynamic code execution, unsafe HTML injection, hardcoded credentials, SQL injection via string interpolation, and shell command injection.

### Code Quality (5 rules, QA001-QA005)
Detects debug logging left in production code, TODO/FIXME/HACK markers, magic numbers, deeply nested control flow, and overly long functions.

Run `list_rules` to see all rules with their IDs, severities, and supported languages.

## Architecture

```
codeguard/
  src/
    parser/          # Diff and source file parsing
      diff-parser    # Unified diff to structured DiffFile[]
      code-parser    # Source to ParsedFile with language detection
    rules/           # Pattern matching engine
      engine         # RuleEngine: applies rules, filters, sorts
      error-handling # ERR001-004
      security       # SEC001-005
      code-quality   # QA001-005
    mcp/             # MCP server layer
      tools/         # 4 MCP tools
  tests/             # 64 tests mirroring src/ structure
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Regex pattern matching | Zero dependencies, instant results, no AST parser needed |
| Confidence scores (0-100) | Filter noise: use `min_confidence: 80` for high-signal only |
| Category filtering | Focus analysis: `['security']` for security-only review |
| Language detection | Auto-filters rules by file extension |
| Severity sorting | Critical findings surface first |

## Confidence Scoring

Inspired by pr-review-toolkit confidence-based filtering:

- **90-100**: Near-certain detection (empty catch, code execution patterns)
- **80-89**: High confidence (hardcoded secrets, injection patterns)
- **70-79**: Moderate confidence (log-only catches, deep nesting)
- **60-69**: Low confidence (magic numbers)

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
