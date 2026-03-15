import { Commit, FileMetrics, FileChurn, ChurnLevel, ActivityPattern, ActivitySlot, RepoSummary } from '../types.js';

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
