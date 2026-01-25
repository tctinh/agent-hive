---
name: onboarding
description: "Ask about workflow preferences and store them in .hive/contexts/preferences.md before proceeding."
---

# Onboarding Preferences

## Overview

Gather workflow preferences so the assistant can match the user's desired working style.

## When to Ask

- **Immediately when the skill is loaded**, before any other work.
- If `.hive/contexts/preferences.md` does not exist, start onboarding.
- If later a decision is ambiguous and preferences are missing, ask again.

## Preference Storage

Use `hive_context_write` to write `.hive/contexts/preferences.md` with this exact template:

```
# Preferences

## Exploration Style
sync

## Research Depth
medium

## Confirmation Level
standard

## Commit Behavior
ask-before-commit
```

## If Preferences Already Exist

Follow the same pattern used in `packages/vscode-hive/src/tools/plan.ts`:

1. Use `contextService.list(feature)` to detect existing contexts.
2. Ask **"Preferences already exist. Keep or overwrite?"** using the `question()` tool.
3. If keep → continue using existing preferences.
4. If overwrite → collect new answers and write them with `hive_context_write`.

## Questions to Ask (Always use `question()`)

Ask one at a time, with the provided options. Store the answers in `.hive/contexts/preferences.md`.

1. **Exploration Style:** sync | async
2. **Research Depth:** shallow | medium | deep
3. **Confirmation Level:** minimal | standard | high
4. **Commit Behavior:** ask-before-commit | auto-commit | never-commit

## Requirements

- Use the `question()` tool (no plain text questions).
- Ask immediately when the skill loads if preferences are missing.
- If later a decision is ambiguous and preferences are missing, ask again.
- Always store answers using `hive_context_write` with the template above.
