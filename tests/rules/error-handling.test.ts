import { describe, it, expect } from 'vitest';
import { emptyCatchBlock, catchOnlyLogs, promiseNoAwaitNoCatch, genericCatch } from '../../src/rules/error-handling.js';

describe('ERR001: empty-catch-block', () => {
  it('should detect empty catch on single line', () => {
    const lines = ['try { riskyOp(); } catch (e) { }'];
    const findings = emptyCatchBlock.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR001');
    expect(findings[0].confidence).toBe(95);
  });

  it('should detect empty catch on multiple lines', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '}',
    ];
    const findings = emptyCatchBlock.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
  });

  it('should not flag catch with content', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  handleError(e);',
      '}',
    ];
    const findings = emptyCatchBlock.detect(lines, 'test.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('ERR002: catch-only-logs', () => {
  it('should detect catch block that only logs', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  console.error(e);',
      '}',
    ];
    const findings = catchOnlyLogs.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR002');
    expect(findings[0].severity).toBe('high');
  });

  it('should not flag catch that logs and rethrows', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  console.error(e);',
      '  throw e;',
      '}',
    ];
    const findings = catchOnlyLogs.detect(lines, 'test.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('ERR003: promise-no-catch', () => {
  it('should detect .then() without .catch()', () => {
    const lines = ['fetchData().then(handleResult);'];
    const findings = promiseNoAwaitNoCatch.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR003');
  });

  it('should not flag .then().catch()', () => {
    const lines = ['fetchData().then(handleResult).catch(handleError);'];
    const findings = promiseNoAwaitNoCatch.detect(lines, 'test.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('ERR004: generic-catch-rethrow', () => {
  it('should detect catch that only rethrows without context', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  throw e;',
      '}',
    ];
    const findings = genericCatch.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR004');
  });

  it('should not flag catch that wraps error', () => {
    const lines = [
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  throw new Error("context: " + e.message);',
      '}',
    ];
    const findings = genericCatch.detect(lines, 'test.ts');
    expect(findings).toHaveLength(0);
  });
});
