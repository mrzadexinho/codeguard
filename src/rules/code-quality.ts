import type { Rule, Finding } from './types.js';

export const consoleLeftBehind: Rule = {
  id: 'QA001',
  name: 'console-left-behind',
  category: 'code-quality',
  severity: 'low',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*')) continue;
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
  detect(lines, filePath) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
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
  detect(lines, filePath) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;
    if (filePath.includes('.config.') || filePath.includes('config/')) return findings;

    const trivialNumbers = new Set(['0', '1', '-1', '2', '100', '1000']);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || line.startsWith('*')) continue;
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
  detect(lines, filePath) {
    const findings: Finding[] = [];
    const maxDepth = 4;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.match(/^(\s*)/)?.[1] ?? '';
      const indentLevel = indent.includes('\t')
        ? indent.split('\t').length - 1
        : Math.floor(indent.length / 2);

      if (indentLevel > maxDepth && line.trim().length > 0 && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
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
  detect(lines, filePath) {
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

export const codeQualityRules: Rule[] = [
  consoleLeftBehind,
  todoFixmeHack,
  magicNumbers,
  deepNesting,
  longFunction,
];
