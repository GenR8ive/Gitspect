# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gitspect is a privacy-first, offline-capable Git history analysis tool designed for developers using AI-assisted workflows ("vibe coders"). It transforms commit data into actionable insights about codebase health, personal patterns, and architectural risks.

**Core problem**: AI-assisted coding accelerates development but can lead to context loss. Git remembers everything—but doesn't tell you where you struggled, where architecture failed, or how your project evolved. Gitspect bridges this gap.

## Target Personas (Priority Order)

1. **Solo devs / "vibe coders"** - Need personal retrospectives, context recovery
2. **Contributors** - Need onboarding insights, ownership mapping, hotspot detection
3. **Project managers** - Need to understand WHY problems occur, not just THAT they occur

## Architecture Principles

### Privacy-First, Offline-Default

```
┌─────────────────────────────────────────┐
│         Gitspect Core (100% offline)    │
│  Git parsing → Metrics → Analysis       │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Plain text  Local LLM   Cloud LLM
    (default)   (opt-in)    (opt-in)
```

- **No network by default** - All analysis is local git parsing
- **LLM is optional** - Used only for narrative formatting, not analysis
- **Structured output** - JSON for machine readability, text for humans

### What Works Without LLMs

Most insights are deterministic data mining:
- File churn (commits per file, rewrites, hotspots)
- Commit patterns (frequency, timing, size)
- Bug-prone areas (bugfix/fix/patch commit messages)
- File coupling (files changed together)
- Ownership (who touches what)
- Evolution trends (lines added/removed)

### What LLMs Add

LLMs provide narrative interpretation of metrics:
- "Payment module rewritten 6 times → unclear requirements"
- "High night activity → potential burnout risk"
- Natural language summaries and suggestions

## CLI Interface

### Setup Command

```bash
gitspect init
```
Creates `.gitspectrc` config file and `skills/gitspect/SKILL.md` for AI agents.

### Phase 1: Personal Retrospective (Implemented)

```bash
# Personal retrospective - analyze recent development activity
gitspect reflect [--days <number>] [--current-branch] [--json] [--no-ignore]

# File churn detection - identify frequently modified files
gitspect churn [--days <number>] [--limit <number>] [--current-branch] [--json] [--no-ignore]

# Activity heatmap - visualize when you code most
gitspect heatmap [--days <number>] [--current-branch] [--json] [--no-ignore]
```

**Branch behavior**:
- Default: Analyzes **all branches** (complete picture across feature branches, experiments, etc.)
- `--current-branch`: Only analyze the currently checked-out branch

**File filtering**:
- By default, filters out lock files, build artifacts, generated code
- `--no-ignore`: Include all files (useful for analysis)

### Phase 2: Contributor Onboarding (Implemented)

```bash
gitspect blame-map [--days <number>] [--current-branch] [--json] [--no-ignore]
gitspect scars [--days <number>] [--limit <number>] [--current-branch] [--json] [--no-ignore]
gitspect couples [--days <number>] [--limit <number>] [--current-branch] [--json] [--no-ignore]
```

### Phase 3: PM Narratives (Implemented)

```bash
gitspect report [--days <number>] [--current-branch] [--json] [--no-ignore]
gitspect blockers [--days <number>] [--current-branch] [--json] [--no-ignore]
gitspect evolution [--days <number>] [--current-branch] [--granularity <week|month>] [--json] [--no-ignore]
```

### Phase 4: AI Context (Implemented)

```bash
gitspect context [--days <number>] [--current-branch] [--json] [--no-ignore]
```

Comprehensive repo overview designed for AI assistants. Auto-generates `SKILL.md` files.

### LLM Flags (Planned)

```bash
gitspect reflect                    # Pure offline analysis
gitspect reflect --llm local        # Use local Ollama/Llama
gitspect reflect --llm anthropic    # Use cloud API (user-provided key)
```

## Configuration

### .gitspectrc

Users can create `.gitspectrc` in their repository root:

```json
{
  "exclude": ["tests/fixtures/", "*.mock.ts"],
  "include": [],
  "skillPrompt": "auto"
}
```

**Settings:**
- `exclude`: File patterns to ignore during analysis
- `include`: File patterns to explicitly include (overrides exclude)
- `skillPrompt`: Control AI skill file behavior
  - `auto` - Prompt if SKILL.md is missing or outdated
  - `always` - Auto-create/update SKILL.md without prompting
  - `never` - Never prompt, never create SKILL.md

### Built-in File Filtering

Gitspect automatically filters out:
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, etc.
- Build artifacts: `dist/`, `build/`, `*.min.js`, etc.
- Generated files: `*.generated.*`, `*.gql.ts`, swagger files, etc.
- IDE/cache files: `.eslintcache`, `.DS_Store`, etc.

## Extra Feature: AI Agent Integration

Gitspect can generate context for AI development tools:

- **`SKILL.md` files** - Auto-generated context that AI agents pick up automatically
- **`skills/gitspect/SKILL.md`** - Created by `gitspect init`, contains Gitspect usage patterns
- **JSON context** - `gitspect context --json` for programmatic AI consumption

Example `SKILL.md` header:
```markdown
<!--
Gitspect SKILL.md v0.1.0
Generated: 2026-03-17T22:16:39.620Z
-->

# Gitspect Skills for AI Agents

This file provides AI agents with context about this repository's Git history patterns...
```

AI can use this context to:
- Run appropriate Gitspect commands based on situation
- Interpret file risk levels before suggesting changes
- Understand ownership and coupling patterns
- Provide context-aware suggestions

## Development Notes

- **Build**: `npm run build` - Compiles TypeScript to `dist/`
- **Dev**: `npm run dev -- <command>` - Run CLI directly with tsx
- **Install**: `npm link` - Symlink for global testing
- Target distribution: npm package (CLI)
- Language: TypeScript with ES2022 modules
- Core dependencies: simple-git (git operations), commander (CLI), chalk (colors), cli-table3 (tables)

### Key Modules

- `src/core/git-parser.ts` - Git log parsing and commit extraction
- `src/core/metrics.ts` - All metric calculations (churn, risk, coupling, etc.)
- `src/core/filters.ts` - File filtering logic and .gitspectrc config loading
- `src/core/skill-manager.ts` - SKILL.md generation and version checking
- `src/core/command-wrapper.ts` - Skill prompt UX wrapper
- `src/core/formatters.ts` - Output formatting (tables, JSON)
- `src/commands/*.ts` - Individual command implementations
- `src/cli.ts` - Commander.js CLI setup

## References

- [README.md](README.md) - Project overview and feature list
- [skills.md](skills.md) - Gitspect skills for AI agents
