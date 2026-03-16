import { BaseOptions } from '../types.js';
import { createGitParser } from '../core/git-parser.js';
import { calculateContext } from '../core/metrics.js';
import { formatContext } from '../core/formatters.js';

export async function context(options: BaseOptions = {}): Promise<void> {
  try {
    const parser = await createGitParser();

    // Calculate the date range (only if days is specified)
    const since = options.days ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) : undefined;

    // Get commits
    const commits = await parser.getCommits(since, options.currentBranch);

    if (commits.length === 0) {
      console.log('No commits found in the repository.');
      return;
    }

    // Calculate date range
    const startDate = commits[commits.length - 1].date;
    const endDate = commits[0].date;

    // Calculate AI context
    const aiContext = calculateContext(commits, startDate, endDate);

    // Output
    if (options.json) {
      console.log(JSON.stringify(aiContext, null, 2));
    } else {
      console.log(formatContext(aiContext));
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
