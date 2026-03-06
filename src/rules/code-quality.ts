import type { Rule, Finding } from './types.js';
import type { FileContext } from '../context/types.js';

export const consoleLeftBehind: Rule = {
  id: 'QA001',
  name: 'console-left-behind',
  category: 'code-quality',
  severity: 'low',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();
      if (/console\.(log|debug|info)\(/.test(line) && !/eslint-disable/.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 70,
          category: this.category,
          message: 'console.log/debug/info left in code — likely debugging artifact',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Remove or replace with a proper logging utility',
        });
      }
    }
    return findings;
  },
};

export const todoFixmeHack: Rule = {
  id: 'QA002',
  name: 'todo-fixme-hack',
  category: 'code-quality',
  severity: 'low',
  languages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'csharp', 'kotlin', 'swift', 'cpp', 'c'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isString) continue;
      const line = lines[i];
      const match = line.match(/\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b:?\s*(.*)/i);
      if (match) {
        const tag = match[1].toUpperCase();
        const severity = tag === 'HACK' || tag === 'FIXME' ? 'medium' as const : 'low' as const;
        findings.push({
          rule: this.id,
          severity,
          confidence: 95,
          category: this.category,
          message: `${tag} comment found${match[2] ? `: ${match[2].trim().slice(0, 80)}` : ''}`,
          file: filePath,
          line: i + 1,
          snippet: lines[i],
        });
      }
    }
    return findings;
  },
};

export const magicNumbers: Rule = {
  id: 'QA003',
  name: 'magic-numbers',
  category: 'code-quality',
  severity: 'low',
  languages: ['typescript', 'javascript', 'python', 'java', 'go', 'csharp', 'kotlin'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;
    if (filePath.includes('.config.') || filePath.includes('config/')) return findings;

    const trivialNumbers = new Set(['0', '1', '-1', '2', '100', '1000']);

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();
      if (/^\s*(const|let|var|export)\s/.test(lines[i])) continue; // Skip declarations
      if (/^\s*return\s/.test(lines[i])) continue;

      const matches = line.matchAll(/(?<![a-zA-Z_$.])\b(\d{2,})\b(?!\s*[;:,\]})]?\s*$)/g);
      for (const match of matches) {
        if (trivialNumbers.has(match[1])) continue;
        if (/['"`]/.test(line.slice(0, match.index))) continue; // Inside string

        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 60,
          category: this.category,
          message: `Magic number ${match[1]} — consider extracting to a named constant`,
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Extract to a named constant for readability',
        });
        break; // Only one per line
      }
    }
    return findings;
  },
};

export const deepNesting: Rule = {
  id: 'QA004',
  name: 'deep-nesting',
  category: 'code-quality',
  severity: 'medium',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'go', 'rust', 'cpp', 'c', 'kotlin', 'swift', 'php'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    const maxDepth = 4;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i];
      const indent = line.match(/^(\s*)/)?.[1] ?? '';
      const indentLevel = indent.includes('\t')
        ? indent.split('\t').length - 1
        : Math.floor(indent.length / 2);

      if (indentLevel > maxDepth && line.trim().length > 0) {
        // Only flag control flow statements at deep levels
        const trimmed = line.trim();
        if (/^(if|else|for|while|switch|case)\s*[\s(]/.test(trimmed)) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 75,
            category: this.category,
            message: `Deeply nested control flow (depth ${indentLevel}) — consider extracting to a function or using early returns`,
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: 'Use early returns, guard clauses, or extract to helper functions',
          });
        }
      }
    }
    return findings;
  },
};

export const longFunction: Rule = {
  id: 'QA005',
  name: 'long-function',
  category: 'code-quality',
  severity: 'medium',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'go', 'rust', 'cpp', 'c', 'kotlin', 'swift', 'php', 'python'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    const maxLines = 50;
    const funcPattern = /^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(|^\s*(public|private|protected|static|\s)*(async\s+)?\w+\s*\([^)]*\)\s*(\{|:)/;
    const pyFuncPattern = /^\s*(async\s+)?def\s+\w+/;

    let funcStart = -1;
    let funcName = '';
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (funcStart === -1) {
        const match = funcPattern.test(trimmed) || pyFuncPattern.test(trimmed);
        if (match) {
          funcStart = i;
          funcName = (trimmed.match(/function\s+(\w+)/) ?? trimmed.match(/(\w+)\s*[=(]/))?.[1] ?? 'anonymous';
          braceDepth = 0;
        }
      }

      if (funcStart >= 0) {
        for (const ch of line) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }

        if (braceDepth <= 0 && i > funcStart) {
          const length = i - funcStart + 1;
          if (length > maxLines) {
            findings.push({
              rule: this.id,
              severity: this.severity,
              confidence: 70,
              category: this.category,
              message: `Function "${funcName}" is ${length} lines long (max recommended: ${maxLines})`,
              file: filePath,
              line: funcStart + 1,
              endLine: i + 1,
              suggestion: 'Break into smaller functions with clear responsibilities',
            });
          }
          funcStart = -1;
        }
      }
    }
    return findings;
  },
};

export const unusedImport: Rule = {
  id: 'QA006',
  name: 'unused-import',
  category: 'code-quality',
  severity: 'low',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      // Skip type-only imports, default imports, star imports, side-effect imports
      if (/^import\s+type\s/.test(line)) continue;
      if (/^import\s+\*\s+as\s/.test(line)) continue;
      if (/^import\s+['"]/.test(line)) continue;

      // Match named imports: import { name1, name2 } from '...'
      const match = line.match(/^import\s+(?:\w+\s*,\s*)?\{\s*([^}]+)\}\s+from\s/);
      if (!match) continue;

      const names = match[1].split(',').map((n) => {
        // Handle aliased imports: original as alias
        const parts = n.trim().split(/\s+as\s+/);
        return parts.length > 1 ? parts[1].trim() : parts[0].trim();
      }).filter((n) => n.length > 0);

      // Build non-import lines content for searching
      const nonImportContent = lines
        .filter((_, idx) => {
          const trimmed = lines[idx].trim();
          return !trimmed.startsWith('import ');
        })
        .join('\n');

      for (const name of names) {
        // Check if the name appears in non-import lines as a word boundary match
        const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (!nameRegex.test(nonImportContent)) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 75,
            category: this.category,
            message: `Import "${name}" appears unused in the rest of the file`,
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: `Remove unused import "${name}" or verify it is needed`,
          });
        }
      }
    }
    return findings;
  },
};

export const duplicateCondition: Rule = {
  id: 'QA007',
  name: 'duplicate-condition',
  category: 'code-quality',
  severity: 'medium',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'go', 'kotlin', 'php'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];

    let currentIfCondition: string | null = null;
    let currentIfLine = -1;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      // Match `if (condition)`
      const ifMatch = line.match(/^if\s*\((.+)\)\s*\{?\s*$/);
      if (ifMatch) {
        currentIfCondition = ifMatch[1].trim();
        currentIfLine = i;
        continue;
      }

      // Match `} else if (condition)` or `else if (condition)`
      const elseIfMatch = line.match(/^(?:\}\s*)?else\s+if\s*\((.+)\)\s*\{?\s*$/);
      if (elseIfMatch && currentIfCondition !== null) {
        const elseIfCondition = elseIfMatch[1].trim();
        if (elseIfCondition === currentIfCondition) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 85,
            category: this.category,
            message: `Duplicate condition "${currentIfCondition}" — same as if on line ${currentIfLine + 1}`,
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: 'Remove the duplicate else-if branch or fix the condition',
          });
        }
        // Keep tracking — the else if continues the chain
        continue;
      }

      // If we hit a line that's not part of the if/else chain, reset
      // But allow lines that are block content (indented or closing braces)
      if (line.length > 0 && !line.startsWith('}') && !line.startsWith('{') && currentIfCondition !== null) {
        // Only reset if this line is at the same or lower indent level as the if
        // Simple heuristic: if line doesn't start with else, and isn't just a brace, consider reset
        if (!/^else\b/.test(line)) {
          // Don't reset — this could be body content. Only reset on a new if statement.
        }
      }

      // Reset on a new standalone if
      if (ifMatch) {
        // Already handled above
      }
    }
    return findings;
  },
};

export const codeQualityRules: Rule[] = [
  consoleLeftBehind,
  todoFixmeHack,
  magicNumbers,
  deepNesting,
  longFunction,
  unusedImport,
  duplicateCondition,
];
