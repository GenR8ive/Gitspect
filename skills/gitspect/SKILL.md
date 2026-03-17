---
name: gitspect
metadata: {
  version: "0.1.0",
  lastUpdated: "2026-03-17T22:30:45.866Z"
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
```bash
npx gitspect <command>
```

Or install globally:
```bash
npm install -g gitspect
gitspect <command>
```

## Command Quick Reference

| Situation | Command |
|-----------|---------|
| Joining a new codebase | `gitspect context --days 90` |
| User asks "what should I know?" | `gitspect reflect --days 30` |
| Before touching an unfamiliar file | `gitspect scars --limit 10` |
| Finding who owns what | `gitspect blame-map <files>` |
| Reviewing a PR | `gitspect couples --limit 10` |
| Project feels slow/bogged down | `gitspect blockers --days 90` |
| Checking for burnout signals | `gitspect heatmap --days 90` |
| High-level health overview | `gitspect report --days 90` |

Use `--json` on any command when parsing output programmatically.

## Agent Workflows

### New project / onboarding
1. `gitspect context --days 90`
2. Summarize hotspots, owners, bug-prone areas to the user
3. Keep findings in context for the rest of the session

### Before suggesting code changes
1. `gitspect scars --days 90` on the target files
2. If high-risk: add warnings, recommend test coverage
3. `gitspect blame-map` to find the right person to consult

### Debugging
1. `gitspect blame-map <file> --days 180` → find the owner
2. `gitspect couples --days 90` → check for hidden dependencies
3. Suggest: "You might want to ask @owner — also check coupled files"

### PR review
1. `gitspect blame-map` on changed files → suggest additional reviewers
2. Flag changes to high-churn files or changes by non-owners

## Interpreting Output

- **High churn**: Unstable area — suggest caution, tests, owner consultation
- **High bugfix rate**: Error-prone code — recommend thorough testing or refactor
- **High night/weekend activity**: Possible burnout — gently check in on the user
- **Strong file coupling**: Hidden dependency — flag and suggest refactoring
- **Rewritten files**: Requirements shifted — ask what was learned, suggest documenting decisions

## Agent Best Practices

- Always tell the user **why** you're running a command before running it
- Default to `--days 90` (good balance of recency and sample size)
- Correlate Gitspect findings with actual code before making suggestions
- Gitspect data is local — don't include it in any external requests
- Explain what metrics mean; don't just dump raw output at the user

## Flags Reference

### Available on All Commands

| Flag | Description | Default |
|------|-------------|---------|
| `--days <n>` | Time period to analyze | All time |
| `--current-branch` | Only analyze current branch (not all branches) | All branches |
| `--json` | Output as JSON instead of formatted text | Text |
| `--no-ignore` | Include all files (lock files, build artifacts, etc.) | Filtered |

### Command-Specific Flags

| Command | Additional Flags |
|---------|------------------|
| `churn` | `--limit <n>` - Max files to display |
| `scars` | `--limit <n>` - Max files to display |
| `couples` | `--limit <n>` - Max file pairs to display |
| `evolution` | `--granularity <week|month>` - Time grouping |

### Common Flag Combinations

```bash
# Quick personal retrospective (last 30 days, current branch)
gitspect reflect --days 30 --current-branch

# Find riskiest files (last 90 days, top 10)
gitspect scars --days 90 --limit 10

# AI context (JSON output, 90 days)
gitspect context --days 90 --json

# Analyze everything including generated files
gitspect churn --no-ignore
```

### JSON Output Schema

All commands return structured JSON when `--json` is used. Common fields:

```json
{
  "period": { "start": "date", "end": "date", "days": n },
  "totalCommits": n,
  "results": [...],
  "summary": { ... }
}
```

Run individual commands with `--json` to see their specific schemas.
