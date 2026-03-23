import { createGitParser } from '../core/git-parser.js';
import { calculateFileOwnership } from '../core/metrics.js';
import { formatBlameMap, formatJSON } from '../core/formatters.js';
import { BlameMapOptions } from '../types.js';

/**
 * Execute the blame-map command
 */
export async function blameMapCommand(options: BlameMapOptions): Promise<void> {
  try {
    // Parse git history
    const gitParser = await createGitParser();

    // Calculate the date range (only if days is specified)
    const since = options.days ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) : undefined;

    // Get commits (optionally filtering ignored files)
    const respectIgnores = !options.noIgnore;
    const commits = await gitParser.getFilteredCommits(since, options.currentBranch, respectIgnores);

    if (commits.length === 0) {
      const timeRange = options.days ? `in the last ${options.days} days` : 'in this repository';
      console.log(`No commits found ${timeRange}.`);
      return;
    }

    // Calculate file ownership
    const ownerships = calculateFileOwnership(commits);

    // Filter by specific file(s) if requested
    let filteredOwnerships = ownerships;
    if (options.file) {
      const filePaths = options.file.split(',').map(f => f.trim());
      filteredOwnerships = ownerships.filter(o =>
        filePaths.some(fp => o.path === fp || o.path.endsWith('/' + fp))
      );
      if (filteredOwnerships.length === 0) {
        console.log(`No ownership data found for file(s): ${options.file}`);
        return;
      }
    }

    // Format and display
    if (options.json) {
      console.log(formatJSON(filteredOwnerships));
    } else {
      console.log(formatBlameMap(filteredOwnerships, options.days));
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
