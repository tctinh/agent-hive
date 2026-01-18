# Test New Features

## Overview

Test the new Init Hive Nest functionality and skill system to verify everything works correctly.

## Tasks

### 1. Test Init Nest command
Run the Init Nest command and verify all skill files are created:
- `.hive/features/` and `.hive/skills/` directories
- `.opencode/skill/hive-workflow/SKILL.md`
- `.opencode/skill/hive-execution/SKILL.md`
- `.opencode/skill/hive-planning/SKILL.md`
- `.claude/skills/` (same 3 skills)
- `.github/agents/Hive.agent.md`

### 2. Test hive_skill tool
Call `hive_skill({ name: "hive-workflow" })` and verify it returns skill content.
Call with non-existent skill and verify it lists available skills.

### 3. Test dashboard UI
- Open Hive Queen (Ctrl+Shift+H) and verify dashboard shows
- Verify Init Nest button is visible
- Verify New Feature button is visible
- Verify this test feature appears in the list
