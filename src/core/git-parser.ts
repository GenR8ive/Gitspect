import simpleGit, { SimpleGit } from 'simple-git';
import { Commit } from '../types.js';
import { loadConfig, filterCommits, type FilterConfig } from './filters.js';

/**
 * Git parser for extracting commit history and analyzing repository data
 */
export class GitParser {
  private git: SimpleGit;
  private repoRoot: string;
  private filterConfig: FilterConfig = {};

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
    this.repoRoot = repoPath;
  }

  /**
   * Load filter configuration from .gitspectrc
   */
  async loadFilterConfig(): Promise<void> {
    this.filterConfig = await loadConfig(this.repoRoot);
  }

  /**
   * Get all commits since a specific date (or all commits if since is undefined)
   */
  async getCommits(since?: Date, currentBranchOnly = false): Promise<Commit[]> {
    return this.getFilteredCommits(since, currentBranchOnly, true);
  }

  /**
   * Get commits with optional filtering
   * @param since - Start date for commits
   * @param currentBranchOnly - Only analyze current branch
   * @param respectIgnores - If false, include all files (use --no-ignore)
   */
  async getFilteredCommits(since?: Date, currentBranchOnly = false, respectIgnores: boolean = true): Promise<Commit[]> {
    const options: Record<string, unknown> = {
      // Custom format: hash|author|date|message (pipe-delimited for easy parsing)
      '--format': '%H|%an|%ai|%s',
    };

    // Only add --since filter if a date is provided
    if (since) {
      options['--since'] = since.toISOString();
    }

    // Include all branches by default, unless current branch only is requested
    if (!currentBranchOnly) {
      options['--all'] = true;
    }

    // Get raw log output with stat information in a single call
    const rawLog = await this.git.raw([
      'log',
      options['--since'] ? `--since=${options['--since']}` : null,
      !currentBranchOnly ? '--all' : null,
      '--format=%H|%an|%ai|%s',
      '--stat',
      '--stat-width=200',
      '--stat-name-width=150',
    ].filter(Boolean) as string[]);

    // Parse the combined log output
    const commits = this.parseLogWithStat(rawLog);

    // Apply file filtering if requested
    if (respectIgnores) {
      return filterCommits(commits, this.filterConfig, respectIgnores);
    }

    return commits;
  }

  /**
   * Get commits for a specific file
   */
  async getFileHistory(filePath: string, since: Date): Promise<Commit[]> {
    const log = await this.git.log({
      '--since': since.toISOString(),
      '--': filePath,
    });

    const commits: Commit[] = [];
    for (const entry of log.all) {
      commits.push({
        hash: entry.hash,
        author: entry.author_name,
        date: new Date(entry.date),
        message: entry.message,
        files: [filePath],
        insertions: 0,
        deletions: 0,
      });
    }

    return commits;
  }

  /**
   * Check if the current directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the repository root path
   */
  async getRepoRoot(): Promise<string> {
    const root = await this.git.revparse(['--show-toplevel']);
    return root.trim();
  }

  /**
   * Parse file paths from git show --stat output
   */
  private parseFilesFromStat(statOutput: string): string[] {
    const files: string[] = [];
    const lines = statOutput.split('\n');

    for (const line of lines) {
      // Match lines like " src/file.ts | 10 +--"
      const match = line.match(/^\s+(.+?)\s+\|/);
      if (match) {
        files.push(match[1].trim());
      }
    }

    return files;
  }

  /**
   * Parse insertions and deletions from git show --stat output
   */
  private parseLineChanges(statOutput: string): { insertions: number; deletions: number } {
    let insertions = 0;
    let deletions = 0;

    // Look for summary line like " 5 files changed, 100 insertions(+), 50 deletions(-)"
    const summaryMatch = statOutput.match(/(\d+) insertion[^,]*(?:, (\d+) deletion)?/);
    if (summaryMatch) {
      insertions = parseInt(summaryMatch[1], 10) || 0;
      deletions = parseInt(summaryMatch[2] || '0', 10);
    }

    // Alternative: parse individual file stats
    if (insertions === 0 && deletions === 0) {
      const lines = statOutput.split('\n');
      for (const line of lines) {
        const fileMatch = line.match(/\| (\d+) ([-+]+)/);
        if (fileMatch) {
          const changes = fileMatch[2];
          insertions += (changes.match(/\+/g) || []).length;
          deletions += (changes.match(/-/g) || []).length;
        }
      }
    }

    return { insertions, deletions };
  }

  /**
   * Parse combined git log output with stat information
   * Input format:
   *   hash|author|date|message
   *    src/file.ts | 10 +---
   *    1 file changed, 5 insertions(+), 3 deletions(-)
   *   (blank line)
   *   hash|author|date|message
   *   ...
   */
  private parseLogWithStat(rawLog: string): Commit[] {
    const commits: Commit[] = [];
    const lines = rawLog.split('\n');

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();

      // Skip empty lines and stat summary separators
      if (!line || line.startsWith('|') || line.match(/^\d+\s+file/)) {
        i++;
        continue;
      }

      // Parse commit header (pipe-delimited)
      const headerMatch = line.match(/^([a-f0-9]+)\|(.+)\|(.+)\|(.+)$/);
      if (headerMatch) {
        const [, hash, author, dateStr, ...messageParts] = headerMatch;
        const message = messageParts.join('|').trim();

        // Collect stat lines until next commit header or end
        const statLines: string[] = [];
        i++;
        while (i < lines.length) {
          const statLine = lines[i];
          // Stop at next commit header (starts with hash)
          if (statLine.match(/^[a-f0-9]+\|/)) {
            break;
          }
          // Include stat lines and summary lines
          if (statLine.trim() && !statLine.match(/^commit\s+[a-f0-9]+/)) {
            statLines.push(statLine);
          }
          i++;
        }

        const statOutput = statLines.join('\n');
        const files = this.parseFilesFromStat(statOutput);
        const { insertions, deletions } = this.parseLineChanges(statOutput);

        commits.push({
          hash,
          author,
          date: new Date(dateStr),
          message,
          files,
          insertions,
          deletions,
        });

        // Don't increment i here - we're already at the right position
      } else {
        i++;
      }
    }

    return commits;
  }
}

/**
 * Create a git parser instance for the current directory
 */
export async function createGitParser(repoPath?: string): Promise<GitParser> {
  const parser = new GitParser(repoPath);
  const isRepo = await parser.isGitRepo();

  if (!isRepo) {
    throw new Error('Not a git repository. Please run gitspect from within a git repository.');
  }

  // Load filter configuration from .gitspectrc
  await parser.loadFilterConfig();

  return parser;
}
