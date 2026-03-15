import { createGitParser } from '../core/git-parser.js';
import { calculateActivityPattern } from '../core/metrics.js';
import { formatHeatmap, formatJSON } from '../core/formatters.js';
import { BaseOptions } from '../types.js';

/**
 * Execute the heatmap command
 */
export async function heatmapCommand(options: BaseOptions): Promise<void> {
  try {
    // Parse git history
    const gitParser = await createGitParser();

    // Calculate the date range
    const since = new Date();
    since.setDate(since.getDate() - options.days);

    // Get commits
    const commits = await gitParser.getCommits(since);

    if (commits.length === 0) {
      console.log(`No commits found in the last ${options.days} days.`);
      return;
    }

    // Calculate activity pattern
    const activityPattern = calculateActivityPattern(commits);

    // Format and display
    if (options.json) {
      console.log(formatJSON(activityPattern));
    } else {
      console.log(formatHeatmap(activityPattern));
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred.');
    }
    process.exit(1);
  }
}
