# Gitspect

> Git history analysis that reveals what your commit messages won't tell you.

**Where you struggled.** **What keeps breaking.** **Who owns what.** **Why your project feels slow.**

Your repository remembers everything.
**Gitspect tells you what matters.**

---

## What is Gitspect?

Gitspect transforms commit data into actionable insights about:
- **Risk areas** - Files that are bug-prone, unstable, or over-engineered
- **Ownership** - Who owns which files, coupling patterns, bus factor
- **Evolution** - Growth trends, stability changes, velocity over time
- **Team patterns** - Activity heatmaps, burnout signals, collaboration health

**Privacy-first**: 100% offline analysis. No APIs, no cloud, no data leaving your machine.

**Built for AI workflows**: Auto-generates `SKILL.md` files that help AI assistants understand your repository.

---

## Installation

```bash
npm install -g gitspect
```

Or run directly with npx:

```bash
npx gitspect <command>
```

---

## Quick Start

```bash
# First-time setup (creates config and AI skills)
gitspect init

# Personal retrospective - what did I work on?
gitspect reflect

# Find risky files
gitspect scars

# Comprehensive overview for AI assistants
gitspect context --json
```

---

## Commands

### Setup

| Command | Description |
|---------|-------------|
| `gitspect init` | Initialize `.gitspectrc` config and auto-generate `skills/gitspect/SKILL.md` for AI agents |

**Example:**
```bash
gitspect init
# ✓ Created .gitspectrc
# ✓ Created skills/gitspect/SKILL.md
```

### Phase 1: Personal Retrospective

For vibe coders who need context recovery and personal insights.

| Command | Description |
|---------|-------------|
| `gitspect reflect` | Personal retrospective with activity summary, file churn, and insights |
| `gitspect churn` | File churn detection - identify frequently modified files |
| `gitspect heatmap` | Activity heatmap - visualize when you code most |

**Example:**
```bash
gitspect reflect --days 30
```

### Phase 2: Contributor Onboarding

For understanding codebase ownership and risk areas.

| Command | Description |
|---------|-------------|
| `gitspect blame-map` | File ownership mapping - who owns which files |
| `gitspect scars` | Riskiest files to modify - high-churn, bug-prone areas |
| `gitspect couples` | Files changed together - discover hidden dependencies |

**Example:**
```bash
gitspect scars --limit 10
```

### Phase 3: Project Management

For understanding project health and blockers.

| Command | Description |
|---------|-------------|
| `gitspect report` | Project health report - metrics, concerns, and positive signals |
| `gitspect blockers` | What's slowing progress - hotspots, instability, complexity |
| `gitspect evolution` | Codebase evolution over time - trends and growth patterns |

**Example:**
```bash
gitspect blockers --days 90
```

### AI Context

Comprehensive repo overview designed for AI assistants.

| Command | Description |
|---------|-------------|
| `gitspect context` | AI context - comprehensive repo overview with risk assessment |

**Example:**
```bash
gitspect context --json > repo_context.json
```

---

## Global Options

All commands support these options:

| Option | Description |
|--------|-------------|
| `--days <n>` | Time period in days (default: all time, all branches) |
| `--current-branch` | Only analyze the current branch (default: all branches) |
| `--json` | Output as JSON (for AI consumption) |
| `--no-ignore` | Include files that would normally be filtered (lock files, build artifacts, etc.) |
| `--limit <n>` | Limit output to top N results (churn, scars, couples) |
| `--granularity <week\|month>` | Time granularity for evolution command |

---

## Configuration

Create `.gitspectrc` in your repository root to customize behavior:

```json
{
  "exclude": [
    "tests/fixtures/",
    "*.mock.ts",
    "docs/"
  ],
  "include": [],
  "skillPrompt": "auto"
}
```

### Options

| Setting | Description |
|---------|-------------|
| `exclude` | File patterns to ignore during analysis (lock files, build artifacts, etc.) |
| `include` | File patterns to explicitly include (overrides exclude) |
| `skillPrompt` | Control AI skill file behavior: `auto` (prompt if needed), `always` (auto-update), `never` (don't create) |

### Built-in Ignores

Gitspect automatically filters out common noise files:

- **Lock files**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, etc.
- **Build artifacts**: `dist/`, `build/`, `*.min.js`, etc.
- **Generated files**: `*.generated.*`, `*.gql.ts`, swagger files, etc.

Use `--no-ignore` to include all files if needed.

---

## AI Integration

Gitspect is designed to work with AI assistants (Claude, Cursor, ChatGPT, etc.).

### SKILL.md Auto-Generation

When you run `gitspect init`, it creates `skills/gitspect/SKILL.md` - a context file that AI agents automatically use to understand your repository.

The `SKILL.md` includes:
- When to use Gitspect commands
- What each command reveals
- How to interpret the output
- Project-specific patterns (can be customized)

**Auto-update behavior:**
- `skillPrompt: "auto"` - Prompts to update SKILL.md when Gitspect version changes
- `skillPrompt: "always"` - Automatically keeps SKILL.md updated
- `skillPrompt: "never"` - Disables SKILL.md management

### For AI Agents

Run `gitspect context --json` to get a comprehensive repo overview:

```json
{
  "overview": {
    "health": "moderate",
    "totalCommits": 147,
    "activeContributors": 3,
    "primaryLanguage": "ts",
    "developmentVelocity": "high"
  },
  "criticalAreas": {
    "highRiskFiles": [{
      "path": "src/payment.ts",
      "riskScore": 73,
      "why": "3x higher churn than average; 28% bugfix rate",
      "recommendation": "proceed with caution, add tests"
    }]
  },
  "ownership": {
    "busFactor": 2,
    "keyOwners": [...]
  },
  "warnings": [
    "Low bus factor: project depends on 2 or fewer contributors"
  ]
}
```

AI can use this context to:
- Adjust behavior based on file risk levels
- Understand ownership before suggesting changes
- Detect hidden dependencies
- Provide context-aware suggestions

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev reflect
npm run dev context --json

# Link for global testing
npm link
```

---

## Roadmap

- [x] Phase 1: Personal retrospectives (reflect, churn, heatmap)
- [x] Phase 2: Contributor onboarding (blame-map, scars, couples)
- [x] Phase 3: Project management (report, blockers, evolution)
- [x] AI Context (context command, SKILL.md auto-generation)
- [x] File filtering (built-in ignores, .gitspectrc config)
- [ ] Phase 4: Enhanced AI integration (agent prompts, .cursorrules generation)
- [ ] LLM integration (optional local/cloud models)

---

## License

MIT © [tscburak](https://github.com/tscburak)
