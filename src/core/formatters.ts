import chalk from 'chalk';
import Table from 'cli-table3';
import { FileChurn, ActivityPattern, RepoSummary, ReflectOutput, ChurnLevel } from '../types.js';

/**
 * Format a date range as a readable string
 */
function formatDateRange(days: number): string {
  return `Last ${days} days`;
}

/**
 * Format a date as a readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get the emoji for a churn level
 */
function getChurnEmoji(level: ChurnLevel): string {
  switch (level) {
    case ChurnLevel.HIGH:
      return '🔥';
    case ChurnLevel.MEDIUM:
      return '⚠️';
    case ChurnLevel.LOW:
      return '✅';
    default:
      return '•';
  }
}

/**
 * Get the label for a churn level
 */
function getChurnLabel(level: ChurnLevel): string {
  switch (level) {
    case ChurnLevel.HIGH:
      return 'HIGH';
    case ChurnLevel.MEDIUM:
      return 'MED';
    case ChurnLevel.LOW:
      return 'LOW';
    default:
      return 'UNK';
  }
}

/**
 * Get the day name
 */
function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
}

/**
 * Format repository summary for display
 */
export function formatRepoSummary(summary: RepoSummary, days: number): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`\n${formatDateRange(days)}\n`));

  lines.push(chalk.gray('─'.repeat(40)));
  lines.push(`${chalk.bold('📊 Activity')}`);
  lines.push(`  ${chalk.bold(summary.totalCommits.toString())} commits  |  ${chalk.green('+' + summary.totalInsertions.toString())} added  |  ${chalk.red('-' + summary.totalDeletions.toString())} deleted`);
  lines.push(`  Authors: ${summary.authors.join(', ') || 'None'}`);
  lines.push(`  ${chalk.gray(`Range: ${formatDate(summary.dateRange.start)} to ${formatDate(summary.dateRange.end)}`)}`);

  return lines.join('\n');
}

/**
 * Format file churn for display
 */
export function formatFileChurn(files: FileChurn[], maxFiles: number = 5): string {
  if (files.length === 0) {
    return chalk.gray('\nNo file changes found.');
  }

  const lines: string[] = [];
  lines.push(`\n${chalk.bold('🔥 High churn files')}`);

  const displayFiles = files.slice(0, maxFiles);

  // Find the longest filename for alignment
  const maxPathLength = Math.max(...displayFiles.map(f => f.path.length));

  for (const file of displayFiles) {
    const emoji = getChurnEmoji(file.churnLevel);
    const status = chalk.bold(getChurnLabel(file.churnLevel));
    const bugfixInfo = file.bugfixCount > 0 ? chalk.red(`  |  ${file.bugfixCount} bugfixes`) : '';
    const revertInfo = file.revertCount > 0 ? chalk.yellow(`  |  ${file.revertCount} revert${file.revertCount > 1 ? 's' : ''}`) : '';

    lines.push(
      `  ${emoji}  ${file.path.padEnd(maxPathLength)}  ${file.commitCount.toString().padStart(3)} commits${bugfixInfo}${revertInfo}  ${status}`
    );
  }

  if (files.length > maxFiles) {
    lines.push(chalk.gray(`  ... and ${files.length - maxFiles} more files`));
  }

  return lines.join('\n');
}

/**
 * Format insights for display
 */
export function formatInsights(insights: string[]): string {
  if (insights.length === 0) {
    return chalk.gray('\nNo significant insights detected.');
  }

  const lines: string[] = [];
  lines.push(`\n${chalk.bold('💡 Insights')}`);

  for (const insight of insights) {
    lines.push(`  • ${insight}`);
  }

  return lines.join('\n');
}

/**
 * Format activity heatmap for display
 */
export function formatHeatmap(activityPattern: ActivityPattern): string {
  const lines: string[] = [];

  lines.push(`\n${chalk.bold('📅 Activity Heatmap')}`);

  if (activityPattern.slots.length === 0) {
    lines.push(chalk.gray('  No activity data available.'));
    return lines.join('\n');
  }

  // Create a 2D grid [hour][day]
  const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));

  for (const slot of activityPattern.slots) {
    grid[slot.hour][slot.day] = slot.commitCount;
  }

  // Find max for scaling
  const maxCommits = Math.max(...activityPattern.slots.map(s => s.commitCount));

  // Create table
  const table = new Table({
    head: ['Hour', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    colAligns: ['right', 'center', 'center', 'center', 'center', 'center', 'center', 'center'],
    chars: {
      mid: '',
      'left-mid': '',
      'mid-mid': '',
      'right-mid': '',
    },
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Add header row
  const header = ['Hour', ...dayNames];
  const rows: (string | number)[][] = [];

  for (let hour = 0; hour < 24; hour += 3) {
    const row: (string | number)[] = [`${hour.toString().padStart(2, '0')}:00`];

    for (let day = 0; day < 7; day++) {
      let count = 0;
      for (let h = hour; h < hour + 3 && h < 24; h++) {
        count += grid[h][day];
      }

      if (count === 0) {
        row.push(chalk.gray('·'));
      } else {
        const intensity = count / maxCommits;
        if (intensity > 0.66) {
          row.push(chalk.bold('██'));
        } else if (intensity > 0.33) {
          row.push('█');
        } else {
          row.push(chalk.gray('░'));
        }
      }
    }

    rows.push(row);
  }

  // Manually build output
  lines.push(`\n  ${header.join('  ')}`);
  lines.push(chalk.gray('  ' + '─'.repeat(55)));

  for (const row of rows) {
    lines.push(`  ${row.join('  ')}`);
  }

  if (activityPattern.peak) {
    lines.push(
      `\n  Peak: ${chalk.bold(getDayName(activityPattern.peak.day))} ${activityPattern.peak.hour.toString().padStart(2, '0')}:00 (${activityPattern.peak.commitCount} commits)`
    );
  }

  return lines.join('\n');
}

/**
 * Format complete reflect output
 */
export function formatReflect(output: ReflectOutput, days: number): string {
  const lines: string[] = [];

  lines.push(formatRepoSummary(output.summary, days));
  lines.push(formatFileChurn(output.topChurnFiles, 5));
  lines.push(formatInsights(output.insights));

  return lines.join('\n');
}

/**
 * Format churn table
 */
export function formatChurnTable(files: FileChurn[], days: number): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`\nFile Churn Analysis (${formatDateRange(days)})\n`));

  if (files.length === 0) {
    lines.push(chalk.gray('No file changes found.'));
    return lines.join('\n');
  }

  const table = new Table({
    head: ['File', 'Commits', 'Bugfix', 'Status'],
    colAligns: ['left', 'right', 'right', 'center'],
    style: {
      head: [],
      border: ['gray'],
    },
  });

  for (const file of files) {
    table.push([
      file.path.length > 30 ? file.path.substring(0, 27) + '...' : file.path,
      file.commitCount.toString(),
      file.bugfixCount.toString(),
      `${getChurnEmoji(file.churnLevel)} ${getChurnLabel(file.churnLevel)}`,
    ]);
  }

  lines.push(table.toString());

  return lines.join('\n');
}

/**
 * Format data as JSON
 */
export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
