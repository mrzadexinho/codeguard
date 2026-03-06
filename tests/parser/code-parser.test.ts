import { describe, it, expect } from 'vitest';
import { parseFile, detectLanguage } from '../../src/parser/code-parser.js';

describe('detectLanguage', () => {
  it('should detect TypeScript', () => {
    expect(detectLanguage('src/app.ts')).toBe('typescript');
    expect(detectLanguage('src/component.tsx')).toBe('typescript');
  });

  it('should detect JavaScript', () => {
    expect(detectLanguage('src/app.js')).toBe('javascript');
    expect(detectLanguage('src/component.jsx')).toBe('javascript');
  });

  it('should detect Python', () => {
    expect(detectLanguage('main.py')).toBe('python');
  });

  it('should detect other languages', () => {
    expect(detectLanguage('main.go')).toBe('go');
    expect(detectLanguage('main.rs')).toBe('rust');
    expect(detectLanguage('App.java')).toBe('java');
  });

  it('should return unknown for unrecognized extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('unknown');
  });
});

describe('parseFile', () => {
  it('should parse basic file properties', () => {
    const content = 'const x = 1;\nconst y = 2;\n';
    const result = parseFile('test.ts', content);
    expect(result.path).toBe('test.ts');
    expect(result.language).toBe('typescript');
    expect(result.lines).toHaveLength(3);
  });

  it('should extract brace blocks from TypeScript', () => {
    const content = `function hello() {
  return 'world';
}

function goodbye() {
  return 'bye';
}`;
    const result = parseFile('test.ts', content);
    expect(result.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it('should extract Python blocks', () => {
    const content = `def hello():
    return 'world'

def goodbye():
    return 'bye'
`;
    const result = parseFile('test.py', content);
    expect(result.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle empty content', () => {
    const result = parseFile('test.ts', '');
    expect(result.lines).toHaveLength(1);
    expect(result.blocks).toHaveLength(0);
  });
});
