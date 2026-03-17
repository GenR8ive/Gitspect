import { promises as fs } from 'fs';
import { join } from 'path';
import { createSkillFile } from '../core/skill-manager.js';

/**
 * Execute the init command - set up Gitspect for a new project
 */
export async function initCommand(): Promise<void> {
  try {
    const repoRoot = process.cwd();

    // Check if already initialized
    const configPath = join(repoRoot, '.gitspectrc');
    const skillPath = join(repoRoot, 'skills/gitspect/SKILL.md');

    const configExists = await fileExists(configPath);
    const skillExists = await fileExists(skillPath);

    console.log('\x1b[36m%s\x1b[0m', '🔧 Initializing Gitspect...\n');

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
      console.log('  ✓ Created .gitspectrc');
    } else {
      console.log('  ⊙ .gitspectrc already exists, skipping');
    }

    // Create skills/gitspect/SKILL.md using skill manager
    if (!skillExists) {
      await createSkillFile(repoRoot);
      console.log('  ✓ Created skills/gitspect/SKILL.md');
    } else {
      console.log('  ⊙ skills/gitspect/SKILL.md already exists, skipping');
    }

    console.log('\n\x1b[90m%s\x1b[0m', 'Next steps:');
    console.log('  1. Edit .gitspectrc to customize:');
    console.log('     - File filtering (exclude/include patterns)');
    console.log('     - skillPrompt: auto | always | never');
    console.log('  2. Run: gitspect context');
    console.log('     Get a comprehensive overview of your repository\n');

    console.log('  AI agents using this repo will now have Gitspect context!');
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
