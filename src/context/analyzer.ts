import type { FileContext, FileType, LineContext, RegionInfo } from './types.js';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.rs': 'rust', '.go': 'go',
  '.java': 'java', '.rb': 'ruby', '.php': 'php',
  '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin',
};

export function detectFileType(filePath: string): FileType {
  const lower = filePath.toLowerCase();

  if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__')) {
    return 'test';
  }
  if (
    lower.includes('.config.') ||
    lower.includes('config/') ||
    lower.includes('.env') ||
    lower.endsWith('.rc') ||
    lower.endsWith('rc.ts') ||
    lower.endsWith('rc.js')
  ) {
    return 'config';
  }
  if (lower.includes('migration') || lower.includes('migrate')) {
    return 'migration';
  }
  if (lower.includes('.generated.') || lower.includes('.gen.')) {
    return 'generated';
  }
  return 'source';
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] ?? 'unknown';
}

export function buildFileContext(filePath: string, content: string): FileContext {
  const language = detectLanguage(filePath);
  const fileType = detectFileType(filePath);
  const rawLines = content.split('\n');

  const lines: LineContext[] = [];
  const tryCatchRegions: RegionInfo[] = [];
  const functionRegions: RegionInfo[] = [];
  const imports: string[] = [];

  // State for multi-line tracking
  let inBlockComment = false;
  let inDocstring = false;
  let inTemplateLiteral = false;

  // State for try-catch region tracking
  let tryStartLine = -1;
  let tryCatchBraceDepth = -1;
  let inTryCatch = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    const lineNum = i + 1; // 1-indexed

    let isComment = false;
    let isString = false;
    let isImport = false;
    const isBlank = trimmed.length === 0;

    // --- Comment detection ---
    if (inBlockComment) {
      isComment = true;
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
    } else if (inDocstring) {
      isComment = true;
      if (trimmed.includes('"""') || trimmed.includes("'''")) {
        inDocstring = false;
      }
    } else if (inTemplateLiteral) {
      isString = true;
      // Count unescaped backticks to detect end
      if (countUnescapedBackticks(line) % 2 === 1) {
        inTemplateLiteral = false;
      }
    } else {
      // Check for new comment/string regions starting on this line
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        isComment = true;
      } else if (trimmed.startsWith('/*')) {
        isComment = true;
        if (!trimmed.includes('*/') || trimmed.endsWith('/*')) {
          inBlockComment = true;
        }
      } else if (
        (trimmed.startsWith('"""') || trimmed.startsWith("'''")) &&
        language === 'python'
      ) {
        isComment = true;
        // Check if docstring closes on same line (needs at least 6 chars for open+close)
        const rest = trimmed.slice(3);
        if (!rest.includes('"""') && !rest.includes("'''")) {
          inDocstring = true;
        }
      } else {
        // Check for inline block comment start (e.g., code /* comment)
        if (trimmed.includes('/*') && !trimmed.includes('*/')) {
          inBlockComment = true;
        }

        // Check for template literal start
        if (countUnescapedBackticks(line) % 2 === 1) {
          isString = true;
          inTemplateLiteral = true;
        }
      }
    }

    // --- Import detection ---
    if (!isComment && !isBlank) {
      if (
        trimmed.startsWith('import ') ||
        trimmed.startsWith('import(') ||
        trimmed.startsWith('from ') ||
        trimmed.includes('require(')
      ) {
        isImport = true;
      }
    }

    // --- Collect module names from imports ---
    if (isImport) {
      collectImports(trimmed, imports);
    }

    // --- Try-catch region detection ---
    if (!isComment && !isString && !isBlank) {
      if (!inTryCatch && /\btry\s*\{/.test(trimmed)) {
        tryStartLine = lineNum;
        // Count braces on this line to initialize depth
        tryCatchBraceDepth = countBraceDepth(trimmed, 0);
        inTryCatch = true;
      } else if (inTryCatch) {
        tryCatchBraceDepth = countBraceDepth(trimmed, tryCatchBraceDepth);
        // Check if the try-catch block is complete
        // We need to also check for catch/finally continuation
        if (tryCatchBraceDepth === 0) {
          // Check if next non-blank line continues with catch/finally
          const nextNonBlank = peekNextNonBlank(rawLines, i + 1);
          if (nextNonBlank && (/^\s*(catch|finally)\b/.test(nextNonBlank))) {
            // Continue tracking - catch/finally will re-open braces
          } else if (/\bcatch\b/.test(trimmed) || /\bfinally\b/.test(trimmed)) {
            // This line has catch/finally but braces closed - check if it reopens
            // If depth is 0, the whole try-catch is done
            tryCatchRegions.push({ start: tryStartLine, end: lineNum });
            inTryCatch = false;
          } else {
            tryCatchRegions.push({ start: tryStartLine, end: lineNum });
            inTryCatch = false;
          }
        }
      }
    }

    lines.push({ isComment, isString, isImport, isBlank });
  }

  // Close unclosed try-catch at end of file
  if (inTryCatch) {
    tryCatchRegions.push({ start: tryStartLine, end: rawLines.length });
  }

  return {
    filePath,
    language,
    fileType,
    lines,
    tryCatchRegions,
    functionRegions,
    imports,
  };
}

function countUnescapedBackticks(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '`' && (i === 0 || line[i - 1] !== '\\')) {
      count++;
    }
  }
  return count;
}

function countBraceDepth(line: string, startDepth: number): number {
  let depth = startDepth;
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  return depth;
}

function peekNextNonBlank(lines: string[], startIndex: number): string | null {
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      return lines[i];
    }
  }
  return null;
}

function collectImports(line: string, imports: string[]): void {
  // ES module: from 'module' or from "module"
  const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
  if (fromMatch) {
    imports.push(fromMatch[1]);
    return;
  }

  // CommonJS: require('module') or require("module")
  const requireMatch = line.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
  if (requireMatch) {
    imports.push(requireMatch[1]);
    return;
  }

  // Python: import module or from module import ...
  const pyImportMatch = line.match(/^import\s+(\w+)/);
  if (pyImportMatch && !line.includes('from') && !line.includes('{')) {
    imports.push(pyImportMatch[1]);
    return;
  }

  // Python: from module import ...
  const pyFromMatch = line.match(/^from\s+(\w+)/);
  if (pyFromMatch) {
    imports.push(pyFromMatch[1]);
  }
}
