export interface LineContext {
  isComment: boolean;
  isString: boolean;
  isImport: boolean;
  isBlank: boolean;
}

export interface RegionInfo {
  start: number; // 1-indexed line number
  end: number;
}

export type FileType = 'source' | 'test' | 'config' | 'migration' | 'generated' | 'unknown';

export interface FileContext {
  filePath: string;
  language: string;
  fileType: FileType;
  lines: LineContext[];
  tryCatchRegions: RegionInfo[];
  functionRegions: RegionInfo[];
  imports: string[];
}
