export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Category = 'error-handling' | 'security' | 'code-quality' | 'test-coverage';

export interface Finding {
  rule: string;
  severity: Severity;
  confidence: number; // 0-100
  category: Category;
  message: string;
  file: string;
  line: number;
  endLine?: number;
  snippet?: string;
  suggestion?: string;
}

export interface Rule {
  id: string;
  name: string;
  category: Category;
  severity: Severity;
  languages: string[];
  detect(lines: string[], filePath: string): Finding[];
}

export interface ReviewResult {
  findings: Finding[];
  summary: ReviewSummary;
}

export interface ReviewSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  filesReviewed: number;
  rulesApplied: number;
}

export function createSummary(findings: Finding[], filesReviewed: number, rulesApplied: number): ReviewSummary {
  return {
    totalFindings: findings.length,
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    medium: findings.filter((f) => f.severity === 'medium').length,
    low: findings.filter((f) => f.severity === 'low').length,
    filesReviewed,
    rulesApplied,
  };
}
