---
name: hive
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this plan-first workflow.

## Lifecycle

```
Feature -> Plan -> Review -> Approve -> Execute -> Merge -> Complete
```

---

## Phase 1: Planning

### Start Feature

```
hive_feature_create({ name: "feature-name" })
```

### Discovery Phase (Required)

BEFORE writing a plan, you MUST:
1. Ask clarifying questions about the feature
2. Document Q&A in plan.md with a `## Discovery` section
3. Research the codebase (grep, read existing code)
4. Save findings with hive_context_write

Your plan MUST include a `## Discovery` section or hive_plan_write will be BLOCKED.

Example discovery section:
```markdown
## Discovery

**Q: What authentication system do we use?**
A: JWT with refresh tokens, see src/auth/

**Q: Should this work offline?**
A: No, online-only is fine

**Research:**
- Found existing theme system in src/theme/
- Uses CSS variables pattern
```

### Research First

Before writing anything:
1. Search for relevant files (grep, explore)
2. Read existing implementations
3. Identify patterns and conventions

Save all findings:
```
hive_context_write({
  name: "research",
  content: `# Research Findings

## Existing Patterns
- Theme system uses CSS variables in src/theme/
- Components follow atomic design

## Files to Modify
- src/theme/colors.ts
- src/components/ThemeProvider.tsx
`
})
```

### Write the Plan

Format for task parsing:

```markdown
# Feature Name

## Overview
One paragraph explaining what and why.

## Tasks

### 1. Task Name
Description of what this task accomplishes.
- Specific files to modify
- Expected outcome

### 2. Another Task
Description...

### 3. Final Task
Description...
```

Write with:
```
hive_plan_write({ content: `...` })
```

**STOP** and tell user: "Plan written. Please review."

---

## Phase 2: Review (Human)

- User reviews plan.md in VS Code sidebar
- User can add comments
- Use `hive_plan_read()` to see user comments
- Revise plan based on feedback
- User clicks "Approve" or runs `hive_plan_approve()`

---

## Phase 3: Execution

### Generate Tasks

```
hive_tasks_sync()
```

Parses `### N. Task Name` headers into task folders.

### Execute Each Task

For each task in order:

#### 1. Start (creates worktree)
```
hive_exec_start({ task: "01-task-name" })
```

#### 2. Implement
Work in the isolated worktree path. Read `spec.md` for context.

#### 3. Complete (commits to branch)
```
hive_exec_complete({ task: "01-task-name", summary: "What was done. Tests pass." })
```

**Note**: Summary must mention verification (tests/build) or completion will be BLOCKED.

#### 4. Merge (integrates to main)
```
hive_merge({ task: "01-task-name", strategy: "squash" })
```

---

## Phase 4: Completion

After all tasks merged:
```
hive_feature_complete({ name: "feature-name" })
```

---

## Tool Quick Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Plan | `hive_feature_create` | Start new feature |
| Plan | `hive_context_write` | Save research findings |
| Plan | `hive_plan_write` | Write the plan |
| Plan | `hive_plan_read` | Check for user comments |
| Plan | `hive_plan_approve` | Approve plan |
| Execute | `hive_tasks_sync` | Generate tasks from plan |
| Execute | `hive_exec_start` | Start task (creates worktree) |
| Execute | `hive_exec_complete` | Finish task (commits changes) |
| Execute | `hive_merge` | Integrate task to main |
| Complete | `hive_feature_complete` | Mark feature done |

---

## Task Design Guidelines

### Good Tasks

| Characteristic | Example |
|---------------|---------|
| **Atomic** | "Add ThemeContext provider" not "Add theming" |
| **Testable** | "Toggle switches between light/dark" |
| **Independent** | Can be completed without other tasks (where possible) |
| **Ordered** | Dependencies come first |

### Task Sizing

- **Too small**: "Add import statement" - combine with related work
- **Too large**: "Implement entire feature" - break into logical units
- **Just right**: "Create theme context with light/dark values"

---

## Rules

1. **Never skip planning** - Always write plan first
2. **Context is critical** - Save all research with `hive_context_write`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before starting next
5. **Squash merges** - Keep history clean with single commit per task

---

## Error Recovery

### Task Failed
```
hive_exec_abort(task="<task>")  # Discards changes
hive_exec_start(task="<task>")  # Fresh start
```

### Merge Conflicts
1. Resolve conflicts in the worktree
2. Commit the resolution
3. Run `hive_merge` again

---

## Example

User: "Add dark mode support"

```
1. hive_feature_create({ name: "dark-mode" })
2. Research: grep for theme, colors, CSS variables
3. hive_context_write({ name: "research", content: "Found theme in src/theme/..." })
4. hive_plan_write({ content: "# Dark Mode\n\n## Tasks\n\n### 1. Add theme context..." })
5. Tell user: "Plan ready for review"
6. [User reviews and approves]
7. hive_tasks_sync()
8. For each task: exec_start -> implement -> exec_complete -> merge
9. hive_feature_complete({ name: "dark-mode" })
```
