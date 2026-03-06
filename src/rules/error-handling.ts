import type { Rule, Finding } from './types.js';
import type { FileContext } from '../context/types.js';

export const emptyCatchBlock: Rule = {
  id: 'ERR001',
  name: 'empty-catch-block',
  category: 'error-handling',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'java', 'csharp', 'kotlin', 'swift', 'php', 'cpp'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
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
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
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
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
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
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
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

export const asyncNoErrorHandling: Rule = {
  id: 'ERR005',
  name: 'async-no-error-handling',
  category: 'error-handling',
  severity: 'medium',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    const asyncPattern = /async\s+function\s+\w+|async\s*\(|async\s*\w+\s*=>|async\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      if (!asyncPattern.test(line)) continue;

      // Track brace depth to find the function body
      let braceDepth = 0;
      let foundOpen = false;
      let hasAwait = false;
      let hasTry = false;
      const startLine = i;

      for (let j = i; j < lines.length; j++) {
        const bodyLine = lines[j];
        for (const ch of bodyLine) {
          if (ch === '{') {
            braceDepth++;
            foundOpen = true;
          } else if (ch === '}') {
            braceDepth--;
          }
        }

        if (foundOpen) {
          if (/\bawait\b/.test(bodyLine)) hasAwait = true;
          if (/\btry\b/.test(bodyLine)) hasTry = true;
        }

        if (foundOpen && braceDepth === 0) break;
      }

      if (hasAwait && !hasTry) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 65,
          category: this.category,
          message: 'Async function uses await but has no try-catch — unhandled rejection possible',
          file: filePath,
          line: startLine + 1,
          snippet: lines[startLine],
          suggestion: 'Wrap await calls in try-catch or ensure the caller handles errors',
        });
      }
    }
    return findings;
  },
};

export const optionalChainOnCriticalPath: Rule = {
  id: 'ERR006',
  name: 'optional-chain-on-critical-path',
  category: 'error-handling',
  severity: 'medium',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    const authKeywords = /\b(auth|permissions?|roles?|sessions?|tokens?|credentials?|acl|access)\b/i;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      if (line.includes('?.') && authKeywords.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 60,
          category: this.category,
          message: 'Optional chaining on security/auth path — may silently return undefined instead of throwing',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Validate auth objects explicitly and throw if missing',
        });
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
  asyncNoErrorHandling,
  optionalChainOnCriticalPath,
];
