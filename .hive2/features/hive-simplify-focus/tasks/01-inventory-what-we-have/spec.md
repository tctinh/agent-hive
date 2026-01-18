# Task: 01-inventory-what-we-have

## Feature: hive-simplify-focus

## Context

## simplify-focus

# Simplify Hive — Context

## The Problem
We over-engineered. Queen Panel is a dashboard (we said we're not that). 24+ tools wrap file ops agents can do directly. Three skills when one would do.

## Decisions
- Remove Queen Panel entirely (keep sidebar)
- File-based approval: `.hive/features/<feature>/APPROVED` marker
- Drop `hive_ask` → use OpenCode `question` tool
- Merge 3 skills → single `hive.md`
- CLI-first, VS Code sidebar secondary

## Key Files
- Queen Panel: `packages/vscode-hive/src/panels/*`, `media/hiveQueen.*`, `extension.ts`
- Skills: `packages/hive-core/templates/skills/*`, `src/templates.ts`
- Plan approval: `packages/hive-core/src/services/planService.ts`
- Prompts: `oh-my-opencode/src/agents/*-prompt.ts`

## Philosophy Alignment
- P4: Good enough wins — stop over-engineering
- Free-form context — no rigid task specs
- Human shapes, Agent builds — plan says what/why, worker figures out how


