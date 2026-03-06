import { describe, it, expect } from 'vitest';
import { RuleEngine } from '../../src/rules/engine.js';

// These tests verify the rule engine's analysis of source code strings.
// Sample vulnerable patterns are test data for detection, not executed code.

describe('RuleEngine', () => {
  const engine = new RuleEngine();

  it('should review a clean file with no issues', () => {
    const result = engine.reviewFile('clean.ts', 'const x = 1;\n');
    expect(result.findings).toHaveLength(0);
    expect(result.summary.totalFindings).toBe(0);
  });

  it('should detect issues in a file with problems', () => {
    const code = [
      'try {',
      '  riskyOp();',
      '} catch (e) { }',
      '',
      'const password = "mysecretpassword123";',
      'console.log("debug:", data);',
    ].join('\n');
    const result = engine.reviewFile('app.ts', code);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.summary.totalFindings).toBeGreaterThan(0);
  });

  it('should filter by minimum confidence', () => {
    const code = [
      'try { riskyOp(); } catch (e) { }',
      '// TODO: fix this',
    ].join('\n');
    const allResults = engine.reviewFile('app.ts', code);
    const highConfidence = engine.reviewFile('app.ts', code, { minConfidence: 80 });
    expect(highConfidence.findings.length).toBeLessThanOrEqual(allResults.findings.length);
  });

  it('should filter by category', () => {
    const code = [
      'try { riskyOp(); } catch (e) { }',
      'const x = eval("1+1");',
    ].join('\n');
    const errorOnly = engine.reviewFile('app.ts', code, { categories: ['error-handling'] });
    const securityOnly = engine.reviewFile('app.ts', code, { categories: ['security'] });

    expect(errorOnly.findings.every((f) => f.category === 'error-handling')).toBe(true);
    expect(securityOnly.findings.every((f) => f.category === 'security')).toBe(true);
  });

  it('should sort findings by severity then confidence', () => {
    const code = [
      'try { riskyOp(); } catch (e) { }',
      'const x = eval("1+1");',
      'console.log("debug");',
      '// TODO: fix later',
    ].join('\n');
    const result = engine.reviewFile('app.ts', code);
    for (let i = 1; i < result.findings.length; i++) {
      const prev = result.findings[i - 1];
      const curr = result.findings[i];
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const prevOrder = severityOrder[prev.severity];
      const currOrder = severityOrder[curr.severity];
      expect(prevOrder).toBeLessThanOrEqual(currOrder);
    }
  });

  it('should review multiple files', () => {
    const files = [
      { path: 'a.ts', content: 'try { x(); } catch (e) { }' },
      { path: 'b.ts', content: 'const x = eval("test");' },
    ];
    const result = engine.reviewFiles(files);
    expect(result.summary.filesReviewed).toBe(2);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by language', () => {
    const result = engine.reviewFile('data.json', '{"key": "value"}');
    expect(result.findings).toHaveLength(0);
  });

  it('should list all rules', () => {
    const rules = engine.getRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.id && r.name && r.category && r.severity)).toBe(true);
  });

  it('should create correct summary counts', () => {
    const code = [
      'try { riskyOp(); } catch (e) { }',
      'const x = eval("test");',
      'console.log("debug");',
    ].join('\n');
    const result = engine.reviewFile('app.ts', code);
    const s = result.summary;
    expect(s.critical + s.high + s.medium + s.low).toBe(s.totalFindings);
  });
});
