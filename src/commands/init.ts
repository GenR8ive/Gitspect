import { promises as fs } from 'fs';
import { join } from 'path';
import { createSkillFiles, getAllAgents } from '../core/skill-manager.js';
import prompts from 'prompts';

interface AgentChoice {
  title: string;
  description: string;
  value: string;
  selected?: boolean;
}

/**
 * Execute the init command - set up Gitspect for a new project
 */
export async function initCommand(): Promise<void> {
  try {
    const repoRoot = process.cwd();

    // Check if already initialized
    const configPath = join(repoRoot, '.gitspectrc');
    const configExists = await fileExists(configPath);

    console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════════════╗');
    console.log('\x1b[36m%s\x1b[0m', '║  🔧 Initializing Gitspect...                                  ║');
    console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════════════╝\n');

    // Create .gitspectrc if it doesn't exist
    if (!configExists) {
      const defaultConfig = `{
  "exclude": [
    "tests/fixtures/",
    "*.mock.ts",
    "docs/"
  ],
  "include": [],
  "skillPrompt": "auto"
}
`;
      await fs.writeFile(configPath, defaultConfig, 'utf-8');
      console.log('  \x1b[32m✓\x1b[0m Created .gitspectrc');
    } else {
      console.log('  \x1b[90m⊙\x1b[0m .gitspectrc already exists, skipping');
    }

    // Get all available agents
    const allAgents = await getAllAgents();

    // Check if running in interactive terminal
    if (process.stdout.isTTY) {
      console.log('\n  \x1b[36m┌─────────────────────────────────────────────────────────────┐\x1b[0m');
      console.log('  \x1b[36m│  📦 Select AI agents to install Gitspect skills for:      │\x1b[0m');
      console.log('  \x1b[36m└─────────────────────────────────────────────────────────────┘\x1b[0m');
      console.log('\n  \x1b[90m↑/↓ to navigate, Space to select/deselect, Enter to confirm\x1b[0m\n');

      // Prepare choices for prompts
      const choices: AgentChoice[] = allAgents.map(agent => ({
        title: agent.name + (agent.default ? ' \x1b[33m⭐ default\x1b[0m' : ''),
        description: `${agent.description} \x1b[90m(${agent.path})\x1b[0m`,
        value: agent.id,
        selected: agent.default || false,
      }));

      // Interactive multi-select
      const response = await prompts({
        type: 'multiselect',
        name: 'agents',
        message: 'Select agents:',
        choices,
        instructions: false,
      });

      const selectedIds = response.agents || ['default'];

      // Create SKILL.md files
      const createdPaths = await createSkillFiles(repoRoot, selectedIds);

      const selectedAgents = allAgents.filter(a => selectedIds.includes(a.id));
      console.log('\n  \x1b[32m✓\x1b[0m Created SKILL.md for:');
      for (const agent of selectedAgents) {
        console.log(`    • ${agent.name}`);
      }
    } else {
      // Non-interactive fallback
      console.log('\n  \x1b[36m┌─────────────────────────────────────────────────────────────┐\x1b[0m');
      console.log('  \x1b[36m│  📦 Available AI agents:                                   │\x1b[0m');
      console.log('  \x1b[36m└─────────────────────────────────────────────────────────────┘\x1b[0m\n');

      for (let i = 0; i < allAgents.length; i++) {
        const agent = allAgents[i];
        const defaultBadge = agent.default ? ' \x1b[33m⭐ default\x1b[0m' : '';
        console.log(`  \x1b[36m[${i + 1}]\x1b[0m ${agent.name}${defaultBadge}`);
        console.log(`      \x1b[90m${agent.description}\x1b[0m`);
        console.log(`      \x1b[90m→ ${agent.path}\x1b[0m\n`);
      }

      console.log('  \x1b[90mUsing default agent (.agents/skills/)\x1b[0m');
      await createSkillFiles(repoRoot, ['default']);
    }

    console.log('\n\x1b[90m%s\x1b[0m', '╔════════════════════════════════════════════════════════════════╗');
    console.log('\x1b[90m%s\x1b[0m', '║  Next steps:                                                ║');
    console.log('\x1b[90m%s\x1b[0m', '╚════════════════════════════════════════════════════════════════╝');
    console.log('  1. Edit \x1b[36m.gitspectrc\x1b[0m to customize:');
    console.log('     • File filtering (exclude/include patterns)');
    console.log('     • skillPrompt: auto | always | never');
    console.log('  2. Run: \x1b[36mgitspect context\x1b[0m');
    console.log('     Get a comprehensive overview of your repository\n');

    console.log('  \x1b[32m✨ AI agents using this repo will now have Gitspect context!\x1b[0m');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n\x1b[31mError:\x1b[0m ${error.message}`);
    } else {
      console.error('\n\x1b[31mAn unknown error occurred.\x1b[0m');
    }
    process.exit(1);
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
