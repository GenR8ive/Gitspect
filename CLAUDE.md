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

### Phase 1: Implemented (MVP)

```bash
# Personal retrospective - analyze recent development activity
gitspect reflect [--days <number>] [--current-branch] [--json]

# File churn detection - identify frequently modified files
gitspect churn [--days <number>] [--limit <number>] [--current-branch] [--json]

# Activity heatmap - visualize when you code most
gitspect heatmap [--days <number>] [--current-branch] [--json]
```

**Branch behavior**:
- Default: Analyzes **all branches** (complete picture across feature branches, experiments, etc.)
- `--current-branch`: Only analyze the currently checked-out branch

### Phase 2: Contributor onboarding (Planned)
```bash
gitspect blame-map            # File ownership mapping
gitspect scars                # Riskiest files to modify
gitspect couples              # Files changed together
```

### Phase 3: PM narratives (Planned)
```bash
gitspect report               # Human-readable project summary
gitspect blockers             # What's slowing progress
```

### Phase 4: AI assistant integration (Planned)
```bash
gitspect suggest              # Generate .cursorrules, agent prompts
gitspect explain <file>       # Context for AI assistants
```

### LLM Flags (Planned)

```bash
gitspect reflect                    # Pure offline analysis
gitspect reflect --llm local        # Use local Ollama/Llama
gitspect reflect --llm anthropic    # Use cloud API (user-provided key)
```

## Extra Feature: AI Agent Integration

Gitspect can generate context for AI development tools:

- **`.cursorrules` suggestions** - Warn about high-churn files
- **Agent system prompts** - Include project patterns in AI context
- **`.skills` files** - Repository-specific AI instructions

Example:
```
# Generated from git history
⚠️ payment_service.ts: 47 commits, 12 bugfixes
→ Rule: Test payment changes thoroughly, high churn area

⚠️ auth_controller.ts: Rewritten 6 times
→ Rule: Architecture unstable, expect frequent changes
```

## Development Notes

- **Build**: `npm run build` - Compiles TypeScript to `dist/`
- **Dev**: `npm run dev -- <command>` - Run CLI directly with tsx
- **Install**: `npm link` - Symlink for global testing
- Target distribution: npm package (CLI)
- Language: TypeScript with ES2022 modules
- Core dependencies: simple-git (git operations), commander (CLI), chalk (colors), cli-table3 (tables)
- LLM integration: Planned for future phases

## References

- [README.md](README.md) - Project overview and feature list
