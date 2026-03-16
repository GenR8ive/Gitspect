import { Commit, FileMetrics, FileChurn, ChurnLevel, ActivityPattern, ActivitySlot, RepoSummary, FileOwnership, FileRisk, FileCoupling, ProjectHealth, ProgressBlocker, BlockersOutput, EvolutionDataPoint, Trend, TrendDirection, EvolutionOutput, ContextOutput } from '../types.js';

/**
 * Patterns that indicate a bugfix commit
 */
const BUGFIX_PATTERNS = [
  /\bfix\b/i,
  /\bbugfix\b/i,
  /\bbug\s+fix\b/i,
  /\bpatch\b/i,
  /\bhotfix\b/i,
  /\bissue\b/i,
  /\b#\d+\b/, // GitHub issue references
];

/**
 * Patterns that indicate a revert commit
 */
const REVERT_PATTERNS = [
  /\brevert\b/i,
  /\brollback\b/i,
];

/**
 * Calculate file churn metrics from commits
 */
export function calculateFileChurn(commits: Commit[]): FileChurn[] {
  const fileMap = new Map<string, FileMetrics>();

  for (const commit of commits) {
    for (const filePath of commit.files) {
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          commitCount: 0,
          bugfixCount: 0,
          revertCount: 0,
          authors: [],
          lastModified: new Date(0),
          totalInsertions: 0,
          totalDeletions: 0,
        });
      }

      const metrics = fileMap.get(filePath)!;
      metrics.commitCount++;
      metrics.totalInsertions += commit.insertions;
      metrics.totalDeletions += commit.deletions;

      if (!metrics.authors.includes(commit.author)) {
        metrics.authors.push(commit.author);
      }

      if (commit.date > metrics.lastModified) {
        metrics.lastModified = commit.date;
      }

      if (isBugfixCommit(commit)) {
        metrics.bugfixCount++;
      }

      if (isRevertCommit(commit)) {
        metrics.revertCount++;
      }
    }
  }

  // Convert to array and calculate churn level
  const fileChurns: FileChurn[] = Array.from(fileMap.values()).map(metrics => ({
    ...metrics,
    churnLevel: calculateChurnLevel(metrics),
  }));

  // Sort by commit count descending
  return fileChurns.sort((a, b) => b.commitCount - a.commitCount);
}

/**
 * Calculate activity pattern from commits
 */
export function calculateActivityPattern(commits: Commit[]): ActivityPattern {
  // Create a 2D array: [day][hour]
  const slots: ActivitySlot[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({
      hour: 0,
      day: 0,
      commitCount: 0,
    }))
  );

  let maxCount = 0;
  let peakDay = 0;
  let peakHour = 0;

  for (const commit of commits) {
    const day = commit.date.getDay();
    const hour = commit.date.getHours();

    slots[day][hour].commitCount++;
    slots[day][hour].day = day;
    slots[day][hour].hour = hour;

    if (slots[day][hour].commitCount > maxCount) {
      maxCount = slots[day][hour].commitCount;
      peakDay = day;
      peakHour = hour;
    }
  }

  // Flatten the 2D array
  const flatSlots: ActivitySlot[] = slots.flat();

  // Calculate active days
  const activeDaysSet = new Set<number>();
  for (const commit of commits) {
    activeDaysSet.add(commit.date.getDate());
  }

  return {
    slots: flatSlots.filter(s => s.commitCount > 0),
    peak: maxCount > 0 ? { day: peakDay, hour: peakHour, commitCount: maxCount } : null,
    totalCommits: commits.length,
    activeDays: activeDaysSet.size,
  };
}

/**
 * Calculate overall repository summary
 */
export function calculateRepoSummary(commits: Commit[]): RepoSummary {
  const authors = new Set<string>();
  let totalInsertions = 0;
  let totalDeletions = 0;

  let oldestDate = new Date();
  let newestDate = new Date(0);

  for (const commit of commits) {
    authors.add(commit.author);
    totalInsertions += commit.insertions;
    totalDeletions += commit.deletions;

    if (commit.date < oldestDate) {
      oldestDate = commit.date;
    }
    if (commit.date > newestDate) {
      newestDate = commit.date;
    }
  }

  return {
    totalCommits: commits.length,
    totalInsertions,
    totalDeletions,
    authors: Array.from(authors),
    dateRange: {
      start: oldestDate,
      end: newestDate,
    },
  };
}

/**
 * Generate insights from metrics
 */
export function generateInsights(fileChurns: FileChurn[], activityPattern: ActivityPattern): string[] {
  const insights: string[] = [];

  // High churn files
  const highChurnFiles = fileChurns.filter(f => f.churnLevel === ChurnLevel.HIGH);
  if (highChurnFiles.length > 0) {
    const topFile = highChurnFiles[0];
    insights.push(`High churn detected in ${topFile.path} (${topFile.commitCount} commits)`);
  }

  // Files with many bugfixes
  const buggyFiles = fileChurns.filter(f => f.bugfixCount >= 3);
  if (buggyFiles.length > 0) {
    const topBuggy = buggyFiles[0];
    insights.push(`Frequent bugfixes in ${topBuggy.path} (${topBuggy.bugfixCount} bugfix commits)`);
  }

  // Revert detection
  const revertedFiles = fileChurns.filter(f => f.revertCount > 0);
  if (revertedFiles.length > 0) {
    const topRevert = revertedFiles[0];
    insights.push(`Reverted changes in ${topRevert.path} (${topRevert.revertCount} reverts)`);
  }

  // Late night coding
  if (activityPattern.peak && activityPattern.peak.hour >= 22) {
    insights.push('Peak activity during late hours (10pm+) - watch for burnout');
  }

  return insights;
}

/**
 * Check if a commit message indicates a bugfix
 */
function isBugfixCommit(commit: Commit): boolean {
  return BUGFIX_PATTERNS.some(pattern => pattern.test(commit.message));
}

/**
 * Check if a commit message indicates a revert
 */
function isRevertCommit(commit: Commit): boolean {
  return REVERT_PATTERNS.some(pattern => pattern.test(commit.message));
}

/**
 * Calculate churn level based on metrics
 */
function calculateChurnLevel(metrics: FileMetrics): ChurnLevel {
  // High churn: many commits OR many bugfixes
  if (metrics.commitCount >= 10 || metrics.bugfixCount >= 3) {
    return ChurnLevel.HIGH;
  }

  // Medium churn: moderate commits or some bugfixes
  if (metrics.commitCount >= 5 || metrics.bugfixCount >= 1) {
    return ChurnLevel.MEDIUM;
  }

  return ChurnLevel.LOW;
}

/**
 * Calculate file ownership from commits
 */
export function calculateFileOwnership(commits: Commit[]): FileOwnership[] {
  const fileMap = new Map<string, Map<string, number>>();

  // Build file -> author -> commit count mapping
  for (const commit of commits) {
    for (const filePath of commit.files) {
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, new Map());
      }
      const authorMap = fileMap.get(filePath)!;
      const currentCount = authorMap.get(commit.author) || 0;
      authorMap.set(commit.author, currentCount + 1);
    }
  }

  // Convert to FileOwnership array
  const ownerships: FileOwnership[] = [];
  for (const [path, authorMap] of fileMap.entries()) {
    // Find primary author (most commits)
    let maxCommits = 0;
    let primaryAuthor = '';
    let totalCommits = 0;

    for (const [author, count] of authorMap.entries()) {
      totalCommits += count;
      if (count > maxCommits) {
        maxCommits = count;
        primaryAuthor = author;
      }
    }

    ownerships.push({
      path,
      primaryAuthor,
      authorCommits: authorMap,
      totalCommits,
      ownershipPercentage: Math.round((maxCommits / totalCommits) * 100),
    });
  }

  // Sort by commit count descending
  return ownerships.sort((a, b) => b.totalCommits - a.totalCommits);
}

/**
 * Calculate file risk scores from commits
 */
export function calculateFileRisk(commits: Commit[]): FileRisk[] {
  const fileMap = new Map<string, FileMetrics>();

  // Build file metrics (reuse existing logic)
  for (const commit of commits) {
    for (const filePath of commit.files) {
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          commitCount: 0,
          bugfixCount: 0,
          revertCount: 0,
          authors: [],
          lastModified: new Date(0),
          totalInsertions: 0,
          totalDeletions: 0,
        });
      }

      const metrics = fileMap.get(filePath)!;
      metrics.commitCount++;
      metrics.totalInsertions += commit.insertions;
      metrics.totalDeletions += commit.deletions;

      if (!metrics.authors.includes(commit.author)) {
        metrics.authors.push(commit.author);
      }

      if (commit.date > metrics.lastModified) {
        metrics.lastModified = commit.date;
      }

      if (isBugfixCommit(commit)) {
        metrics.bugfixCount++;
      }

      if (isRevertCommit(commit)) {
        metrics.revertCount++;
      }
    }
  }

  // Calculate risk scores
  const risks: FileRisk[] = [];
  for (const metrics of fileMap.values()) {
    const riskScore = calculateRiskScore(metrics);
    risks.push({
      path: metrics.path,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      factors: {
        churn: metrics.commitCount,
        bugfixRate: metrics.commitCount > 0 ? metrics.bugfixCount / metrics.commitCount : 0,
        revertCount: metrics.revertCount,
        authorCount: metrics.authors.length,
      },
      lastModified: metrics.lastModified,
    });
  }

  // Sort by risk score descending
  return risks.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Calculate risk score (0-100) based on file metrics
 */
function calculateRiskScore(metrics: FileMetrics): number {
  let score = 0;

  // Churn factor: 0-40 points
  // More commits = higher churn risk
  const churnScore = Math.min(metrics.commitCount * 2, 40);
  score += churnScore;

  // Bugfix factor: 0-30 points
  // Higher bugfix rate = more problematic
  const bugfixRate = metrics.commitCount > 0 ? metrics.bugfixCount / metrics.commitCount : 0;
  const bugfixScore = Math.min(bugfixRate * 100, 30);
  score += bugfixScore;

  // Revert factor: 0-20 points
  // More reverts = more instability
  const revertScore = Math.min(metrics.revertCount * 10, 20);
  score += revertScore;

  // Complexity factor: 0-10 points
  // More authors = more complexity
  const authorScore = Math.min(metrics.authors.length * 2, 10);
  score += authorScore;

  return Math.min(score, 100);
}

/**
 * Get risk level from score
 */
function getRiskLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate file coupling (files changed together)
 */
export function calculateFileCoupling(commits: Commit[]): FileCoupling[] {
  const couplingMap = new Map<string, number>();

  // Track file pairs changed together
  for (const commit of commits) {
    const files = commit.files;
    if (files.length < 2) continue;

    // Generate all pairs
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        // Create a canonical key (alphabetically sorted)
        const [file1, file2] = [files[i], files[j]].sort();
        const key = `${file1}|${file2}`;

        const currentCount = couplingMap.get(key) || 0;
        couplingMap.set(key, currentCount + 1);
      }
    }
  }

  // Convert to FileCoupling array
  const couplings: FileCoupling[] = [];
  for (const [key, count] of couplingMap.entries()) {
    const [file1, file2] = key.split('|');
    couplings.push({
      file1,
      file2,
      couplingCount: count,
      couplingStrength: getCouplingStrength(count),
    });
  }

  // Sort by coupling count descending
  return couplings.sort((a, b) => b.couplingCount - a.couplingCount);
}

/**
 * Get coupling strength from count
 */
function getCouplingStrength(count: number): 'STRONG' | 'MODERATE' | 'WEAK' {
  if (count >= 5) return 'STRONG';
  if (count >= 3) return 'MODERATE';
  return 'WEAK';
}

// ============================================================================
// PHASE 3: Project Management Narratives
// ============================================================================

/**
 * Calculate project health metrics for report command
 */
export function calculateProjectHealth(commits: Commit[], startDate: Date, endDate: Date): ProjectHealth {
  const bugfixCommits = commits.filter(c => isBugfixCommit(c));
  const revertCommits = commits.filter(c => isRevertCommit(c));

  // Calculate file churn to find risk areas
  const fileChurns = calculateFileChurn(commits);
  const fileRisks = calculateFileRisk(commits);

  const concerns: string[] = [];
  const positiveSignals: string[] = [];

  // Analyze concerns
  if (revertCommits.length > 5) {
    concerns.push(`${revertCommits.length} reverts - frequent direction changes`);
  }
  if (bugfixCommits.length / commits.length > 0.2) {
    concerns.push(`High bugfix rate (${Math.round(bugfixCommits.length / commits.length * 100)}%) - accumulating tech debt`);
  }
  const highChurnFiles = fileChurns.filter(f => f.churnLevel === ChurnLevel.HIGH);
  if (highChurnFiles.length > 3) {
    concerns.push(`${highChurnFiles.length} files with high churn - unstable architecture`);
  }

  // Analyze positive signals
  const authors = new Set(commits.map(c => c.author));
  if (authors.size >= 3) {
    positiveSignals.push(`${authors.size} active contributors - healthy collaboration`);
  }
  const avgCommitsPerDay = commits.length / Math.max(1, getDaysBetween(startDate, endDate));
  if (avgCommitsPerDay > 5) {
    positiveSignals.push(`Strong development momentum (${Math.round(avgCommitsPerDay)} commits/day)`);
  }

  return {
    concerns,
    positiveSignals,
    metrics: {
      totalCommits: commits.length,
      bugfixRate: commits.length > 0 ? bugfixCommits.length / commits.length : 0,
      revertRate: commits.length > 0 ? revertCommits.length / commits.length : 0,
      avgCommitSize: commits.length > 0
        ? (commits.reduce((sum, c) => sum + c.insertions + c.deletions, 0) / commits.length)
        : 0,
      activeContributors: authors.size,
    },
    riskAreas: {
      highChurnFiles: fileChurns.filter(f => f.churnLevel === ChurnLevel.HIGH).length,
      criticalRiskFiles: fileRisks.filter(f => f.riskLevel === 'CRITICAL').length,
    },
    timeframe: {
      start: startDate,
      end: endDate,
      days: getDaysBetween(startDate, endDate),
    },
  };
}

/**
 * Calculate progress blockers for blockers command
 */
export function calculateBlockers(commits: Commit[], startDate: Date, endDate: Date): BlockersOutput {
  const blockers: ProgressBlocker[] = [];
  const fileChurns = calculateFileChurn(commits);
  const fileRisks = calculateFileRisk(commits);

  // Hotspot blocker: files with very high churn
  const hotspotFiles = fileChurns.filter(f => f.commitCount >= 20).slice(0, 3);
  if (hotspotFiles.length > 0) {
    blockers.push({
      type: 'hotspot',
      severity: hotspotFiles[0].commitCount >= 50 ? 'critical' : 'high',
      description: 'Files requiring excessive attention',
      affectedFiles: hotspotFiles.map(f => f.path),
      evidence: hotspotFiles.map(f => ({
        metric: 'commits',
        value: f.commitCount,
      })),
      suggestion: 'Consider refactoring to reduce complexity',
    });
  }

  // Instability blocker: high revert rate
  const revertCommits = commits.filter(c => isRevertCommit(c));
  if (revertCommits.length > 3) {
    blockers.push({
      type: 'instability',
      severity: revertCommits.length > 10 ? 'critical' : revertCommits.length > 5 ? 'high' : 'medium',
      description: 'Frequent rollbacks indicate unstable direction',
      affectedFiles: revertCommits.slice(0, 5).flatMap(c => c.files),
      evidence: [
        { metric: 'reverts', value: revertCommits.length },
        { metric: 'rate', value: `${Math.round(revertCommits.length / commits.length * 100)}%` },
      ],
      suggestion: 'Review commit practices and consider more incremental changes',
    });
  }

  // Complexity blocker: files touched by many authors
  const complexFiles = fileChurns
    .filter(f => f.authors.length >= 5)
    .sort((a, b) => b.authors.length - a.authors.length)
    .slice(0, 3);
  if (complexFiles.length > 0) {
    blockers.push({
      type: 'complexity',
      severity: complexFiles[0].authors.length >= 10 ? 'high' : 'medium',
      description: 'Files with many contributors may have unclear ownership',
      affectedFiles: complexFiles.map(f => f.path),
      evidence: complexFiles.map(f => ({
        metric: 'authors',
        value: f.authors.length,
      })),
      suggestion: 'Consider code ownership review and documentation',
    });
  }

  // Churn blocker: high bugfix rate areas
  const buggyFiles = fileRisks
    .filter(f => f.factors.bugfixRate > 0.2)
    .sort((a, b) => b.factors.bugfixRate - a.factors.bugfixRate)
    .slice(0, 3);
  if (buggyFiles.length > 0) {
    blockers.push({
      type: 'churn',
      severity: buggyFiles[0].factors.bugfixRate > 0.5 ? 'critical' : 'high',
      description: 'Areas with frequent bugfix activity',
      affectedFiles: buggyFiles.map(f => f.path),
      evidence: buggyFiles.map(f => ({
        metric: 'bugfix rate',
        value: `${Math.round(f.factors.bugfixRate * 100)}%`,
      })),
      suggestion: 'Investigate root causes and consider targeted refactoring',
    });
  }

  // Count severities
  const summary = {
    critical: blockers.filter(b => b.severity === 'critical').length,
    high: blockers.filter(b => b.severity === 'high').length,
    medium: blockers.filter(b => b.severity === 'medium').length,
    low: blockers.filter(b => b.severity === 'low').length,
  };

  return {
    blockers,
    summary,
    timeframe: {
      start: startDate,
      end: endDate,
      days: getDaysBetween(startDate, endDate),
    },
  };
}

/**
 * Calculate evolution trends for evolution command
 */
export function calculateEvolution(
  commits: Commit[],
  startDate: Date,
  endDate: Date,
  granularity: 'week' | 'month'
): EvolutionOutput {
  const dataPoints: EvolutionDataPoint[] = [];

  // Group commits by time period
  const periodMap = new Map<string, Commit[]>();

  for (const commit of commits) {
    const period = getPeriod(commit.date, granularity);
    if (!periodMap.has(period)) {
      periodMap.set(period, []);
    }
    periodMap.get(period)!.push(commit);
  }

  // Create data points
  const sortedPeriods = Array.from(periodMap.keys()).sort();
  for (const period of sortedPeriods) {
    const periodCommits = periodMap.get(period)!;
    const authors = new Set(periodCommits.map(c => c.author));
    const files = new Set(periodCommits.flatMap(c => c.files));

    dataPoints.push({
      period,
      commits: periodCommits.length,
      insertions: periodCommits.reduce((sum, c) => sum + c.insertions, 0),
      deletions: periodCommits.reduce((sum, c) => sum + c.deletions, 0),
      authors: authors.size,
      files: files.size,
    });
  }

  // Calculate trends
  const trends: Trend[] = [];
  if (dataPoints.length >= 2) {
    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];

    // Commit rate trend
    const commitChange = ((last.commits - first.commits) / Math.max(1, first.commits)) * 100;
    trends.push({
      metric: 'Commits per period',
      direction: getTrendDirection(commitChange),
      changePercent: Math.round(commitChange),
      description: formatTrendDescription('Commits', commitChange),
    });

    // Author trend
    const authorChange = ((last.authors - first.authors) / Math.max(1, first.authors)) * 100;
    trends.push({
      metric: 'Contributors',
      direction: getTrendDirection(authorChange),
      changePercent: Math.round(authorChange),
      description: formatTrendDescription('Contributors', authorChange),
    });

    // Code growth trend
    const netGrowthChange = ((last.insertions - last.deletions) - (first.insertions - first.deletions)) /
                             Math.max(1, first.insertions - first.deletions) * 100;
    trends.push({
      metric: 'Net code growth',
      direction: getTrendDirection(netGrowthChange),
      changePercent: Math.round(netGrowthChange),
      description: formatTrendDescription('Net code growth', netGrowthChange),
    });
  }

  // Calculate summary metrics
  const periods = dataPoints.length;
  const avgCommitsPerPeriod = periods > 0
    ? dataPoints.reduce((sum: number, dp: EvolutionDataPoint) => sum + dp.commits, 0) / periods
    : 0;

  const authorCounts = dataPoints.map((dp: EvolutionDataPoint) => dp.authors);
  const minAuthors = Math.min(...authorCounts, 1);
  const busFactor = minAuthors;

  // Determine stability
  const recentCommits = dataPoints.slice(-3).reduce((sum: number, dp: EvolutionDataPoint) => sum + dp.commits, 0) / Math.min(3, dataPoints.length);
  const overallAvg = dataPoints.reduce((sum: number, dp: EvolutionDataPoint) => sum + dp.commits, 0) / dataPoints.length;
  let stability: 'improving' | 'stable' | 'declining';
  if (recentCommits > overallAvg * 1.2) stability = 'improving';
  else if (recentCommits < overallAvg * 0.8) stability = 'declining';
  else stability = 'stable';

  return {
    dataPoints,
    trends,
    summary: {
      growthRate: Math.round(avgCommitsPerPeriod * 10) / 10,
      stability,
      busFactor,
    },
    granularity,
    timeframe: {
      start: startDate,
      end: endDate,
      periods,
    },
  };
}

// ============================================================================
// Phase 3 Helper Functions
// ============================================================================

/**
 * Get number of days between two dates
 */
function getDaysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Get period label for a date based on granularity
 */
function getPeriod(date: Date, granularity: 'week' | 'month'): string {
  if (granularity === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `Week ${getWeekNumber(weekStart)}`;
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get trend direction from change percentage
 */
function getTrendDirection(change: number): TrendDirection {
  if (change > 10) return TrendDirection.UP;
  if (change < -10) return TrendDirection.DOWN;
  return TrendDirection.STABLE;
}

/**
 * Format trend description
 */
function formatTrendDescription(metric: string, change: number): string {
  const direction = change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable';
  return `${metric} is ${direction}`;
}

// ============================================================================
// AI CONTEXT: Comprehensive repo overview for AI assistants
// ============================================================================

/**
 * Calculate comprehensive AI context for a repository
 */
export function calculateContext(commits: Commit[], startDate: Date, endDate: Date): ContextOutput {
  // Run all analyses
  const fileChurns = calculateFileChurn(commits);
  const fileRisks = calculateFileRisk(commits);
  const fileOwnerships = calculateFileOwnership(commits);
  const fileCouplings = calculateFileCoupling(commits);
  const projectHealth = calculateProjectHealth(commits, startDate, endDate);
  const blockers = calculateBlockers(commits, startDate, endDate);
  const evolution = calculateEvolution(commits, startDate, endDate, 'week');

  // Calculate averages for comparisons
  const avgCommits = fileChurns.length > 0
    ? fileChurns.reduce((sum: number, f: FileChurn) => sum + f.commitCount, 0) / fileChurns.length
    : 0;
  const avgBugfixRate = fileChurns.length > 0
    ? fileChurns.reduce((sum: number, f: FileChurn) => sum + (f.bugfixCount / Math.max(1, f.commitCount)), 0) / fileChurns.length
    : 0;

  // Detect primary language from file extensions
  const extensionMap = new Map<string, number>();
  for (const commit of commits) {
    for (const file of commit.files) {
      const ext = file.split('.').pop()?.toLowerCase() || 'unknown';
      extensionMap.set(ext, (extensionMap.get(ext) || 0) + 1);
    }
  }
  const primaryLanguage = Array.from(extensionMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

  // Determine overall health
  const criticalRisks = fileRisks.filter(f => f.riskLevel === 'CRITICAL').length;
  const highRisks = fileRisks.filter(f => f.riskLevel === 'HIGH').length;
  const health: 'excellent' | 'good' | 'moderate' | 'concerning' | 'critical' =
    criticalRisks >= 3 ? 'critical' :
    criticalRisks >= 1 || highRisks >= 3 ? 'concerning' :
    highRisks >= 1 || projectHealth.concerns.length >= 2 ? 'moderate' :
    projectHealth.concerns.length === 0 ? 'excellent' : 'good';

  // Determine development velocity
  const days = getDaysBetween(startDate, endDate);
  const commitsPerDay = commits.length / Math.max(1, days);
  const developmentVelocity =
    commitsPerDay > 10 ? 'very_high' :
    commitsPerDay > 5 ? 'high' :
    commitsPerDay > 1 ? 'moderate' : 'low';

  // Build critical areas
  const highRiskFiles = fileRisks.slice(0, 5).map(f => ({
    path: f.path,
    riskScore: f.riskScore,
    riskLevel: f.riskLevel,
    why: generateRiskExplanation(f, avgCommits, avgBugfixRate),
    recommendation: generateRiskRecommendation(f),
  }));

  const hotspots = fileChurns
    .filter(f => f.commitCount > avgCommits * 2)
    .slice(0, 5)
    .map(f => {
      const ratio = f.commitCount / Math.max(1, avgCommits);
      return {
        path: f.path,
        commits: f.commitCount,
        bugfixRate: f.bugfixCount / Math.max(1, f.commitCount),
        comparison: `${Math.round(ratio)}x higher than average (${Math.round(avgCommits)} avg commits)`,
      };
    });

  const unstableAreas = fileChurns
    .filter(f => f.revertCount > 0)
    .sort((a, b) => b.revertCount - a.revertCount)
    .slice(0, 3)
    .map(f => ({
      path: f.path,
      reverts: f.revertCount,
      lastRewritten: getRelativeTime(f.lastModified),
    }));

  // Build ownership insights
  const authorCommits = new Map<string, number>();
  const authorFiles = new Map<string, Set<string>>();
  for (const ownership of fileOwnerships) {
    authorCommits.set(ownership.primaryAuthor, (authorCommits.get(ownership.primaryAuthor) || 0) + ownership.totalCommits);
    if (!authorFiles.has(ownership.primaryAuthor)) {
      authorFiles.set(ownership.primaryAuthor, new Set());
    }
    authorFiles.get(ownership.primaryAuthor)!.add(ownership.path);
  }

  const keyOwners = Array.from(authorCommits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author, commits]) => ({
      author,
      ownedFiles: authorFiles.get(author)?.size || 0,
      totalCommits: commits,
    }));

  const topContributorPct = fileOwnerships.length > 0
    ? fileOwnerships.filter(o => o.primaryAuthor === keyOwners[0]?.author).reduce((sum, o) => sum + o.totalCommits, 0) /
      Math.max(1, commits.length)
    : 0;
  const siloRisk = topContributorPct > 0.5;

  // Build coupling insights
  const strongCouplings = fileCouplings
    .filter(c => c.couplingStrength === 'STRONG')
    .slice(0, 5)
    .map(c => ({
      file1: c.file1,
      file2: c.file2,
      strength: c.couplingStrength,
      implication: `Changes to ${c.file1} likely require changes to ${c.file2}`,
    }));

  // Detect patterns
  const avgCommitSize = commits.reduce((sum, c) => sum + c.insertions + c.deletions, 0) / Math.max(1, commits.length);
  const commitSize: 'large' | 'medium' | 'small' =
    avgCommitSize > 500 ? 'large' : avgCommitSize > 100 ? 'medium' : 'small';

  const bugfixCommits = commits.filter(c => isBugfixCommit(c));
  const revertCommits = commits.filter(c => isRevertCommit(c));

  const afterHoursCommits = commits.filter(c => {
    const hour = c.date.getHours();
    return hour < 9 || hour >= 18;
  });
  const weekendCommits = commits.filter(c => {
    const day = c.date.getDay();
    return day === 0 || day === 6;
  });

  // Generate warnings and strengths
  const warnings: string[] = [];
  const strengths: string[] = [];

  if (criticalRisks > 0) {
    warnings.push(`${criticalRisks} file(s) at CRITICAL risk level`);
  }
  if (revertCommits.length > 5) {
    warnings.push(`High revert rate (${revertCommits.length} reverts) suggests unstable direction`);
  }
  if (siloRisk) {
    warnings.push(`Code silo risk: single contributor owns >50% of changes`);
  }
  if (evolution.summary.busFactor <= 2) {
    warnings.push(`Low bus factor: project depends on ${evolution.summary.busFactor} or fewer contributors`);
  }
  if (strongCouplings.length > 5) {
    warnings.push(`High coupling: ${strongCouplings.length} strong file dependencies detected`);
  }

  if (projectHealth.positiveSignals.length > 0) {
    strengths.push(...projectHealth.positiveSignals);
  }
  if (evolution.summary.stability === 'improving') {
    strengths.push('Development stability improving over time');
  }
  if (projectHealth.metrics.activeContributors >= 3) {
    strengths.push(`Healthy collaboration: ${projectHealth.metrics.activeContributors} active contributors`);
  }

  return {
    overview: {
      health,
      totalCommits: commits.length,
      activeContributors: projectHealth.metrics.activeContributors,
      timeframeDays: days,
      primaryLanguage,
      developmentVelocity,
    },
    criticalAreas: {
      highRiskFiles,
      hotspots,
      unstableAreas,
    },
    ownership: {
      busFactor: evolution.summary.busFactor,
      keyOwners,
      siloRisk,
    },
    coupling: {
      strongCouplings,
      hiddenDependencies: fileCouplings.filter(c => c.couplingStrength === 'STRONG' || c.couplingStrength === 'MODERATE').length,
    },
    patterns: {
      commitSize,
      bugfixRate: bugfixCommits.length / Math.max(1, commits.length),
      revertRate: revertCommits.length / Math.max(1, commits.length),
      afterHoursActivity: afterHoursCommits.length > commits.length * 0.2,
      weekendActivity: weekendCommits.length > commits.length * 0.1,
    },
    trends: {
      stability: evolution.summary.stability,
      growthRate: `${evolution.summary.growthRate} commits/week`,
      contributorTrend: evolution.trends.find(t => t.metric === 'Contributors')?.direction === 'up' ? 'growing' :
                       evolution.trends.find(t => t.metric === 'Contributors')?.direction === 'down' ? 'shrinking' : 'stable',
    },
    warnings,
    strengths,
    metadata: {
      generatedAt: new Date().toISOString(),
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      commandsRun: ['reflect', 'scars', 'blame-map', 'couples', 'report', 'blockers', 'evolution'],
    },
  };
}

/**
 * Generate human-readable risk explanation
 */
function generateRiskExplanation(risk: FileRisk, avgCommits: number, avgBugfixRate: number): string {
  const reasons: string[] = [];

  if (risk.factors.churn > avgCommits * 2) {
    reasons.push(`${Math.round(risk.factors.churn / avgCommits)}x higher churn than average`);
  }
  if (risk.factors.bugfixRate > avgBugfixRate * 1.5) {
    reasons.push(`${Math.round(risk.factors.bugfixRate * 100)}% bugfix rate (very high)`);
  }
  if (risk.factors.revertCount > 2) {
    reasons.push(`${risk.factors.revertCount} reverts indicate instability`);
  }
  if (risk.factors.authorCount > 5) {
    reasons.push(`touched by ${risk.factors.authorCount} authors (high complexity)`);
  }

  return reasons.length > 0 ? reasons.join('; ') : 'elevated risk indicators';
}

/**
 * Generate risk recommendation
 */
function generateRiskRecommendation(risk: FileRisk): string {
  if (risk.riskLevel === 'CRITICAL') {
    return 'requires senior review and comprehensive testing before changes';
  }
  if (risk.riskLevel === 'HIGH') {
    return 'proceed with caution, add tests, consider pair programming';
  }
  if (risk.riskLevel === 'MEDIUM') {
    return 'review recent changes and test thoroughly';
  }
  return 'normal modification risk';
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 7) return 'within the last week';
  if (diff < 30) return 'within the last month';
  if (diff < 90) return 'within the last 3 months';
  return 'more than 3 months ago';
}
