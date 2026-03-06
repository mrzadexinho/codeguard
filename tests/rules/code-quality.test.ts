import { describe, it, expect } from 'vitest';
import { consoleLeftBehind, todoFixmeHack, deepNesting, longFunction } from '../../src/rules/code-quality.js';

describe('QA001: console-left-behind', () => {
  it('should detect console.log in production code', () => {
    const lines = ['console.log("debugging value:", x);'];
    const findings = consoleLeftBehind.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('QA001');
  });

  it('should skip test files', () => {
    const lines = ['console.log("test output");'];
    const findings = consoleLeftBehind.detect(lines, 'src/app.test.ts');
    expect(findings).toHaveLength(0);
  });

  it('should skip spec files', () => {
    const lines = ['console.log("test output");'];
    const findings = consoleLeftBehind.detect(lines, 'src/app.spec.ts');
    expect(findings).toHaveLength(0);
  });

  it('should not flag console.error or console.warn', () => {
    const lines = ['console.error("Something failed");', 'console.warn("Deprecated");'];
    const findings = consoleLeftBehind.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should skip commented lines', () => {
    const lines = ['// console.log("old debug");'];
    const findings = consoleLeftBehind.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('QA002: todo-fixme-hack', () => {
  it('should detect TODO comments', () => {
    const lines = ['// TODO: refactor this later'];
    const findings = todoFixmeHack.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('low');
  });

  it('should detect FIXME with higher severity', () => {
    const lines = ['// FIXME: this is broken'];
    const findings = todoFixmeHack.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('medium');
  });

  it('should detect HACK with higher severity', () => {
    const lines = ['// HACK: workaround for API bug'];
    const findings = todoFixmeHack.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('medium');
  });

  it('should capture TODO description', () => {
    const lines = ['// TODO: implement caching'];
    const findings = todoFixmeHack.detect(lines, 'src/app.ts');
    expect(findings[0].message).toContain('implement caching');
  });
});

describe('QA004: deep-nesting', () => {
  it('should detect deeply nested control flow', () => {
    const lines = [
      'function test() {',
      '  if (a) {',
      '    if (b) {',
      '      if (c) {',
      '        if (d) {',
      '              if (e) {',
      '                doSomething();',
      '              }',
      '          }',
      '        }',
      '      }',
      '    }',
      '  }',
      '}',
    ];
    const findings = deepNesting.detect(lines, 'src/app.ts');
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should not flag shallow nesting', () => {
    const lines = [
      'function test() {',
      '  if (a) {',
      '    doSomething();',
      '  }',
      '}',
    ];
    const findings = deepNesting.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('QA005: long-function', () => {
  it('should detect functions longer than 50 lines', () => {
    const lines = ['function longFunc() {'];
    for (let i = 0; i < 55; i++) {
      lines.push(`  const x${i} = ${i};`);
    }
    lines.push('}');

    const findings = longFunction.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('QA005');
    expect(findings[0].message).toContain('longFunc');
  });

  it('should not flag short functions', () => {
    const lines = [
      'function shortFunc() {',
      '  return 42;',
      '}',
    ];
    const findings = longFunction.detect(lines, 'src/app.ts');
    expect(findings).toHaveLength(0);
  });
});
