import type { ParsedFile, CodeBlock } from './types.js';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.sql': 'sql',
};

export function detectLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] ?? 'unknown';
}

export function parseFile(filePath: string, content: string): ParsedFile {
  const lines = content.split('\n');
  const language = detectLanguage(filePath);
  const blocks = extractBlocks(lines, language);

  return { path: filePath, content, lines, language, blocks };
}

function extractBlocks(lines: string[], language: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  if (['typescript', 'javascript', 'java', 'csharp', 'go', 'rust', 'cpp', 'c', 'swift', 'kotlin', 'php'].includes(language)) {
    extractBraceBlocks(lines, language, blocks);
  } else if (language === 'python') {
    extractIndentBlocks(lines, language, blocks);
  }

  return blocks;
}

function extractBraceBlocks(lines: string[], language: string, blocks: CodeBlock[]): void {
  let depth = 0;
  let blockStart = -1;
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const ch of line) {
      if (ch === '{') {
        if (depth === 0) {
          blockStart = i + 1;
          blockLines = [];
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && blockStart >= 0) {
          blockLines.push(line);
          blocks.push({
            content: blockLines.join('\n'),
            language,
            startLine: blockStart,
            endLine: i + 1,
          });
          blockStart = -1;
          blockLines = [];
          continue;
        }
      }
    }

    if (depth > 0) {
      blockLines.push(line);
    }
  }
}

function extractIndentBlocks(lines: string[], language: string, blocks: CodeBlock[]): void {
  const defPattern = /^(def |class |async def )/;
  let blockStart = -1;
  let blockLines: string[] = [];
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();

    if (defPattern.test(trimmed)) {
      if (blockStart >= 0 && blockLines.length > 0) {
        blocks.push({
          content: blockLines.join('\n'),
          language,
          startLine: blockStart,
          endLine: i,
        });
      }
      blockStart = i + 1;
      baseIndent = line.length - trimmed.length;
      blockLines = [line];
      continue;
    }

    if (blockStart >= 0) {
      const currentIndent = line.length - trimmed.length;
      if (trimmed === '' || currentIndent > baseIndent) {
        blockLines.push(line);
      } else {
        blocks.push({
          content: blockLines.join('\n'),
          language,
          startLine: blockStart,
          endLine: i,
        });
        blockStart = -1;
        blockLines = [];
      }
    }
  }

  if (blockStart >= 0 && blockLines.length > 0) {
    blocks.push({
      content: blockLines.join('\n'),
      language,
      startLine: blockStart,
      endLine: lines.length,
    });
  }
}
