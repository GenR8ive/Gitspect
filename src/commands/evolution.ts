import { BaseOptions } from '../types.js';
import { createGitParser } from '../core/git-parser.js';
import { calculateEvolution } from '../core/metrics.js';
import { formatEvolution } from '../core/formatters.js';

export interface EvolutionOptions extends BaseOptions {
  granularity?: 'week' | 'month';
}

export async function evolution(options: EvolutionOptions = {}): Promise<void> {
  try {
    const parser = await createGitParser();

    // Calculate the date range (only if days is specified)
    const since = options.days ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) : undefined;

    // Get commits (optionally filtering ignored files)
    const respectIgnores = !options.noIgnore;
    const commits = await parser.getFilteredCommits(since, options.currentBranch, respectIgnores);

    if (commits.length === 0) {
      console.log('No commits found in the repository.');
      return;
    }

    // Calculate date range
    const startDate = commits[commits.length - 1].date;
    const endDate = commits[0].date;

    // Default granularity based on timeframe
    let granularity = options.granularity || 'week';
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (!options.granularity && daysDiff > 180) {
      granularity = 'month';
    }

    // Calculate evolution
    const result = calculateEvolution(commits, startDate, endDate, granularity);

    // Output
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatEvolution(result));
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
