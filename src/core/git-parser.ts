import simpleGit, { SimpleGit } from 'simple-git';
import { Commit } from '../types.js';

/**
 * Git parser for extracting commit history and analyzing repository data
 */
export class GitParser {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Get all commits since a specific date
   */
  async getCommits(since: Date): Promise<Commit[]> {
    const sinceDate = since.toISOString();
    const log = await this.git.log({
      from: sinceDate,
      strictDate: true,
    });

    // Get detailed stats for each commit
    const commits: Commit[] = [];
    for (const entry of log.all) {
      const diff = await this.git.show([entry.hash, '--stat', '--format=']);

      // Parse files and line changes from stat output
      const files = this.parseFilesFromStat(diff);
      const { insertions, deletions } = this.parseLineChanges(diff);

      commits.push({
        hash: entry.hash,
        author: entry.author_name,
        date: new Date(entry.date),
        message: entry.message,
        files,
        insertions,
        deletions,
      });
    }

    return commits;
  }

  /**
   * Get commits for a specific file
   */
  async getFileHistory(filePath: string, since: Date): Promise<Commit[]> {
    const sinceDate = since.toISOString();
    const log = await this.git.log({
      from: sinceDate,
      file: filePath,
      strictDate: true,
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

  return parser;
}
