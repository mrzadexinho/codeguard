import { describe, it, expect } from 'vitest';
import { failOpenEnv, debugFlagDefault, permissiveCors, weakCrypto } from '../../src/rules/insecure-defaults.js';

// These tests verify that codeguard's DETECTION rules correctly identify
// insecure default patterns in source code strings. No vulnerable code is executed.

describe('SEC006: fail-open-env', () => {
  it('should detect JS env fallback with secret keyword', () => {
    const lines = ["const secret = process.env.SECRET || 'dev-secret';"];
    const findings = failOpenEnv.detect(lines, 'config.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC006');
    expect(findings[0].severity).toBe('high');
    expect(findings[0].confidence).toBe(85);
  });

  it('should detect JS env fallback with nullish coalescing', () => {
    const lines = ["const token = process.env.API_TOKEN ?? 'fallback-token';"];
    const findings = failOpenEnv.detect(lines, 'config.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC006');
  });

  it('should detect Python os.environ.get with secret fallback', () => {
    const lines = ["SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret')"];
    const findings = failOpenEnv.detect(lines, 'settings.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC006');
  });

  it('should detect Python os.getenv or pattern', () => {
    const lines = ["api_key = os.getenv('API_KEY') or 'default-key'"];
    const findings = failOpenEnv.detect(lines, 'config.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC006');
  });

  it('should NOT flag non-secret env fallback', () => {
    const lines = ['const port = process.env.PORT || 3000;'];
    const findings = failOpenEnv.detect(lines, 'config.ts');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag env without fallback', () => {
    const lines = ['const secret = process.env.SECRET;'];
    const findings = failOpenEnv.detect(lines, 'config.ts');
    expect(findings).toHaveLength(0);
  });
});

describe('SEC007: debug-flag-default', () => {
  it('should detect DEBUG = True', () => {
    const lines = ['DEBUG = True'];
    const findings = debugFlagDefault.detect(lines, 'settings.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC007');
    expect(findings[0].severity).toBe('medium');
  });

  it('should detect debug: true in config', () => {
    const lines = ['const config = { debug: true, port: 3000 };'];
    const findings = debugFlagDefault.detect(lines, 'config.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC007');
  });

  it('should detect NODE_ENV defaulting to development', () => {
    const lines = ["const env = process.env.NODE_ENV || 'development';"];
    const findings = debugFlagDefault.detect(lines, 'app.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC007');
  });

  it('should NOT flag debug: false', () => {
    const lines = ['const config = { debug: false };'];
    const findings = debugFlagDefault.detect(lines, 'config.ts');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag DEBUG = False', () => {
    const lines = ['DEBUG = False'];
    const findings = debugFlagDefault.detect(lines, 'settings.py');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag in test files', () => {
    const lines = ['DEBUG = True'];
    const findings = debugFlagDefault.detect(lines, 'settings.test.py');
    expect(findings).toHaveLength(0);
  });
});

describe('SEC008: permissive-cors', () => {
  it('should detect Access-Control-Allow-Origin wildcard header', () => {
    const lines = ["res.setHeader('Access-Control-Allow-Origin', '*');"];
    const findings = permissiveCors.detect(lines, 'server.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC008');
    expect(findings[0].severity).toBe('high');
  });

  it('should detect cors({ origin: * })', () => {
    const lines = ["app.use(cors({ origin: '*' }));"];
    const findings = permissiveCors.detect(lines, 'server.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC008');
  });

  it('should detect ALLOWED_ORIGINS fallback to wildcard', () => {
    const lines = ["ALLOWED_ORIGINS = os.environ.get('ORIGINS', '*')"];
    const findings = permissiveCors.detect(lines, 'settings.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC008');
  });
});

describe('SEC009: weak-crypto', () => {
  it('should detect createHash md5', () => {
    const lines = ["const hash = crypto.createHash('md5').update(data).digest('hex');"];
    const findings = weakCrypto.detect(lines, 'auth.ts');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC009');
    expect(findings[0].severity).toBe('high');
  });

  it('should detect hashlib.sha1()', () => {
    const lines = ['digest = hashlib.sha1(password.encode()).hexdigest()'];
    const findings = weakCrypto.detect(lines, 'auth.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('SEC009');
  });

  it('should detect AES ECB mode', () => {
    const lines = ['cipher = AES.new(key, AES.MODE_ECB)'];
    const findings = weakCrypto.detect(lines, 'crypto.py');
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('ECB');
  });

  it('should detect AES/ECB in Java', () => {
    const lines = ['Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");'];
    const findings = weakCrypto.detect(lines, 'Crypto.java');
    expect(findings).toHaveLength(1);
  });

  it('should NOT flag createHash sha256', () => {
    const lines = ["const hash = crypto.createHash('sha256').update(data).digest('hex');"];
    const findings = weakCrypto.detect(lines, 'auth.ts');
    expect(findings).toHaveLength(0);
  });

  it('should NOT flag in test files', () => {
    const lines = ["const hash = crypto.createHash('md5').update(data).digest('hex');"];
    const findings = weakCrypto.detect(lines, 'auth.test.ts');
    expect(findings).toHaveLength(0);
  });
});
