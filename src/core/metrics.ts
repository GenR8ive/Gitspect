import { Commit, FileMetrics, FileChurn, ChurnLevel, ActivityPattern, ActivitySlot, RepoSummary, FileOwnership, FileRisk, FileCoupling } from '../types.js';

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
