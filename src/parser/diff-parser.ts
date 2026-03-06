import type { ParsedDiff, DiffFile, DiffHunk, DiffLine } from './types.js';

export function parseDiff(raw: string): ParsedDiff {
  const files: DiffFile[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith('diff --git')) {
      const file = parseFile(lines, i);
      files.push(file.diffFile);
      i = file.nextIndex;
    } else {
      i++;
    }
  }

  return { files };
}

function parseFile(lines: string[], start: number): { diffFile: DiffFile; nextIndex: number } {
  let i = start;
  let path = '';
  let oldPath: string | null = null;
  let status: DiffFile['status'] = 'modified';
  const hunks: DiffHunk[] = [];

  // Parse diff header: diff --git a/path b/path
  const headerMatch = lines[i].match(/^diff --git a\/(.+) b\/(.+)$/);
  if (headerMatch) {
    oldPath = headerMatch[1];
    path = headerMatch[2];
    if (oldPath !== path) {
      status = 'renamed';
    }
  }
  i++;

  // Parse extended headers (new file, deleted file, rename, etc.)
  while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
    if (lines[i].startsWith('new file')) {
      status = 'added';
      oldPath = null;
    } else if (lines[i].startsWith('deleted file')) {
      status = 'deleted';
    } else if (lines[i].startsWith('--- /dev/null')) {
      status = 'added';
      oldPath = null;
    } else if (lines[i].startsWith('+++ /dev/null')) {
      status = 'deleted';
    } else if (lines[i].startsWith('+++ b/')) {
      path = lines[i].slice(6);
    } else if (lines[i].startsWith('--- a/')) {
      oldPath = lines[i].slice(6);
    }
    i++;
  }

  // Parse hunks
  while (i < lines.length && !lines[i].startsWith('diff --git')) {
    if (lines[i].startsWith('@@')) {
      const hunk = parseHunk(lines, i);
      hunks.push(hunk.hunk);
      i = hunk.nextIndex;
    } else {
      i++;
    }
  }

  return {
    diffFile: { path, oldPath: status === 'added' ? null : oldPath, status, hunks },
    nextIndex: i,
  };
}

function parseHunk(lines: string[], start: number): { hunk: DiffHunk; nextIndex: number } {
  const headerMatch = lines[start].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  const oldStart = headerMatch ? parseInt(headerMatch[1], 10) : 0;
  const oldCount = headerMatch ? parseInt(headerMatch[2] ?? '1', 10) : 0;
  const newStart = headerMatch ? parseInt(headerMatch[3], 10) : 0;
  const newCount = headerMatch ? parseInt(headerMatch[4] ?? '1', 10) : 0;

  const diffLines: DiffLine[] = [];
  let i = start + 1;
  let oldLine = oldStart;
  let newLine = newStart;

  while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('diff --git')) {
    const line = lines[i];

    if (line.startsWith('+')) {
      diffLines.push({
        type: 'add',
        content: line.slice(1),
        oldLineNumber: null,
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('-')) {
      diffLines.push({
        type: 'remove',
        content: line.slice(1),
        oldLineNumber: oldLine++,
        newLineNumber: null,
      });
    } else if (line.startsWith(' ') || line === '') {
      diffLines.push({
        type: 'context',
        content: line.startsWith(' ') ? line.slice(1) : line,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file" — skip
    } else {
      break;
    }
    i++;
  }

  return {
    hunk: { oldStart, oldCount, newStart, newCount, lines: diffLines },
    nextIndex: i,
  };
}
