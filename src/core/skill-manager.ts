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
  // Look for gitspect-version in metadata: gitspect-version: 0.1.0
  const match = content.match(/gitspect-version:\s*([0-9.]+)/);
  return match ? match[1] : null;
}

/**
 * Get SKILL.md content with YAML frontmatter
 */
function getSkillContent(): string {
  return `---
name: gitspect
metadata:
  gitspect-version: ${GIT_SPECT_VERSION}
description: >
  Use this skill whenever the user is working in a Git repository and needs
  codebase context before making changes. Trigger on: "why did we do this?",
  "what changed here?", "who owns this?", "is this file risky to touch?",
  preparing a commit message, writing a PR description, reviewing a PR,
  debugging a frequently broken file, or any "what should I know before
  changing X?" question. Also trigger when the user asks about contributor
  patterns, team burnout, or project health. Always invoke BEFORE suggesting
  changes to unfamiliar files. Run only the one or two commands that answer
  the specific question — never run all commands.
---

# Gitspect

Analyzes Git history to surface codebase health, ownership, change patterns,
and project evolution — without reading all the source code. Token-efficient
because it returns pre-structured summaries instead of raw \`git log\` streams.

## When to run which command

Pick the **minimum** set of commands that answers the user's question.

| User intent | Command to run |
|---|---|
| "Why did we change this file / do this?" | \`gitspect reflect --days 90\` |
| "Is it safe to touch this file?" | \`gitspect scars --limit 10\` |
| "Who should I talk to about X?" | \`gitspect blame-map <file>\` |
| "What files change together with this one?" | \`gitspect couples --limit 10\` |
| Writing a commit message | \`gitspect reflect --days 30 --current-branch\` |
| Writing a PR description | \`gitspect couples --limit 10\` + \`gitspect blame-map <changed files>\` |
| Reviewing someone else's PR | \`gitspect scars\` on changed files + \`gitspect blame-map\` for reviewers |
| "What's the health of this project?" | \`gitspect report --days 90\` |
| Burnout / contributor check | \`gitspect heatmap --days 90\` |
| General onboarding / "what should I know?" | \`gitspect context --days 90\` |

**Default to \`--days 90\`** — good signal-to-noise for most repos.
Use \`--json\` when you need to parse the output programmatically.

## Running commands

\`\`\`bash
# No install needed
npx gitspect <command> [flags]

# Or if globally installed
gitspect <command> [flags]
\`\`\`

## How to interpret output and what to do with it

- **High churn**: Unstable area — warn the user, recommend tests, suggest consulting the owner.
- **High bugfix rate**: Error-prone code — flag risk before suggesting edits.
- **Strong file coupling** (\`couples\`): Hidden dependency — mention it and suggest the user check those coupled files too.
- **Night/weekend commits** (\`heatmap\`): Possible burnout — mention it gently if relevant.
- **Owner identified** (\`blame-map\`): Suggest the user loop them in.

## Commit message workflow

When the user wants to commit or needs a summary of recent changes:

1. Run \`gitspect reflect --days 30 --current-branch\`
2. Use the output to write a meaningful commit message that reflects *why* the changes happened, not just *what* changed.
3. If the changed files show high churn or bugs in \`scars\`, note that in the PR description.

## PR description workflow

1. Run \`gitspect blame-map <changed files>\` → suggest reviewers
2. Run \`gitspect couples --limit 10\` → flag any coupled files not in the PR
3. Draft the PR description using the context from both commands

## Key flags

| Flag | Use when |
|---|---|
| \`--days <n>\` | Scoping the time window (default: all time — prefer \`--days 90\`) |
| \`--current-branch\` | User is asking about their own branch specifically |
| \`--limit <n>\` | Reducing output for \`churn\`, \`scars\`, \`couples\` |
| \`--json\` | You need to process output in code |
| \`--no-ignore\` | User specifically wants lock files / build artifacts included |

## Important: don't over-run

Run **only what's needed**. One targeted command is almost always enough.
Only combine two commands if the user's question genuinely requires both perspectives
(e.g., PR review needs both \`blame-map\` for reviewers AND \`couples\` for hidden deps).
Never run \`context\`, \`reflect\`, \`scars\`, \`couples\`, \`heatmap\`, and \`report\` all at once.
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
