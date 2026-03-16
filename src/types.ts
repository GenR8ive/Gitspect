/**
 * Represents a single commit with all relevant metadata
 */
export interface Commit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  files: string[];
  insertions: number;
  deletions: number;
}

/**
 * Metrics for a single file
 */
export interface FileMetrics {
  path: string;
  commitCount: number;
  bugfixCount: number;
  revertCount: number;
  authors: string[];
  lastModified: Date;
  totalInsertions: number;
  totalDeletions: number;
}

/**
 * Churn level for file risk assessment
 */
export enum ChurnLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * File metrics with churn level
 */
export interface FileChurn extends FileMetrics {
  churnLevel: ChurnLevel;
}

/**
 * Activity pattern for a time slot
 */
export interface ActivitySlot {
  hour: number;
  day: number; // 0 = Sunday, 6 = Saturday
  commitCount: number;
}

/**
 * Overall activity pattern
 */
export interface ActivityPattern {
  slots: ActivitySlot[];
  peak: {
    hour: number;
    day: number;
    commitCount: number;
  } | null;
  totalCommits: number;
  activeDays: number;
}

/**
 * Overall repository summary
 */
export interface RepoSummary {
  totalCommits: number;
  totalInsertions: number;
  totalDeletions: number;
  authors: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Output format options
 */
export enum OutputFormat {
  TEXT = 'text',
  JSON = 'json',
}

/**
 * Command options shared across commands
 */
export interface BaseOptions {
  days?: number; // If not specified, show all commits
  json?: boolean;
  currentBranch?: boolean; // If true, only analyze current branch
}

/**
 * Reflect command output
 */
export interface ReflectOutput {
  summary: RepoSummary;
  topChurnFiles: FileChurn[];
  activityPattern: ActivityPattern;
  insights: string[];
}

/**
 * Churn command options
 */
export interface ChurnOptions extends BaseOptions {
  limit?: number;
}

/**
 * File ownership metrics
 */
export interface FileOwnership {
  path: string;
  primaryAuthor: string;
  authorCommits: Map<string, number>; // author -> commit count
  totalCommits: number;
  ownershipPercentage: number; // primary author's share
}

/**
 * File risk assessment (for scars command)
 */
export interface FileRisk {
  path: string;
  riskScore: number; // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: {
    churn: number; // commit count
    bugfixRate: number; // bugfix commits / total commits
    revertCount: number;
    authorCount: number; // many authors = complexity
  };
  lastModified: Date;
}

/**
 * File coupling (files changed together)
 */
export interface FileCoupling {
  file1: string;
  file2: string;
  couplingCount: number; // times changed together
  couplingStrength: 'STRONG' | 'MODERATE' | 'WEAK';
}

/**
 * Scars and couples command options with limit
 */
export interface LimitedOptions extends BaseOptions {
  limit?: number;
}

// ============================================================================
// PHASE 3: Project Management Narratives
// ============================================================================

/**
 * Project health report
 */
export interface ProjectHealth {
  concerns: string[];
  positiveSignals: string[];
  metrics: {
    totalCommits: number;
    bugfixRate: number; // bugfix commits / total commits
    revertRate: number; // revert commits / total commits
    avgCommitSize: number; // avg insertions + deletions
    activeContributors: number;
  };
  riskAreas: {
    highChurnFiles: number;
    criticalRiskFiles: number;
  };
  timeframe: {
    start: Date;
    end: Date;
    days: number;
  };
}

/**
 * Progress blocker analysis
 */
export interface ProgressBlocker {
  type: 'hotspot' | 'instability' | 'complexity' | 'churn';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedFiles: string[];
  evidence: {
    metric: string;
    value: number | string;
  }[];
  suggestion?: string;
}

/**
 * Blockers command output
 */
export interface BlockersOutput {
  blockers: ProgressBlocker[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  timeframe: {
    start: Date;
    end: Date;
    days: number;
  };
}

/**
 * Evolution data point for a time period
 */
export interface EvolutionDataPoint {
  period: string; // e.g., "2024-01", "Week 3"
  commits: number;
  insertions: number;
  deletions: number;
  authors: number;
  files: number;
}

/**
 * Trend direction
 */
export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

/**
 * Trend analysis
 */
export interface Trend {
  metric: string;
  direction: TrendDirection;
  changePercent: number;
  description: string;
}

/**
 * Evolution command output
 */
export interface EvolutionOutput {
  dataPoints: EvolutionDataPoint[];
  trends: Trend[];
  summary: {
    growthRate: number; // commits per time period
    stability: 'improving' | 'stable' | 'declining';
    busFactor: number; // how many authors before project is at risk
  };
  granularity: 'week' | 'month';
  timeframe: {
    start: Date;
    end: Date;
    periods: number;
  };
}

/**
 * AI context output - comprehensive repo overview for AI assistants
 */
export interface ContextOutput {
  // High-level overview
  overview: {
    health: 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical';
    totalCommits: number;
    activeContributors: number;
    timeframeDays: number;
    primaryLanguage: string;
    developmentVelocity: 'very_high' | 'high' | 'moderate' | 'low';
  };

  // Critical areas AI should know about
  criticalAreas: {
    highRiskFiles: Array<{
      path: string;
      riskScore: number;
      riskLevel: string;
      why: string; // human-readable explanation
      recommendation: string;
    }>;
    hotspots: Array<{
      path: string;
      commits: number;
      bugfixRate: number;
      comparison: string; // e.g., "3x higher than average"
    }>;
    unstableAreas: Array<{
      path: string;
      reverts: number;
      lastRewritten: string; // relative time
    }>;
  };

  // Code ownership patterns
  ownership: {
    busFactor: number;
    keyOwners: Array<{
      author: string;
      ownedFiles: number;
      totalCommits: number;
    }>;
    siloRisk: boolean; // true if few people own most code
  };

  // Dependency insights
  coupling: {
    strongCouplings: Array<{
      file1: string;
      file2: string;
      strength: string;
      implication: string; // what this means for changes
    }>;
    hiddenDependencies: number;
  };

  // Development patterns
  patterns: {
    commitSize: 'large' | 'medium' | 'small';
    bugfixRate: number;
    revertRate: number;
    afterHoursActivity: boolean; // commits outside 9-5
    weekendActivity: boolean;
  };

  // Trends over time
  trends: {
    stability: 'improving' | 'stable' | 'declining';
    growthRate: string;
    contributorTrend: 'growing' | 'stable' | 'shrinking';
  };

  // Actionable warnings for AI
  warnings: string[];

  // Positive signals
  strengths: string[];

  // Metadata
  metadata: {
    generatedAt: string;
    timeRange: {
      start: string;
      end: string;
    };
    commandsRun: string[];
  };
}
