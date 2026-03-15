import { createGitParser } from '../core/git-parser.js';
import { calculateFileChurn } from '../core/metrics.js';
import { formatChurnTable, formatJSON } from '../core/formatters.js';
import { ChurnOptions } from '../types.js';

/**
 * Execute the churn command
 */
export async function churnCommand(options: ChurnOptions): Promise<void> {
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

    // Calculate file churn
    const fileChurns = calculateFileChurn(commits);

    // Apply limit if specified
    const limit = options.limit ?? fileChurns.length;
    const displayFiles = fileChurns.slice(0, limit);

    // Format and display
    if (options.json) {
      console.log(formatJSON(displayFiles));
    } else {
      console.log(formatChurnTable(displayFiles, options.days));
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
