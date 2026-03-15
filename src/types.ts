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
  days: number;
  json?: boolean;
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
