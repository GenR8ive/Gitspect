#!/usr/bin/env node

import { Command } from 'commander';
import { reflectCommand } from './commands/reflect.js';
import { churnCommand } from './commands/churn.js';
import { heatmapCommand } from './commands/heatmap.js';

const program = new Command();

program
  .name('gitspect')
  .description('AI-powered insights from your Git history')
  .version('0.1.0');

program
  .command('reflect')
  .description('Personal retrospective - analyze your recent development activity')
  .option('--days <number>', 'Time period in days', '30')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = parseInt(options.days, 10);
    await reflectCommand({ days, json: options.json });
  });

program
  .command('churn')
  .description('File churn detection - identify frequently modified files')
  .option('--days <number>', 'Time period in days', '30')
  .option('--limit <number>', 'Maximum number of files to display')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = parseInt(options.days, 10);
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    await churnCommand({ days, limit, json: options.json });
  });

program
  .command('heatmap')
  .description('Activity heatmap - visualize when you code most')
  .option('--days <number>', 'Time period in days', '30')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const days = parseInt(options.days, 10);
    await heatmapCommand({ days, json: options.json });
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exit(1);
});
