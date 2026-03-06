import type { Rule, Finding } from './types.js';

export const emptyCatchBlock: Rule = {
  id: 'ERR001',
  name: 'empty-catch-block',
  category: 'error-handling',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'kotlin', 'swift', 'php', 'cpp'],
  detect(lines, filePath) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // catch (...) { } or catch { } on same line
      if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 95,
          category: this.category,
          message: 'Empty catch block silently swallows errors',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Log the error or re-throw with context',
        });
        continue;
      }
      // catch on one line, empty next line, close brace
      if (/catch\s*(\([^)]*\))?\s*\{?\s*$/.test(line) && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next === '}' || next === '} catch' || next.startsWith('} catch')) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 90,
            category: this.category,
            message: 'Empty catch block silently swallows errors',
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: 'Log the error or re-throw with context',
          });
        }
      }
    }
    return findings;
  },
};

export const catchOnlyLogs: Rule = {
  id: 'ERR002',
  name: 'catch-only-logs',
  category: 'error-handling',
  severity: 'high',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'kotlin', 'php'],
  detect(lines, filePath) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/catch\s*(\([^)]*\))?\s*\{/.test(line)) {
        // Look at next few lines to see if only console.log/warn/error
        let j = i + 1;
        let hasOnlyLog = false;
        let hasOtherStatement = false;
        while (j < lines.length && !lines[j].trim().startsWith('}')) {
          const inner = lines[j].trim();
          if (inner === '' || inner.startsWith('//')) {
            j++;
            continue;
          }
          if (/^console\.(log|warn|error|info|debug)\(/.test(inner)) {
            hasOnlyLog = true;
          } else {
            hasOtherStatement = true;
          }
          j++;
        }
        if (hasOnlyLog && !hasOtherStatement) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 85,
            category: this.category,
            message: 'Catch block only logs the error without handling it — error is swallowed after logging',
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: 'Re-throw the error, return an error result, or add recovery logic',
          });
        }
      }
    }
    return findings;
  },
};

export const promiseNoAwaitNoCatch: Rule = {
  id: 'ERR003',
  name: 'promise-no-catch',
  category: 'error-handling',
  severity: 'high',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Detect fire-and-forget promises: someAsyncFn() without await and without .catch
      if (/\w+\([^)]*\)\s*;?\s*$/.test(line) && !line.startsWith('await ') && !line.startsWith('return ')) {
        // Check if the line has .then() without .catch()
        if (line.includes('.then(') && !line.includes('.catch(')) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 80,
            category: this.category,
            message: 'Promise chain has .then() without .catch() — unhandled rejection possible',
            file: filePath,
            line: i + 1,
            snippet: lines[i],
            suggestion: 'Add .catch() handler or use await with try/catch',
          });
        }
      }
    }
    return findings;
  },
};

export const genericCatch: Rule = {
  id: 'ERR004',
  name: 'generic-catch-rethrow',
  category: 'error-handling',
  severity: 'medium',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'kotlin', 'php'],
  detect(lines, filePath) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/catch\s*\(\s*(e|err|error|ex|exception)\s*\)\s*\{/.test(line)) {
        // Check if catch body just re-throws without adding context
        let j = i + 1;
        while (j < lines.length) {
          const inner = lines[j].trim();
          if (inner.startsWith('}')) break;
          if (/^throw\s+(e|err|error|ex|exception)\s*;?\s*$/.test(inner)) {
            findings.push({
              rule: this.id,
              severity: this.severity,
              confidence: 75,
              category: this.category,
              message: 'Catch block re-throws the same error without adding context',
              file: filePath,
              line: i + 1,
              snippet: lines[i],
              suggestion: 'Either remove the try/catch or wrap in a new Error with context',
            });
            break;
          }
          j++;
        }
      }
    }
    return findings;
  },
};

export const errorHandlingRules: Rule[] = [
  emptyCatchBlock,
  catchOnlyLogs,
  promiseNoAwaitNoCatch,
  genericCatch,
];
