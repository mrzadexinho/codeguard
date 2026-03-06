export interface DiffFile {
  path: string;
  oldPath: string | null;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface ParsedDiff {
  files: DiffFile[];
}

export interface CodeBlock {
  content: string;
  language: string;
  startLine: number;
  endLine: number;
}

export interface ParsedFile {
  path: string;
  content: string;
  lines: string[];
  language: string;
  blocks: CodeBlock[];
}
