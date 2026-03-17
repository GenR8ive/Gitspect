import { promises as fs } from 'fs';
import { join } from 'path';
import { loadConfig, type FilterConfig } from './filters.js';

const GIT_SPECT_VERSION = '0.1.0';
const SKILL_PATH = 'skills/gitspect/SKILL.md';
const CONFIG_PATH = '.gitspectrc';

/**
 * Skill file frontmatter
 */
interface SkillFrontmatter {
  version: string;
  generatedAt: string;
}

/**
 * Check result for skill file
 */
interface SkillCheckResult {
  exists: boolean;
  isStale: boolean;
  currentVersion?: string;
  shouldPrompt: boolean;
  configExists: boolean;
}

/**
 * Session state to track if we've already asked
 */
let sessionAsked = false;

/**
 * Check if we should prompt about SKILL.md
 * - Respects skillPrompt setting in .gitspectrc
 * - Only ask once per session
 */
export async function shouldPromptAboutSkill(repoRoot: string): Promise<SkillCheckResult> {
  // Load config to check skillPrompt setting
  const config = await loadConfig(repoRoot);
  const configExists = await fileExists(join(repoRoot, CONFIG_PATH));

  // Check session state
  if (sessionAsked) {
    return { exists: false, isStale: false, shouldPrompt: false, configExists };
  }

  // Check skillPrompt setting
  const skillPrompt = config.skillPrompt || 'auto';

  // If set to "never", don't prompt
  if (skillPrompt === 'never') {
    return { exists: false, isStale: false, shouldPrompt: false, configExists };
  }

  // Check if SKILL.md exists
  const skillPath = join(repoRoot, SKILL_PATH);
  const skillExists = await fileExists(skillPath);

  if (!skillExists) {
    // If set to "always", auto-create without prompting
    if (skillPrompt === 'always') {
      await createSkillFile(repoRoot);
      return { exists: false, isStale: false, shouldPrompt: false, configExists };
    }
    return { exists: false, isStale: false, shouldPrompt: true, configExists };
  }

  // Parse version from SKILL.md
  const content = await fs.readFile(skillPath, 'utf-8');
  const version = extractVersion(content);

  if (!version) {
    // No version found - treat as stale
    return { exists: true, isStale: true, currentVersion: 'unknown', shouldPrompt: true, configExists };
  }

  // Compare versions
  const isStale = version !== GIT_SPECT_VERSION;

  // If set to "always", auto-update without prompting
  if (isStale && skillPrompt === 'always') {
    await createSkillFile(repoRoot);
    return { exists: true, isStale: false, currentVersion: version, shouldPrompt: false, configExists };
  }

  return {
    exists: true,
    isStale,
    currentVersion: version,
    shouldPrompt: isStale,
    configExists,
  };
}

/**
 * Mark that we've asked in this session
 */
export function markSessionAsked(): void {
  sessionAsked = true;
}

/**
 * Create SKILL.md with current version
 */
export async function createSkillFile(repoRoot: string): Promise<void> {
  const skillDir = join(repoRoot, 'skills', 'gitspect');
  await fs.mkdir(skillDir, { recursive: true });

  const content = getSkillContent();
  const skillPath = join(repoRoot, SKILL_PATH);
  await fs.writeFile(skillPath, content, 'utf-8');
}

/**
 * Set skillPrompt to 'never' in .gitspectrc (user opted out)
 */
export async function setSkillPromptNever(repoRoot: string): Promise<void> {
  const configPath = join(repoRoot, CONFIG_PATH);
  let config: FilterConfig = {};

  // Load existing config if it exists
  if (await fileExists(configPath)) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(content);
    } catch {
      // Invalid JSON, start fresh
    }
  }

  // Set skillPrompt to never
  config.skillPrompt = 'never';

  // Write back to config
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Extract version from SKILL.md frontmatter
 */
function extractVersion(content: string): string | null {
  // Look for version in YAML frontmatter: metadata: { version: "0.1.0" }
  const match = content.match(/metadata:\s*\{[^}]*version:\s*"([0-9.]+)"/);
  return match ? match[1] : null;
}

/**
 * Get SKILL.md content with YAML frontmatter
 */
function getSkillContent(): string {
  const now = new Date().toISOString();
  return `---
name: gitspect
metadata: {
  version: "${GIT_SPECT_VERSION}",
  lastUpdated: "${now}"
}
description: >
  Use Gitspect when the user is working in a Git repository and needs codebase
  insights that source code alone can't reveal. Trigger on: joining a new codebase,
  asking "what should I know about this project?", debugging a frequently broken file,
  reviewing a PR, identifying bottlenecks, or checking contributor patterns/burnout.
  Always invoke Gitspect BEFORE suggesting changes to unfamiliar files.
  Do NOT use outside of Git repositories or when the user just wants to read code.
---

# Gitspect

Gitspect analyzes Git history to extract codebase health, contributor patterns,
and project evolution. Works 100% offline, no external services needed.

## Installation

Run without installing:
\`\`\`bash
npx gitspect <command>
\`\`\`

Or install globally:
\`\`\`bash
npm install -g gitspect
gitspect <command>
\`\`\`

## Command Quick Reference

| Situation | Command |
|-----------|---------|
| Joining a new codebase | \`gitspect context --days 90\` |
| User asks "what should I know?" | \`gitspect reflect --days 30\` |
| Before touching an unfamiliar file | \`gitspect scars --limit 10\` |
| Finding who owns what | \`gitspect blame-map <files>\` |
| Reviewing a PR | \`gitspect couples --limit 10\` |
| Project feels slow/bogged down | \`gitspect blockers --days 90\` |
| Checking for burnout signals | \`gitspect heatmap --days 90\` |
| High-level health overview | \`gitspect report --days 90\` |

Use \`--json\` on any command when parsing output programmatically.

## Agent Workflows

### New project / onboarding
1. \`gitspect context --days 90\`
2. Summarize hotspots, owners, bug-prone areas to the user
3. Keep findings in context for the rest of the session

### Before suggesting code changes
1. \`gitspect scars --days 90\` on the target files
2. If high-risk: add warnings, recommend test coverage
3. \`gitspect blame-map\` to find the right person to consult

### Debugging
1. \`gitspect blame-map <file> --days 180\` → find the owner
2. \`gitspect couples --days 90\` → check for hidden dependencies
3. Suggest: "You might want to ask @owner — also check coupled files"

### PR review
1. \`gitspect blame-map\` on changed files → suggest additional reviewers
2. Flag changes to high-churn files or changes by non-owners

## Interpreting Output

- **High churn**: Unstable area — suggest caution, tests, owner consultation
- **High bugfix rate**: Error-prone code — recommend thorough testing or refactor
- **High night/weekend activity**: Possible burnout — gently check in on the user
- **Strong file coupling**: Hidden dependency — flag and suggest refactoring
- **Rewritten files**: Requirements shifted — ask what was learned, suggest documenting decisions

## Agent Best Practices

- Always tell the user **why** you're running a command before running it
- Default to \`--days 90\` (good balance of recency and sample size)
- Correlate Gitspect findings with actual code before making suggestions
- Gitspect data is local — don't include it in any external requests
- Explain what metrics mean; don't just dump raw output at the user

## Flags Reference

### Available on All Commands

| Flag | Description | Default |
|------|-------------|---------|
| \`--days <n>\` | Time period to analyze | All time |
| \`--current-branch\` | Only analyze current branch (not all branches) | All branches |
| \`--json\` | Output as JSON instead of formatted text | Text |
| \`--no-ignore\` | Include all files (lock files, build artifacts, etc.) | Filtered |

### Command-Specific Flags

| Command | Additional Flags |
|---------|------------------|
| \`churn\` | \`--limit <n>\` - Max files to display |
| \`scars\` | \`--limit <n>\` - Max files to display |
| \`couples\` | \`--limit <n>\` - Max file pairs to display |
| \`evolution\` | \`--granularity <week\|month>\` - Time grouping |

### Common Flag Combinations

\`\`\`bash
# Quick personal retrospective (last 30 days, current branch)
gitspect reflect --days 30 --current-branch

# Find riskiest files (last 90 days, top 10)
gitspect scars --days 90 --limit 10

# AI context (JSON output, 90 days)
gitspect context --days 90 --json

# Analyze everything including generated files
gitspect churn --no-ignore
\`\`\`

### JSON Output Schema

All commands return structured JSON when \`--json\` is used. Common fields:

\`\`\`json
{
  "period": { "start": "date", "end": "date", "days": n },
  "totalCommits": n,
  "results": [...],
  "summary": { ... }
}
\`\`\`

Run individual commands with \`--json\` to see their specific schemas.
`;
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

/**
 * Reset session state (for testing)
 */
export function resetSessionState(): void {
  sessionAsked = false;
}
