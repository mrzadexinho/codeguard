import { describe, it, expect } from 'vitest';
import { evalUsage, innerHtmlAssignment, hardcodedSecrets, sqlInjection, commandInjection } from '../../src/rules/security.js';

// These tests verify that codeguard's DETECTION rules correctly identify
// security anti-patterns in source code strings. No vulnerable code is executed.

describe('SEC001: eval-usage', () => {
  it('should detect eval()', () => {
    const lines = ['const result = eval(userInput);'];
    const findings = evalUsage.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC001');
    expect(findings[0].severity).toBe('critical');
  });

  it('should skip comments', () => {
    const lines = ['// eval(something) is bad'];
    const findings = evalUsage.detect(lines, 'test.ts');
    expect(findings).toHaveLength(0);
  });

  it('should detect Function constructor', () => {
    const lines = ['const fn = new Function("return " + code);'];
    const findings = evalUsage.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
  });
});

describe('SEC002: innerHTML', () => {
  it('should detect innerHTML assignment', () => {
    const lines = ['element.innerHTML = userContent;'];
    const findings = innerHtmlAssignment.detect(lines, 'test.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC002');
  });

  it('should detect dangerouslySetInnerHTML', () => {
    const lines = ['<div dangerouslySetInnerHTML={{ __html: content }} />'];
    const findings = innerHtmlAssignment.detect(lines, 'test.tsx');
    expect(findings).toHaveLength(1);
  });
});

describe('SEC003: hardcoded-secrets', () => {
  it('should detect hardcoded API keys', () => {
    const lines = ['const api_key = "abcdef0123456789abcdef01";'];
    const findings = hardcodedSecrets.detect(lines, 'config.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC003');
    expect(findings[0].severity).toBe('critical');
  });

  it('should detect hardcoded passwords', () => {
    const lines = ['const password = "supersecretpassword123";'];
    const findings = hardcodedSecrets.detect(lines, 'config.ts');
    expect(findings).toHaveLength(1);
  });

  it('should skip test files', () => {
    const lines = ['const api_key = "abcdef0123456789abcdef01";'];
    const findings = hardcodedSecrets.detect(lines, 'config.test.ts');
    expect(findings).toHaveLength(0);
  });

  it('should detect AWS access keys', () => {
    const lines = ['aws_access_key_id = "AKIAIOSFODNN7EXAMPLE"'];
    const findings = hardcodedSecrets.detect(lines, 'config.py');
    expect(findings).toHaveLength(1);
  });

  it('should detect private keys', () => {
    const lines = ['-----BEGIN RSA PRIVATE KEY-----'];
    const findings = hardcodedSecrets.detect(lines, 'cert.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('private key');
  });
});

describe('SEC004: sql-injection', () => {
  it('should detect SQL with template literals', () => {
    const lines = ['const query = `SELECT * FROM users WHERE id = ${userId}`;'];
    const findings = sqlInjection.detect(lines, 'db.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC004');
  });

  it('should detect SQL with string concatenation', () => {
    const lines = ['const query = "SELECT * FROM users WHERE id = " + userId;'];
    const findings = sqlInjection.detect(lines, 'db.ts');
    expect(findings).toHaveLength(1);
  });

  it('should detect Python f-string SQL', () => {
    const lines = ['query = f"SELECT * FROM users WHERE name = {name}"'];
    const findings = sqlInjection.detect(lines, 'db.py');
    expect(findings).toHaveLength(1);
  });

  it('should not flag parameterized queries', () => {
    const lines = ['const query = "SELECT * FROM users WHERE id = ?";'];
    const findings = sqlInjection.detect(lines, 'db.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('SEC005: command-injection', () => {
  it('should detect shell command with template literal', () => {
    const lines = ['exec(`ls ${userDir}`);'];
    const findings = commandInjection.detect(lines, 'util.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC005');
  });

  it('should detect Python os.system', () => {
    const lines = ['os.system("rm " + filename)'];
    const findings = commandInjection.detect(lines, 'util.py');
    expect(findings).toHaveLength(1);
  });
});
