import { describe, it, expect } from 'vitest';
import { unsafeDeserialization } from '../../src/rules/security.js';
import { asyncNoErrorHandling, optionalChainOnCriticalPath } from '../../src/rules/error-handling.js';

// SEC010 tests: These test the DETECTION of unsafe deserialization patterns.
// No actual deserialization occurs — we are testing regex-based static analysis.

describe('SEC010: unsafe-deserialization', () => {
  it('should detect yaml.load(content)', () => {
    const lines = ['data = yaml.load(content)'];
    const findings = unsafeDeserialization.detect(lines, 'config.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC010');
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].confidence).toBe(90);
  });

  it('should NOT flag yaml.safe_load(content)', () => {
    const lines = ['data = yaml.safe_load(content)'];
    const findings = unsafeDeserialization.detect(lines, 'config.py');
    expect(findings).toHaveLength(0);
  });

  it('should detect unsafe deserialize load call', () => {
    // Tests detection of: pickle.load(f)
    const lines = ['obj = pickle.load(f)'];
    const findings = unsafeDeserialization.detect(lines, 'loader.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC010');
    expect(findings[0].confidence).toBe(90);
  });

  it('should detect unsafe deserialize loads call', () => {
    // Tests detection of: pickle.loads(data)
    const lines = ['obj = pickle.loads(data)'];
    const findings = unsafeDeserialization.detect(lines, 'loader.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC010');
  });

  it('should skip test files', () => {
    const lines = ['obj = pickle.load(f)'];
    const findings = unsafeDeserialization.detect(lines, 'test_loader.test.py');
    expect(findings).toHaveLength(0);
  });

  it('should skip comment lines', () => {
    const lines = ['# yaml.load(content)'];
    const context = { lines: [{ isComment: true, isString: false }] };
    const findings = unsafeDeserialization.detect(lines, 'config.py', context as any);
    expect(findings).toHaveLength(0);
  });
});

describe('ERR005: async-no-error-handling', () => {
  it('should detect async function with await but no try-catch', () => {
    const lines = [
      'async function fetchData() {',
      '  const result = await fetch("/api/data");',
      '  return result.json();',
      '}',
    ];
    const findings = asyncNoErrorHandling.detect(lines, 'service.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR005');
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].confidence).toBe(65);
  });

  it('should NOT flag async function with try-catch', () => {
    const lines = [
      'async function fetchData() {',
      '  try {',
      '    const result = await fetch("/api/data");',
      '    return result.json();',
      '  } catch (e) {',
      '    handleError(e);',
      '  }',
      '}',
    ];
    const findings = asyncNoErrorHandling.detect(lines, 'service.ts');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag async function without await', () => {
    const lines = [
      'async function getConfig() {',
      '  return { timeout: 5000 };',
      '}',
    ];
    const findings = asyncNoErrorHandling.detect(lines, 'config.ts');
    expect(findings).toHaveLength(0);
  });

  it('should detect arrow async without try-catch', () => {
    const lines = [
      'const loadUser = async (id) => {',
      '  const user = await db.findUser(id);',
      '  return user;',
      '}',
    ];
    const findings = asyncNoErrorHandling.detect(lines, 'user.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR005');
  });
});

describe('ERR006: optional-chain-on-critical-path', () => {
  it('should detect optional chaining on auth/permission objects', () => {
    const lines = ['const allowed = user?.permissions?.canEdit;'];
    const findings = optionalChainOnCriticalPath.detect(lines, 'auth.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR006');
    expect(findings[0].severity).toBe('medium');
    expect(findings[0].confidence).toBe(60);
  });

  it('should detect optional chaining on session objects', () => {
    const lines = ['const userId = session?.user?.id;'];
    const findings = optionalChainOnCriticalPath.detect(lines, 'middleware.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR006');
  });

  it('should detect optional chaining on token objects', () => {
    const lines = ['const claims = token?.claims?.role;'];
    const findings = optionalChainOnCriticalPath.detect(lines, 'jwt.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('ERR006');
  });

  it('should NOT flag optional chaining on non-critical paths', () => {
    const lines = ['const name = user?.profile?.displayName;'];
    const findings = optionalChainOnCriticalPath.detect(lines, 'display.ts');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag lines without optional chaining', () => {
    const lines = ['const role = auth.getRole();'];
    const findings = optionalChainOnCriticalPath.detect(lines, 'auth.ts');
    expect(findings).toHaveLength(0);
  });
});
