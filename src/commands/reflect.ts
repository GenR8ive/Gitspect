import { createGitParser } from '../core/git-parser.js';
import { calculateFileChurn, calculateRepoSummary, calculateActivityPattern, generateInsights } from '../core/metrics.js';
import { formatReflect, formatJSON } from '../core/formatters.js';
import { ReflectOutput, BaseOptions } from '../types.js';

/**
 * Execute the reflect command
 */
export async function reflectCommand(options: BaseOptions): Promise<void> {
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

    // Calculate metrics
    const fileChurns = calculateFileChurn(commits);
    const repoSummary = calculateRepoSummary(commits);
    const activityPattern = calculateActivityPattern(commits);
    const insights = generateInsights(fileChurns, activityPattern);

    // Build output
    const output: ReflectOutput = {
      summary: repoSummary,
      topChurnFiles: fileChurns.slice(0, 10),
      activityPattern,
      insights,
    };

    // Format and display
    if (options.json) {
      console.log(formatJSON(output));
    } else {
      console.log(formatReflect(output, options.days));
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
