import { createGitParser } from '../core/git-parser.js';
import { calculateFileRisk } from '../core/metrics.js';
import { formatScars, formatJSON } from '../core/formatters.js';
import { LimitedOptions } from '../types.js';

/**
 * Execute the scars command
 */
export async function scarsCommand(options: LimitedOptions): Promise<void> {
  try {
    // Parse git history
    const gitParser = await createGitParser();

    // Calculate the date range (only if days is specified)
    const since = options.days ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) : undefined;

    // Get commits
    const commits = await gitParser.getCommits(since, options.currentBranch);

    if (commits.length === 0) {
      const timeRange = options.days ? `in the last ${options.days} days` : 'in this repository';
      console.log(`No commits found ${timeRange}.`);
      return;
    }

    // Calculate file risk
    const risks = calculateFileRisk(commits);

    // Apply limit if specified
    const limit = options.limit ?? risks.length;
    const displayRisks = risks.slice(0, limit);

    // Format and display
    if (options.json) {
      console.log(formatJSON(displayRisks));
    } else {
      console.log(formatScars(displayRisks, options.days));
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
