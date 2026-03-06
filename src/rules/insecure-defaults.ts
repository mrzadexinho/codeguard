import type { Rule, Finding } from './types.js';
import type { FileContext } from '../context/types.js';

// All rules in this file are DETECTION rules based on TrailOfBits "insecure-defaults" patterns.
// They detect fail-open configurations that let apps run insecurely in production.

const SECRET_KEYWORDS = /(?:secret|password|passwd|pwd|token|api_key|apikey|private_key|auth)/i;

export const failOpenEnv: Rule = {
  id: 'SEC006',
  name: 'fail-open-env',
  category: 'security',
  severity: 'high',
  languages: ['typescript', 'javascript', 'python'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];

    // JS/TS: process.env.VAR || 'fallback' or process.env.VAR ?? 'fallback'
    const jsEnvFallback = /process\.env\.(\w+)\s*(?:\|\||\?\?)\s*['"`]/;
    // Python: os.environ.get('VAR', 'fallback')
    const pyEnvironGet = /os\.environ\.get\(\s*['"](\w+)['"]\s*,\s*['"`]/;
    // Python: os.getenv('VAR') or 'value'
    const pyGetenvOr = /os\.getenv\(\s*['"](\w+)['"]\s*\)\s+or\s+['"`]/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i];

      let match = jsEnvFallback.exec(line);
      if (match && SECRET_KEYWORDS.test(match[1])) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: `Environment variable ${match[1]} falls back to hardcoded secret — fails open if env is missing`,
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Throw an error if required secrets are missing instead of using fallback values',
        });
        continue;
      }

      match = pyEnvironGet.exec(line);
      if (match && SECRET_KEYWORDS.test(match[1])) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: `Environment variable ${match[1]} falls back to hardcoded secret — fails open if env is missing`,
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use os.environ[key] to raise KeyError when secrets are missing',
        });
        continue;
      }

      match = pyGetenvOr.exec(line);
      if (match && SECRET_KEYWORDS.test(match[1])) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: `Environment variable ${match[1]} falls back to hardcoded secret — fails open if env is missing`,
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use os.environ[key] to raise KeyError when secrets are missing',
        });
      }
    }
    return findings;
  },
};

export const debugFlagDefault: Rule = {
  id: 'SEC007',
  name: 'debug-flag-default',
  category: 'security',
  severity: 'medium',
  languages: ['typescript', 'javascript', 'python'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;

    // DEBUG = True / true
    const debugAssign = /\bDEBUG\s*=\s*(?:True|true)\b/;
    // debug: true in config objects
    const debugConfig = /\bdebug\s*:\s*true\b/;
    // NODE_ENV defaulting to 'development'
    const nodeEnvDev = /NODE_ENV.*(?:\|\||\?\?)\s*['"]development['"]/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i];

      if (debugAssign.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'DEBUG mode enabled by default — should be disabled in production',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Set DEBUG = False by default and enable via environment variable',
        });
        continue;
      }

      if (debugConfig.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'Debug flag enabled in configuration — should be disabled in production',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Set debug: false by default and control via environment variable',
        });
        continue;
      }

      if (nodeEnvDev.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'NODE_ENV defaults to development — app runs in dev mode if env is missing',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Default to "production" or throw if NODE_ENV is not set',
        });
      }
    }
    return findings;
  },
};

export const permissiveCors: Rule = {
  id: 'SEC008',
  name: 'permissive-cors',
  category: 'security',
  severity: 'high',
  languages: ['typescript', 'javascript', 'python', 'java', 'go', 'ruby', 'php'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];

    // Access-Control-Allow-Origin: * or set to '*'
    const headerWildcard = /Access-Control-Allow-Origin['"]\s*[,:]\s*['"]\s*\*/;
    // cors({ origin: '*' })
    const corsWildcard = /cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/;
    // ALLOWED_ORIGINS fallback to '*'
    const originsWildcard = /(?:ALLOWED_ORIGINS|allowed_origins|allowedOrigins).*['"]\*['"]/;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i];

      if (headerWildcard.test(line) || corsWildcard.test(line) || originsWildcard.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 85,
          category: this.category,
          message: 'CORS allows all origins (*) — any website can make requests to this API',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Restrict CORS to specific trusted origins',
        });
      }
    }
    return findings;
  },
};

export const weakCrypto: Rule = {
  id: 'SEC009',
  name: 'weak-crypto',
  category: 'security',
  severity: 'high',
  languages: ['typescript', 'javascript', 'python', 'java', 'go', 'ruby', 'php', 'csharp'],
  detect(lines, filePath, context?) {
    const findings: Finding[] = [];
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) return findings;

    // Weak hash: createHash('md5'), createHash('sha1'), hashlib.md5(), hashlib.sha1()
    const jsWeakHash = /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i;
    const pyWeakHash = /hashlib\.(?:md5|sha1)\s*\(/i;
    // Weak cipher: DES, RC4
    const weakCipher = /\b(?:DES|RC4|RC2)\b/;
    // ECB mode
    const ecbMode = /(?:AES\.MODE_ECB|AES\/ECB|mode\s*[:=]\s*['"]?ECB)/i;

    for (let i = 0; i < lines.length; i++) {
      if (context?.lines[i]?.isComment || context?.lines[i]?.isString) continue;
      const line = lines[i];

      if (jsWeakHash.test(line) || pyWeakHash.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'Weak hash algorithm (MD5/SHA1) — vulnerable to collision attacks',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use SHA-256 or stronger: createHash("sha256") / hashlib.sha256()',
        });
        continue;
      }

      if (ecbMode.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'ECB mode detected — leaks patterns in encrypted data',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use AES-GCM or AES-CBC with proper IV',
        });
        continue;
      }

      if (weakCipher.test(line)) {
        findings.push({
          rule: this.id,
          severity: this.severity,
          confidence: 80,
          category: this.category,
          message: 'Weak cipher algorithm detected — DES/RC4 are cryptographically broken',
          file: filePath,
          line: i + 1,
          snippet: lines[i],
          suggestion: 'Use AES-256-GCM or ChaCha20-Poly1305',
        });
      }
    }
    return findings;
  },
};

export const insecureDefaultsRules: Rule[] = [failOpenEnv, debugFlagDefault, permissiveCors, weakCrypto];
