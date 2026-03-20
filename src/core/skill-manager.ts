import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, type FilterConfig } from './filters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GIT_SPECT_VERSION = '0.1.0';
const CONFIG_PATH = '.gitspectrc';

/**
 * Agent configuration
 */
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  default?: boolean;
}

/**
 * Built-in agents configuration
 */
const BUILT_IN_AGENTS: AgentConfig[] = [
  {
    id: 'default',
    name: 'Default (.agents)',
    description: 'Standard agents folder (recommended)',
    path: '.agents/skills/gitspect/SKILL.md',
    default: true,
  },
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Claude Code desktop app',
    path: '.claude/skills/gitspect/SKILL.md',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    description: 'OpenCode AI editor',
    path: '.opencode/skills/gitspect/SKILL.md',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Windsurf IDE (Cascade)',
    path: '.windsurf/skills/gitspect/SKILL.md',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor AI IDE',
    path: '.cursor/skills/gitspect/SKILL.md',
  },
  {
    id: 'github',
    name: 'GitHub Copilot / VS Code',
    description: 'GitHub skills (new standard)',
    path: '.github/skills/gitspect/SKILL.md',
  },
];

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
  missingAgents: string[];
}

/**
 * Session state to track if we've already asked
 */
let sessionAsked = false;

/**
 * Get all available agents
 */
export async function getAllAgents(): Promise<AgentConfig[]> {
  return BUILT_IN_AGENTS;
}

/**
 * Get agents that have SKILL.md files already created
 */
export async function getEnabledAgents(repoRoot: string): Promise<AgentConfig[]> {
  const enabled: AgentConfig[] = [];

  for (const agent of BUILT_IN_AGENTS) {
    const skillPath = join(repoRoot, agent.path);
    if (await fileExists(skillPath)) {
      enabled.push(agent);
    }
  }

  // If no agents have SKILL.md, return default agent
  return enabled.length > 0 ? enabled : BUILT_IN_AGENTS.filter(a => a.default);
}

/**
 * Get agents that should be created (for init command)
 */
export async function getAgentsToCreate(repoRoot: string, selectedIds: string[]): Promise<AgentConfig[]> {
  if (selectedIds.length === 0) {
    // Default to default agent
    return BUILT_IN_AGENTS.filter(a => a.default);
  }
  return BUILT_IN_AGENTS.filter(a => selectedIds.includes(a.id));
}

/**
 * Check if we should prompt about SKILL.md
 * - Respects skillPrompt setting in .gitspectrc
 * - Only ask once per session
 * - Checks all agent locations
 */
export async function shouldPromptAboutSkill(repoRoot: string): Promise<SkillCheckResult> {
  // Load config to check skillPrompt setting
  const config = await loadConfig(repoRoot);
  const configExists = await fileExists(join(repoRoot, CONFIG_PATH));

  // Check session state
  if (sessionAsked) {
    return { exists: false, isStale: false, shouldPrompt: false, configExists, missingAgents: [] };
  }

  // Check skillPrompt setting
  const skillPrompt = config.skillPrompt || 'auto';

  // If set to "never", don't prompt
  if (skillPrompt === 'never') {
    return { exists: false, isStale: false, shouldPrompt: false, configExists, missingAgents: [] };
  }

  // Get all agents to check (not just enabled ones)
  const agentsToCheck = BUILT_IN_AGENTS;
  const missingAgents: string[] = [];
  let anyExists = false;
  let anyIsStale = false;
  let staleVersion: string | undefined;

  // Check each agent location
  for (const agent of agentsToCheck) {
    const skillPath = join(repoRoot, agent.path);
    const skillExists = await fileExists(skillPath);

    if (!skillExists) {
      continue;
    }

    anyExists = true;

    // Parse version from SKILL.md
    const content = await fs.readFile(skillPath, 'utf-8');
    const version = extractVersion(content);

    if (!version) {
      anyIsStale = true;
      staleVersion = 'unknown';
      break;
    }

    // Compare versions
    if (version !== GIT_SPECT_VERSION) {
      anyIsStale = true;
      staleVersion = version;
    }
  }

  // If no skill files exist
  if (!anyExists) {
    // If set to "always", auto-create without prompting
    if (skillPrompt === 'always') {
      await createDefaultSkillFile(repoRoot);
      return { exists: false, isStale: false, shouldPrompt: false, configExists, missingAgents: [] };
    }
    return { exists: false, isStale: false, shouldPrompt: true, configExists, missingAgents: [] };
  }

  // If any files are stale
  if (anyIsStale) {
    // If set to "always", auto-update without prompting
    if (skillPrompt === 'always') {
      await updateExistingSkillFiles(repoRoot);
      return { exists: true, isStale: false, currentVersion: staleVersion, shouldPrompt: false, configExists, missingAgents: [] };
    }
    return { exists: true, isStale: true, currentVersion: staleVersion, shouldPrompt: true, configExists, missingAgents: [] };
  }

  return {
    exists: true,
    isStale: false,
    currentVersion: GIT_SPECT_VERSION,
    shouldPrompt: false,
    configExists,
    missingAgents,
  };
}

/**
 * Mark that we've asked in this session
 */
export function markSessionAsked(): void {
  sessionAsked = true;
}

/**
 * Create SKILL.md files for specified agents
 */
export async function createSkillFiles(repoRoot: string, agentIds: string[]): Promise<string[]> {
  const agents = await getAgentsToCreate(repoRoot, agentIds);
  const content = getSkillContent();
  const createdPaths: string[] = [];

  for (const agent of agents) {
    const skillPath = join(repoRoot, agent.path);
    const skillDir = dirname(skillPath);

    // Create directory if it doesn't exist
    await fs.mkdir(skillDir, { recursive: true });

    // Write SKILL.md
    await fs.writeFile(skillPath, content, 'utf-8');
    createdPaths.push(skillPath);
  }

  return createdPaths;
}

/**
 * Create SKILL.md for default agent only
 */
export async function createDefaultSkillFile(repoRoot: string): Promise<void> {
  const defaultAgent = BUILT_IN_AGENTS.find(a => a.default);
  if (!defaultAgent) return;

  const skillPath = join(repoRoot, defaultAgent.path);
  const skillDir = dirname(skillPath);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(skillPath, getSkillContent(), 'utf-8');
}

/**
 * Update existing SKILL.md files
 */
export async function updateExistingSkillFiles(repoRoot: string): Promise<void> {
  const enabledAgents = await getEnabledAgents(repoRoot);
  const content = getSkillContent();

  for (const agent of enabledAgents) {
    const skillPath = join(repoRoot, agent.path);
    await fs.writeFile(skillPath, content, 'utf-8');
  }
}

/**
 * Create a single SKILL.md file (backward compatibility)
 */
export async function createSkillFile(repoRoot: string): Promise<void> {
  await createDefaultSkillFile(repoRoot);
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
