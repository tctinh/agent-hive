---
name: agents-md-mastery
description: "Use when bootstrapping, updating, or reviewing AGENTS.md — teaches what makes effective agent memory, how to structure sections, signal vs noise filtering, and when to prune stale entries"
---

# AGENTS.md Mastery

## Overview

**AGENTS.md is pseudo-memory loaded at session start.** Every line shapes agent behavior for the entire session. Quality beats quantity. Write for agents, not humans.

Unlike code comments or READMEs, AGENTS.md entries persist across all agent sessions. A bad entry misleads agents hundreds of times. A missing entry causes the same mistake repeatedly.

**Core principle:** Optimize for agent comprehension and behavioral change, not human readability.

## The Iron Law

```
EVERY ENTRY MUST CHANGE AGENT BEHAVIOR
```

If an entry doesn't:
- Prevent a specific mistake
- Enable a capability the agent would otherwise miss
- Override a default assumption that breaks in this codebase

...then it doesn't belong in AGENTS.md.

**Test:** Would a fresh agent session make a mistake without this entry? If no → noise.

## When to Use

| Trigger | Action |
|---------|--------|
| New project bootstrap | Write initial AGENTS.md with build/test/style basics |
| Feature completion | Sync new learnings via `hive_agents_md` tool |
| Periodic review | Audit for stale/redundant entries (quarterly) |
| Quality issues | Agent repeating mistakes? Check if AGENTS.md has the fix |

## What Makes Good Agent Memory

### Signal Entries (Keep)

✅ **Project-specific conventions:**
- "We use Zustand, not Redux — never add Redux"
- "Auth lives in `/lib/auth` — never create auth elsewhere"
- "Run `bun test` not `npm test` (we don't use npm)"

✅ **Non-obvious patterns:**
- "Use `.js` extension for local imports (ESM requirement)"
- "Worktrees don't share `node_modules` — run `bun install` in each"
- "SandboxConfig is in `dockerSandboxService.ts`, NOT `types.ts`"

✅ **Gotchas that break builds:**
- "Never use `ensureDirSync` — doesn't exist. Use `ensureDir` (sync despite name)"
- "Import from `../utils/paths.js` not `./paths` (ESM strict)"

### Noise Entries (Remove)

❌ **Agent already knows:**
- "This project uses TypeScript" (agent detects from files)
- "We follow semantic versioning" (universal convention)
- "Use descriptive variable names" (generic advice)

❌ **Irrelevant metadata:**
- "Created on January 2024"
- "Originally written by X"
- "License: MIT" (in LICENSE file already)

❌ **Describes what code does:**
- "FeatureService manages features" (agent can read code)
- "The system uses git worktrees" (observable from commands)

### Rule of Thumb

**Signal:** Changes how agent acts  
**Noise:** Documents what agent observes

## Section Structure for Fast Comprehension

Agents read AGENTS.md top-to-bottom once at session start. Put high-value info first:

```markdown
# Project Name

## Build & Test Commands
# ← Agents need this IMMEDIATELY
bun run build
bun run test
bun run release:check

## Code Style
# ← Prevents syntax/import errors
- Semicolons: Yes
- Quotes: Single
- Imports: Use `.js` extension

## Architecture
# ← Key directories, where things live
packages/
├── hive-core/      # Shared logic
├── opencode-hive/  # Plugin
└── vscode-hive/    # Extension

## Important Patterns
# ← How to do common tasks correctly
Use `readText` from paths.ts, not fs.readFileSync

## Gotchas & Anti-Patterns
# ← Things that break or mislead
NEVER use `ensureDirSync` — doesn't exist
```

**Keep total under 500 lines.** Beyond that, agents lose focus and miss critical entries.

## The Sync Workflow

After completing a feature, sync learnings to AGENTS.md:

1. **Trigger sync:**
   ```typescript
   hive_agents_md({ action: 'sync', feature: 'feature-name' })
   ```

2. **Review each proposal:**
   - Read the proposed change
   - Ask: "Does this change agent behavior?"
   - Check: Is this already obvious from code/files?

3. **Accept signal, reject noise:**
   - ❌ "TypeScript is used" → Agent detects this
   - ✅ "Use `.js` extension for imports" → Prevents build failures

4. **Apply approved changes:**
   ```typescript
   hive_agents_md({ action: 'apply' })
   ```

**Warning:** Don't auto-approve all proposals. One bad entry pollutes all future sessions.

## When to Prune

Remove entries when they become:

**Outdated:**
- "We use Redux" → Project migrated to Zustand
- "Node 16 compatibility required" → Now on Node 22

**Redundant:**
- "Use single quotes" + "Strings use single quotes" → Keep one
- Near-duplicates in different sections

**Too generic:**
- "Write clear code" → Applies to any project
- "Test your changes" → Universal advice

**Describing code:**
- "TaskService manages tasks" → Agent can read `TaskService` class
- "Worktrees are in `.hive/.worktrees/`" → Observable from filesystem

**Proven unnecessary:**
- Entry added 6 months ago, but agents haven't hit that issue since

## Red Flags

| Warning Sign | Why It's Bad | Fix |
|-------------|-------------|-----|
| AGENTS.md > 800 lines | Agents lose focus, miss critical info | Prune aggressively |
| Describes what code does | Agent can read code | Remove descriptions |
| Missing build/test commands | First thing agents need | Add at top |
| No gotchas section | Agents repeat past mistakes | Document failure modes |
| Generic best practices | Doesn't change behavior | Remove or make specific |
| Outdated patterns | Misleads agents | Prune during sync |

## Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|----------------|
| "Document everything" | Document only what changes behavior |
| "Keep for historical record" | Version control is history |
| "Might be useful someday" | Add when proven necessary |
| "Explains the system" | Agents read code for that |
| "Comprehensive reference" | AGENTS.md is a filter, not docs |

## Good Examples

**Build Commands (High value, agents need immediately):**
```markdown
## Build & Test Commands
bun run build              # Build all packages
bun run test               # Run all tests
bun run release:check      # Full CI check
```

**Project-Specific Convention (Prevents mistakes):**
```markdown
## Code Style
- Imports: Use `.js` extension for local imports (ESM requirement)
- Paths: Import from `../utils/paths.js` never `./paths`
```

**Non-Obvious Gotcha (Prevents build failure):**
```markdown
## Important Patterns
Use `ensureDir` from paths.ts — sync despite name
NEVER use `ensureDirSync` (doesn't exist)
```

## Bad Examples

**Generic advice (agent already knows):**
```markdown
## Best Practices
- Use meaningful variable names
- Write unit tests
- Follow DRY principle
```

**Describes code (agent can read it):**
```markdown
## Architecture
The FeatureService class manages features. It has methods
for create, read, update, and delete operations.
```

**Irrelevant metadata:**
```markdown
## Project History
Created in January 2024 by the platform team.
Originally built for internal use.
```

## Verification

Before finalizing AGENTS.md updates:

- [ ] Every entry answers: "What mistake does this prevent?"
- [ ] No generic advice that applies to all projects
- [ ] Build/test commands are first
- [ ] Gotchas section exists and is populated
- [ ] Total length under 500 lines (800 absolute max)
- [ ] No entries describing what code does
- [ ] Fresh agent session would benefit from each entry

## Summary

AGENTS.md is **behavioral memory**, not documentation:
- Write for agents, optimize for behavior change
- Signal = prevents mistakes, Noise = describes observables
- Sync after features, prune quarterly
- Test: Would agent make a mistake without this entry?

**Quality > quantity. Every line counts.**
