import simpleGit from 'simple-git';
import chalk from 'chalk';
import { formatJSON } from '../core/formatters.js';

interface StageOptions {
  json?: boolean;
  summary?: boolean;
}

interface StagedFileInfo {
  path: string;
  status: string;
  additions?: number;
  deletions?: number;
  binary?: boolean;
  changedLines?: string[];
}

interface StageSummary {
  files: StagedFileInfo[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  fileTypes: Record<string, number>;
}

/**
 * Execute the stage command - show staged changes for AI commit message generation
 */
export async function stageCommand(options: StageOptions): Promise<void> {
  try {
    const git = simpleGit();

    // Get staged changes
    const diff = await git.diffSummary(['--cached']);

    if (diff.files.length === 0) {
      console.log('No staged changes found.');
      return;
    }

    // Get detailed diff for line counts and content
    const diffText = await git.diff(['--cached', '--numstat']);
    const diffContent = await git.diff(['--cached', '--unified=0']);

    const files: StagedFileInfo[] = [];
    const lineStats = parseNumStat(diffText);
    const fileChanges = parseDiffContent(diffContent);

    for (const file of diff.files) {
      const filePath = (file as any).file || (file as any).path;
      const stats = lineStats.get(filePath);
      files.push({
        path: filePath,
        status: 'modified',
        additions: stats?.additions,
        deletions: stats?.deletions,
        binary: stats?.binary ?? false,
        changedLines: fileChanges.get(filePath),
      });
    }

    // Calculate summary
    const totalAdditions = files.reduce((sum, f) => sum + (f.additions ?? 0), 0);
    const totalDeletions = files.reduce((sum, f) => sum + (f.deletions ?? 0), 0);
    const fileTypes: Record<string, number> = {};

    for (const file of files) {
      const ext = getExtension(file.path);
      fileTypes[ext] = (fileTypes[ext] ?? 0) + 1;
    }

    const summary: StageSummary = {
      files,
      totalFiles: files.length,
      totalAdditions,
      totalDeletions,
      fileTypes,
    };

    if (options.json && options.summary) {
      // Compact JSON summary (no changed lines - token efficient for AI)
      const jsonOutput = {
        totalFiles: summary.totalFiles,
        totalAdditions: summary.totalAdditions,
        totalDeletions: summary.totalDeletions,
        fileTypes: summary.fileTypes,
        files: summary.files.map(f => ({
          path: f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          binary: f.binary,
        })),
      };
      console.log(formatJSON(jsonOutput));
    } else if (options.json) {
      // Full JSON output (include changed lines)
      const jsonOutput = {
        files: summary.files.map(f => ({
          path: f.path,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          binary: f.binary,
          changedLines: f.changedLines,
        })),
        totalFiles: summary.totalFiles,
        totalAdditions: summary.totalAdditions,
        totalDeletions: summary.totalDeletions,
        fileTypes: summary.fileTypes,
      };
      console.log(formatJSON(jsonOutput));
    } else if (options.summary) {
      console.log(formatStageSummary(summary));
    } else {
      console.log(formatStageOutput(summary));
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

function parseNumStat(diffOutput: string): Map<string, { additions: number; deletions: number; binary?: boolean }> {
  const stats = new Map();
  const lines = diffOutput.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length >= 3) {
      const [addStr, delStr, path] = parts;

      if (addStr === '-' && delStr === '-') {
        stats.set(path, { additions: 0, deletions: 0, binary: true });
      } else {
        stats.set(path, {
          additions: parseInt(addStr, 10) || 0,
          deletions: parseInt(delStr, 10) || 0,
        });
      }
    }
  }

  return stats;
}

function parseDiffContent(diffOutput: string): Map<string, string[]> {
  const fileChanges = new Map<string, string[]>();
  const lines = diffOutput.split('\n');

  let currentFile: string | null = null;
  const changedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file header (e.g., "+++ b/src/file.ts" or "a/src/file.ts")
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$|^--- a\/(.+)$/);
    if (fileMatch) {
      // Save previous file's changes if any
      if (currentFile && changedLines.length > 0) {
        fileChanges.set(currentFile, [...changedLines]);
        changedLines.length = 0;
      }
      currentFile = fileMatch[1] || fileMatch[2];
      continue;
    }

    // Skip hunk headers (e.g., "@@ -1,3 +1,4 @@")
    if (line.match(/^@@/)) {
      continue;
    }

    // Parse added lines (starts with +) and removed lines (starts with -)
    // Skip diff metadata lines (starting with \)
    if (currentFile && (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('++') && !line.startsWith('--') && !line.startsWith('\\')) {
      // Remove the +/- prefix
      const content = line.slice(1);
      if (content.trim()) {
        changedLines.push(content);
      }
    }
  }

  // Don't forget the last file
  if (currentFile && changedLines.length > 0) {
    fileChanges.set(currentFile, [...changedLines]);
  }

  return fileChanges;
}

function getExtension(path: string): string {
  const idx = path.lastIndexOf('.');
  if (idx === -1) return '(no ext)';
  return path.slice(idx + 1);
}

function formatStageOutput(summary: StageSummary): string {
  const lines: string[] = [];

  lines.push(chalk.bold('Staged Changes (AI Commit Context)\n'));

  // Summary stats
  lines.push(chalk.gray(`${summary.totalFiles} file(s) changed, ` +
    `+${summary.totalAdditions}/-${summary.totalDeletions} lines\n`));

  // File list with changed lines
  for (const file of summary.files) {
    lines.push(chalk.cyan(file.path));

    if (file.binary) {
      lines.push(`  ${chalk.gray('binary file')}`);
    } else if (file.changedLines && file.changedLines.length > 0) {
      // Prioritize comment lines, then show all lines
      const commentLines = file.changedLines.filter(l => isCommentLine(l));
      const linesToShow = commentLines.length > 0 ? commentLines : file.changedLines;

      for (const line of linesToShow) {
        lines.push(`  ${line}`);
      }
    } else {
      const changes = chalk.green(`+${file.additions}`) + ' ' + chalk.red(`-${file.deletions}`);
      lines.push(`  ${changes}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  // Common comment patterns
  return trimmed.startsWith('//') ||
         trimmed.startsWith('#') ||
         trimmed.startsWith('/*') ||
         trimmed.startsWith('*') ||
         trimmed.startsWith('//') ||
         trimmed.startsWith('<!--') ||
         trimmed.startsWith(';');
}

function formatStageSummary(summary: StageSummary): string {
  const lines: string[] = [];

  // Ultra-compact format for AI context
  lines.push(`Staged: ${summary.totalFiles} files, +${summary.totalAdditions}/-${summary.totalDeletions} lines`);

  const types = Object.entries(summary.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `${count} ${ext}`)
    .join(', ');
  lines.push(`Types: ${types}`);

  for (const file of summary.files) {
    if (file.binary) {
      lines.push(`  ${file.path}: binary`);
    } else if (file.changedLines && file.changedLines.length > 0) {
      const commentLines = file.changedLines.filter(l => isCommentLine(l));
      const linesToShow = commentLines.length > 0 ? commentLines : file.changedLines;
      const preview = linesToShow.slice(0, 3).map(l => l.trim()).join(' | ');
      lines.push(`  ${file.path}: ${preview}${linesToShow.length > 3 ? '...' : ''}`);
    } else {
      lines.push(`  ${file.path}: +${file.additions}/-${file.deletions}`);
    }
  }

  return lines.join('\n');
}
