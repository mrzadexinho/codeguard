import type { Rule, Finding, ReviewResult } from './types.js';
import { createSummary } from './types.js';
import { buildFileContext } from '../context/analyzer.js';
import { errorHandlingRules } from './error-handling.js';
import { securityRules } from './security.js';
import { codeQualityRules } from './code-quality.js';

export interface EngineOptions {
  minConfidence?: number;
  categories?: string[];
  severities?: string[];
}

const DEFAULT_MIN_CONFIDENCE = 0;

export class RuleEngine {
  private rules: Rule[];

  constructor(rules?: Rule[]) {
    this.rules = rules ?? [...errorHandlingRules, ...securityRules, ...codeQualityRules];
  }

  reviewFile(filePath: string, content: string, options: EngineOptions = {}): ReviewResult {
    const lines = content.split('\n');
    const context = buildFileContext(filePath, content);
    const language = detectLanguageFromPath(filePath);
    const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;

    const applicableRules = this.rules.filter((rule) => {
      if (rule.languages.length > 0 && !rule.languages.includes(language)) return false;
      if (options.categories && !options.categories.includes(rule.category)) return false;
      if (options.severities && !options.severities.includes(rule.severity)) return false;
      return true;
    });

    const findings: Finding[] = [];
    for (const rule of applicableRules) {
      const ruleFindings = rule.detect(lines, filePath, context);
      findings.push(...ruleFindings.filter((f) => f.confidence >= minConfidence));
    }

    findings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });

    return {
      findings,
      summary: createSummary(findings, 1, applicableRules.length),
    };
  }

  reviewFiles(files: Array<{ path: string; content: string }>, options: EngineOptions = {}): ReviewResult {
    const allFindings: Finding[] = [];
    let totalRules = 0;

    for (const file of files) {
      const result = this.reviewFile(file.path, file.content, options);
      allFindings.push(...result.findings);
      totalRules = Math.max(totalRules, result.summary.rulesApplied);
    }

    allFindings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const diff = severityOrder[a.severity] - severityOrder[b.severity];
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });

    return {
      findings: allFindings,
      summary: createSummary(allFindings, files.length, totalRules),
    };
  }

  getRules(): Rule[] {
    return [...this.rules];
  }
}

function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.rs': 'rust', '.go': 'go',
    '.java': 'java', '.rb': 'ruby', '.php': 'php',
    '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
    '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin',
  };
  return map[ext] ?? 'unknown';
}
