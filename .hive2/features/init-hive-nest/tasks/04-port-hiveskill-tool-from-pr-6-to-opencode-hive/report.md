# Task Report: 04-port-hiveskill-tool-from-pr-6-to-opencode-hive

**Feature:** init-hive-nest
**Completed:** 2026-01-15T13:14:04.381Z
**Status:** success
**Commit:** a4d89b2a0bcb54250981628963a208fb7b74f51c

---

## Summary

Added hive_skill tool to opencode-hive. Discovers skills from .hive/skills/, .opencode/skill/, .claude/skills/. Parses YAML frontmatter and returns skill body. Lists available skills if requested skill not found. Updated HIVE_SYSTEM_PROMPT tool table. Build succeeds (0.65 MB).

---

## Changes

- **Files changed:** 1
- **Insertions:** +56
- **Deletions:** -0

### Files Modified

- `packages/opencode-hive/src/index.ts`
