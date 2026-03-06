import type { Rule, Finding } from './types.js';
import type { FileContext } from '../context/types.js';

// All rules in this file are DETECTION rules.
// They use regex to find security anti-patterns in user code.
// No dynamic code evaluation or shell commands are executed.

export const evalUsage: Rule = {
  id: 'SEC001',
  name: 'eval-usage',
  category: 'security',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'python', 'php'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    // Detects: eval(...), new Function(...)
    const evalPattern = /\beval\s*\(/;
    const funcConstructor = /new\s+Function\s*\(/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();
      if (evalPattern.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 90,
          category: this.category,
          message: 'eval() usage detected — potential code injection vulnerability',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Replace with a safe alternative (JSON.parse or structured parsing)',
        });
      }
      if (funcConstructor.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'Dynamic Function constructor — potential code injection',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Avoid dynamic code generation; use structured alternatives',
        });
      }
    }
    return findings;
  },
};

export const innerHtmlAssignment: Rule = {
  id: 'SEC002',
  name: 'innerhtml-assignment',
  category: 'security',
  severity: 'high',
  languages: ['typescript', 'javascript'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();
      if (/\.innerHTML\s*=/.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'innerHTML assignment — XSS vulnerability if value contains user input',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use textContent, or sanitize with DOMPurify before assigning',
        });
      }
      if (/dangerouslySetInnerHTML/.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'dangerouslySetInnerHTML — XSS risk if content is not sanitized',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Sanitize content with DOMPurify or use a markdown renderer',
        });
      }
    }
    return findings;
  },
};

export const hardcodedSecrets: Rule = {
  id: 'SEC003',
  name: 'hardcoded-secrets',
  category: 'security',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'python', 'java', 'go', 'ruby', 'php', 'csharp', 'rust', 'kotlin', 'swift'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;

    const patterns = [
      { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/i, name: 'API key' },
      { regex: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, name: 'secret/password' },
      { regex: /(?:token)\s*[:=]\s*['"][A-Za-z0-9_\-\.]{20,}['"]/i, name: 'token' },
      { regex: /(?:aws_access_key_id)\s*[:=]\s*['"]AKIA[A-Z0-9]{16}['"]/i, name: 'AWS access key' },
      { regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, name: 'private key' },
    ];

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      for (const { regex, name } of patterns) {
        if (regex.test(line)) {
          findings.push({
            rule: this.id,
            severity: this.severity,
            confidence: 85,
            category: this.category,
            message: `Hardcoded ${name} detected — credentials should not be in source code`,
            file: filePath,
            line: i + 1,
            snippet: lines[i].slice(0, 80) + (lines[i].length > 80 ? '...' : ''),
            suggestion: 'Use environment variables or a secrets manager',
          });
          break;
        }
      }
    }
    return findings;
  },
};

export const sqlInjection: Rule = {
  id: 'SEC004',
  name: 'sql-injection',
  category: 'security',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'python', 'java', 'php', 'ruby', 'go', 'csharp'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    // Detects SQL queries built with string interpolation or concatenation
    const templateLiteralSql = /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\$\{/;
    const concatSql = /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*['"]\s*\+/;
    const fstringSql = /f['"](?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\{/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      if (templateLiteralSql.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'SQL query uses string interpolation — SQL injection risk',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use parameterized queries or prepared statements',
        });
      }
      if (concatSql.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'SQL query uses string concatenation — SQL injection risk',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use parameterized queries or prepared statements',
        });
      }
      if (fstringSql.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'SQL query uses f-string interpolation — SQL injection risk',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use parameterized queries with cursor.execute(sql, params)',
        });
      }
    }
    return findings;
  },
};

export const commandInjection: Rule = {
  id: 'SEC005',
  name: 'command-injection',
  category: 'security',
  severity: 'critical',
  languages: ['typescript', 'javascript', 'python', 'ruby', 'php'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    // Detects shell commands built with dynamic strings (regex detection only)
    const shellExecInterp = /exec\s*\(\s*`/;
    const pySystem = /os\.system\s*\(/;
    const pySubproc = /subprocess\.call\s*\(\s*['"`f]/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i].trim();

      if (shellExecInterp.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'Shell command with dynamic input — command injection risk',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use execFile() with argument arrays, or sanitize input',
        });
      }
      if (pySystem.test(line) || pySubproc.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'Shell command with potential user input — command injection risk',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use subprocess.run() with shell=False and argument lists',
        });
      }
    }
    return findings;
  },
};

export const securityRules: Rule[] = [
  evalUsage,
  innerHtmlAssignment,
  hardcodedSecrets,
  sqlInjection,
  commandInjection,
];
