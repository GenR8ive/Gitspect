# Gitspect

> Privacy-first, offline Git history analysis for developers using AI-assisted workflows.

Your repository remembers everything.
**Gitspect tells you what matters.**

---

## What is Gitspect?

Gitspect transforms commit data into actionable insights about:
- **Codebase health** - Which files are risky, unstable, or over-engineered
- **Personal patterns** - When you code most, burnout signals, context recovery
- **Team dynamics** - Ownership, coupling, bus factor
- **Evolution trends** - Growth patterns, stability over time

**Privacy-first**: 100% offline analysis by default. No APIs, no cloud, no data leaving your machine.

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
# Personal retrospective - what did I work on?
gitspect reflect

# Find risky files
gitspect scars

# Comprehensive AI context (for AI assistants)
gitspect context --json
```

---

## Commands

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

---

## AI Integration

Gitspect is designed to work with AI assistants (Claude, ChatGPT, etc.).

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
- [x] AI Context (context command)
- [ ] Phase 4: Enhanced AI integration (agent prompts, .cursorrules generation)
- [ ] LLM integration (optional local/cloud models)

---

## License

MIT
