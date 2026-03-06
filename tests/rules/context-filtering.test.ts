import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/rules/engine.js';

describe('context-aware filtering', () => {
  const engine = new RuleEngine();

  it('should not flag patterns inside single-line comments', () => {
    const code = '// const password = "secret123456";\nconst x = 1;';
    const result = engine.reviewFile('app.ts', code);
    const secretFindings = result.findings.filter((f) => f.rule === 'SEC003');
    expect(secretFindings).toHaveLength(0);
  });

  it('should not flag patterns inside block comments', () => {
    const code = '/*\nconst password = "secret123456";\n*/\nconst x = 1;';
    const result = engine.reviewFile('app.ts', code);
    const secretFindings = result.findings.filter((f) => f.rule === 'SEC003');
    expect(secretFindings).toHaveLength(0);
  });

  it('should not flag eval inside comments', () => {
    const code = '// eval(something)\nconst x = 1;';
    const result = engine.reviewFile('app.ts', code);
    const evalFindings = result.findings.filter((f) => f.rule === 'SEC001');
    expect(evalFindings).toHaveLength(0);
  });

  it('should not flag SQL patterns inside template literal strings', () => {
    const code = 'const msg = `\nSELECT * FROM users WHERE id = ${id}\n`;';
    const result = engine.reviewFile('app.ts', code);
    const sqlFindings = result.findings.filter((f) => f.rule === 'SEC004' && f.line === 2);
    expect(sqlFindings).toHaveLength(0);
  });

  it('should still flag patterns in actual code', () => {
    const code = 'const password = "secret123456";';
    const result = engine.reviewFile('app.ts', code);
    const secretFindings = result.findings.filter((f) => f.rule === 'SEC003');
    expect(secretFindings).toHaveLength(1);
  });

  it('should still flag empty catch blocks in actual code', () => {
    const code = 'try { x(); } catch (e) { }';
    const result = engine.reviewFile('app.ts', code);
    const catchFindings = result.findings.filter((f) => f.rule === 'ERR001');
    expect(catchFindings).toHaveLength(1);
  });

  it('should not flag patterns in Python comments', () => {
    const code = '# password = "secret123456"\nx = 1';
    const result = engine.reviewFile('app.py', code);
    const secretFindings = result.findings.filter((f) => f.rule === 'SEC003');
    expect(secretFindings).toHaveLength(0);
  });
});
