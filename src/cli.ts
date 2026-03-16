#!/usr/bin/env node

import { Command } from 'commander';
import { reflectCommand } from './commands/reflect.js';
import { churnCommand } from './commands/churn.js';
import { heatmapCommand } from './commands/heatmap.js';
import { blameMapCommand } from './commands/blame-map.js';
import { scarsCommand } from './commands/scars.js';
import { couplesCommand } from './commands/couples.js';
import { report as reportCommand } from './commands/report.js';
import { blockers as blockersCommand } from './commands/blockers.js';
import { evolution as evolutionCommand } from './commands/evolution.js';
import { context as contextCommand } from './commands/context.js';

const program = new Command();

program
  .name('gitspect')
  .description('AI-powered insights from your Git history')
  .version('0.1.0');

program
  .command('reflect')
  .description('Personal retrospective - analyze your recent development activity')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await reflectCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('churn')
  .description('File churn detection - identify frequently modified files')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--limit <number>', 'Maximum number of files to display')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    await churnCommand({ days, limit, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('heatmap')
  .description('Activity heatmap - visualize when you code most')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await heatmapCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('blame-map')
  .description('File ownership mapping - see who owns which files')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await blameMapCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('scars')
  .description('Riskiest files to modify - high-churn, bug-prone areas')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--limit <number>', 'Maximum number of files to display')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    await scarsCommand({ days, limit, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('couples')
  .description('Files changed together - discover hidden dependencies')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--limit <number>', 'Maximum number of file pairs to display')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    await couplesCommand({ days, limit, currentBranch: options.currentBranch, json: options.json });
  });

// Phase 3: Project Management Narratives
program
  .command('report')
  .description('Project health report - metrics, concerns, and positive signals')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await reportCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('blockers')
  .description('What\'s slowing progress - identify hotspots, instability, complexity')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await blockersCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program
  .command('evolution')
  .description('Codebase evolution over time - trends and growth patterns')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--granularity <week|month>', 'Time granularity (default: auto)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await evolutionCommand({ days, currentBranch: options.currentBranch, json: options.json, granularity: options.granularity });
  });

// AI Context: Comprehensive repo overview for AI assistants
program
  .command('context')
  .description('AI context - comprehensive repo overview for AI assistants')
  .option('--days <number>', 'Time period in days (default: all time)')
  .option('--current-branch', 'Only analyze the current branch (default: all branches)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = options.days ? parseInt(options.days, 10) : undefined;
    await contextCommand({ days, currentBranch: options.currentBranch, json: options.json });
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exit(1);
});
