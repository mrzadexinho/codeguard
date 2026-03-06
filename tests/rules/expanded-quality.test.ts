import { describe, it, expect } from 'vitest';
import { unusedImport, duplicateCondition } from '../../src/rules/code-quality.js';

describe('QA006: unused-import', () => {
  it('should detect unused named import', () => {
    const lines = [
      "import { foo, bar } from './utils';",
      '',
      'const result = foo(42);',
      'console.log(result);',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('QA006');
    expect(findings[0].message).toContain('bar');
    expect(findings[0].confidence).toBe(75);
  });

  it('should not flag when all imports are used', () => {
    const lines = [
      "import { foo, bar } from './utils';",
      '',
      'const a = foo(1);',
      'const b = bar(2);',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should not flag type-only imports', () => {
    const lines = [
      "import type { Foo, Bar } from './types';",
      '',
      'const x = 1;',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should not flag default imports', () => {
    const lines = [
      "import React from 'react';",
      '',
      'const x = 1;',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should not flag star imports', () => {
    const lines = [
      "import * as utils from './utils';",
      '',
      'const x = 1;',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should not flag side-effect imports', () => {
    const lines = [
      "import './styles.css';",
      '',
      'const x = 1;',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should handle aliased imports correctly', () => {
    const lines = [
      "import { foo as myFoo, bar } from './utils';",
      '',
      'const result = myFoo(42);',
    ];
    const findings = unusedImport.detect(lines, 'app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('bar');
  });
});

describe('QA007: duplicate-condition', () => {
  it('should detect same condition in if and else if', () => {
    const lines = [
      'if (x > 5) {',
      '  doSomething();',
      '} else if (x > 5) {',
      '  doOther();',
      '}',
    ];
    const findings = duplicateCondition.detect(lines, 'app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('QA007');
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].confidence).toBe(85);
    expect(findings[0].line).toBe(3);
  });

  it('should not flag different conditions', () => {
    const lines = [
      'if (x > 5) {',
      '  doSomething();',
      '} else if (x > 10) {',
      '  doOther();',
      '}',
    ];
    const findings = duplicateCondition.detect(lines, 'app.ts');
    expect(findings).toHaveLength(0);
  });

  it('should handle conditions without braces on else if line', () => {
    const lines = [
      'if (status === "active") {',
      '  activate();',
      '} else if (status === "active") {',
      '  reactivate();',
      '}',
    ];
    const findings = duplicateCondition.detect(lines, 'app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('status === "active"');
  });

  it('should work across multiple languages', () => {
    expect(duplicateCondition.languages).toContain('java');
    expect(duplicateCondition.languages).toContain('csharp');
    expect(duplicateCondition.languages).toContain('go');
  });
});
