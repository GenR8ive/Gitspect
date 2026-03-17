import * as readline from 'readline';
import { shouldPromptAboutSkill, createSkillFile, setSkillPromptNever, markSessionAsked, resetSessionState } from './skill-manager.js';

/**
 * Prompt user for yes/no input
 */
async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()) || answer.trim() === '');
    });
  });
}

/**
 * Wrap a command execution with skill file checking
 * This ensures users are prompted about SKILL.md in a respectful, offline-first way
 */
export async function withSkillCheck(
  repoRoot: string,
  command: (options: any) => Promise<void>,
  options: any
): Promise<void> {
  // Check if we should prompt
  const check = await shouldPromptAboutSkill(repoRoot);

  if (!check.shouldPrompt) {
    // No prompt needed, run command directly
    await command(options);
    return;
  }

  // Mark that we've asked this session
  markSessionAsked();

  // Show appropriate prompt
  if (!check.exists) {
    console.log('\x1b[90m%s\x1b[0m', 'ℹ  No SKILL.md found. Create it so AI agents can use Gitspect automatically? [Y/n]');

    const answer = await promptUser('');

    if (answer) {
      await createSkillFile(repoRoot);
      console.log('  ✓ Created skills/gitspect/SKILL.md\n');
    } else {
      // Set skillPrompt to never so we don't ask again
      await setSkillPromptNever(repoRoot);
      console.log('  ✗ Skipped. Added "skillPrompt": "never" to .gitspectrc\n');
    }
  } else if (check.isStale) {
    console.log(
      `\x1b[33m%s\x1b[0m`,
      `⚠  skills/gitspect/SKILL.md is outdated (v${check.currentVersion} → v0.1.0)\n   Update it? [Y/n]`
    );

    const answer = await promptUser('');

    if (answer) {
      await createSkillFile(repoRoot);
      console.log('  ✓ Updated skills/gitspect/SKILL.md\n');
    } else {
      console.log('  ✗ Skipped. Update it later with \`gitspect init\`\n');
    }
  }

  // Run the actual command
  await command(options);
}

/**
 * Reset session state (for testing)
 */
export { resetSessionState };
