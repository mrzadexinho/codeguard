import { describe, it, expect } from 'vitest';
import { buildFileContext, detectFileType } from '../../src/context/analyzer.js';

describe('detectFileType', () => {
  it('should detect test files', () => {
    expect(detectFileType('src/utils.test.ts')).toBe('test');
    expect(detectFileType('src/utils.spec.ts')).toBe('test');
    expect(detectFileType('__tests__/utils.ts')).toBe('test');
  });

  it('should detect config files', () => {
    expect(detectFileType('vitest.config.ts')).toBe('config');
    expect(detectFileType('config/db.ts')).toBe('config');
    expect(detectFileType('.env')).toBe('config');
  });

  it('should detect migration files', () => {
    expect(detectFileType('db/migration_001.sql')).toBe('migration');
    expect(detectFileType('migrate/up.ts')).toBe('migration');
  });

  it('should detect generated files', () => {
    expect(detectFileType('types.generated.ts')).toBe('generated');
    expect(detectFileType('schema.gen.ts')).toBe('generated');
  });

  it('should default to source for regular files', () => {
    expect(detectFileType('src/app.ts')).toBe('source');
    expect(detectFileType('lib/utils.js')).toBe('source');
  });
});

describe('buildFileContext - comments', () => {
  it('should detect single-line // comments', () => {
    const ctx = buildFileContext('app.ts', '// this is a comment\nconst x = 1;');
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(false);
  });

  it('should detect block /* */ comments', () => {
    const code = [
      '/* start of block',
      '   still inside',
      '   end of block */',
      'const x = 1;',
    ].join('\n');
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(true);
    expect(ctx.lines[2].isComment).toBe(true);
    expect(ctx.lines[3].isComment).toBe(false);
  });

  it('should detect single-line block comments', () => {
    const ctx = buildFileContext('app.ts', '/* inline comment */\nconst x = 1;');
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(false);
  });

  it('should detect Python # comments', () => {
    const ctx = buildFileContext('app.py', '# python comment\nx = 1');
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(false);
  });

  it('should detect Python docstrings', () => {
    const code = [
      '"""',
      'This is a docstring',
      '"""',
      'x = 1',
    ].join('\n');
    const ctx = buildFileContext('app.py', code);
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(true);
    expect(ctx.lines[2].isComment).toBe(true);
    expect(ctx.lines[3].isComment).toBe(false);
  });

  it('should detect single-line Python docstrings', () => {
    const ctx = buildFileContext('app.py', '"""single line docstring"""\nx = 1');
    expect(ctx.lines[0].isComment).toBe(true);
    expect(ctx.lines[1].isComment).toBe(false);
  });
});

describe('buildFileContext - strings', () => {
  it('should detect multi-line template literals', () => {
    const code = [
      'const sql = `',
      '  SELECT * FROM users',
      '  WHERE id = 1',
      '`;',
      'const x = 1;',
    ].join('\n');
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.lines[0].isString).toBe(true);
    expect(ctx.lines[1].isString).toBe(true);
    expect(ctx.lines[2].isString).toBe(true);
    expect(ctx.lines[3].isString).toBe(true); // closing backtick line is still part of the string
    expect(ctx.lines[4].isString).toBe(false);
  });
});

describe('buildFileContext - imports', () => {
  it('should detect ES import statements', () => {
    const code = "import { foo } from 'bar';\nconst x = 1;";
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.lines[0].isImport).toBe(true);
    expect(ctx.lines[1].isImport).toBe(false);
  });

  it('should detect require statements', () => {
    const code = "const foo = require('bar');\nconst x = 1;";
    const ctx = buildFileContext('app.js', code);
    expect(ctx.lines[0].isImport).toBe(true);
    expect(ctx.lines[1].isImport).toBe(false);
  });

  it('should detect Python import statements', () => {
    const code = 'import os\nfrom sys import argv\nx = 1';
    const ctx = buildFileContext('app.py', code);
    expect(ctx.lines[0].isImport).toBe(true);
    expect(ctx.lines[1].isImport).toBe(true);
    expect(ctx.lines[2].isImport).toBe(false);
  });

  it('should collect module names from ES imports', () => {
    const code = "import { foo } from 'lodash';\nimport bar from 'express';";
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.imports).toContain('lodash');
    expect(ctx.imports).toContain('express');
  });

  it('should collect module names from require', () => {
    const code = "const fs = require('fs');\nconst path = require('path');";
    const ctx = buildFileContext('app.js', code);
    expect(ctx.imports).toContain('fs');
    expect(ctx.imports).toContain('path');
  });

  it('should collect module names from Python imports', () => {
    const code = 'import os\nfrom sys import argv';
    const ctx = buildFileContext('app.py', code);
    expect(ctx.imports).toContain('os');
    expect(ctx.imports).toContain('sys');
  });
});

describe('buildFileContext - try-catch regions', () => {
  it('should detect basic try-catch blocks', () => {
    const code = [
      'const x = 1;',
      'try {',
      '  riskyOp();',
      '} catch (e) {',
      '  handle(e);',
      '}',
      'const y = 2;',
    ].join('\n');
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.tryCatchRegions.length).toBeGreaterThanOrEqual(1);
    const region = ctx.tryCatchRegions[0];
    expect(region.start).toBe(2); // 1-indexed
    expect(region.end).toBeGreaterThanOrEqual(6);
  });

  it('should detect inline try-catch', () => {
    const code = 'try { x(); } catch (e) { handle(e); }';
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.tryCatchRegions.length).toBe(1);
    expect(ctx.tryCatchRegions[0].start).toBe(1);
    expect(ctx.tryCatchRegions[0].end).toBe(1);
  });
});

describe('buildFileContext - blank lines', () => {
  it('should detect blank lines', () => {
    const code = 'const x = 1;\n\nconst y = 2;\n   \n';
    const ctx = buildFileContext('app.ts', code);
    expect(ctx.lines[0].isBlank).toBe(false);
    expect(ctx.lines[1].isBlank).toBe(true);
    expect(ctx.lines[2].isBlank).toBe(false);
    expect(ctx.lines[3].isBlank).toBe(true);
  });
});

describe('buildFileContext - language detection', () => {
  it('should detect language from file extension', () => {
    expect(buildFileContext('app.ts', '').language).toBe('typescript');
    expect(buildFileContext('app.py', '').language).toBe('python');
    expect(buildFileContext('app.go', '').language).toBe('go');
    expect(buildFileContext('app.rs', '').language).toBe('rust');
    expect(buildFileContext('data.json', '').language).toBe('unknown');
  });
});

describe('buildFileContext - file metadata', () => {
  it('should set filePath and fileType', () => {
    const ctx = buildFileContext('src/utils.test.ts', 'const x = 1;');
    expect(ctx.filePath).toBe('src/utils.test.ts');
    expect(ctx.fileType).toBe('test');
    expect(ctx.language).toBe('typescript');
  });

  it('should have correct number of line contexts', () => {
    const ctx = buildFileContext('app.ts', 'line1\nline2\nline3');
    expect(ctx.lines).toHaveLength(3);
  });
});
