import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const HIVE_SKILL_TEMPLATE = `---
name: hive
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this plan-first workflow.

## Lifecycle

\`\`\`
Feature -> Plan -> Review -> Approve -> Execute -> Merge -> Complete
\`\`\`

---

## Phase 1: Planning

### Start Feature

\`\`\`
hive_feature_create({ name: "feature-name" })
\`\`\`

### Research First

Before writing anything:
1. Search for relevant files (grep, explore)
2. Read existing implementations
3. Identify patterns and conventions

Save all findings:
\`\`\`
hive_context_write({
  name: "research",
  content: \`# Research Findings

## Existing Patterns
- Theme system uses CSS variables in src/theme/
- Components follow atomic design

## Files to Modify
- src/theme/colors.ts
- src/components/ThemeProvider.tsx
\`
})
\`\`\`

### Write the Plan

Format for task parsing:

\`\`\`markdown
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
\`\`\`

Write with:
\`\`\`
hive_plan_write({ content: \`...\` })
\`\`\`

**STOP** and tell user: "Plan written. Please review."

---

## Phase 2: Review (Human)

- User reviews plan.md in VS Code sidebar
- User can add comments
- Use \`hive_plan_read()\` to see user comments
- Revise plan based on feedback
- User clicks "Approve" or runs \`hive_plan_approve()\`

---

## Phase 3: Execution

### Generate Tasks

\`\`\`
hive_tasks_sync()
\`\`\`

Parses \`### N. Task Name\` headers into task folders.

### Execute Each Task

For each task in order:

#### 1. Start (creates worktree)
\`\`\`
hive_exec_start({ task: "01-task-name" })
\`\`\`

#### 2. Implement
Work in the isolated worktree path. Read \`spec.md\` for context.

#### 3. Complete (commits to branch)
\`\`\`
hive_exec_complete({ task: "01-task-name", summary: "What was done" })
\`\`\`

#### 4. Merge (integrates to main)
\`\`\`
hive_merge({ task: "01-task-name", strategy: "squash" })
\`\`\`

---

## Phase 4: Completion

After all tasks merged:
\`\`\`
hive_feature_complete({ name: "feature-name" })
\`\`\`

---

## Tool Quick Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Plan | \`hive_feature_create\` | Start new feature |
| Plan | \`hive_context_write\` | Save research findings |
| Plan | \`hive_plan_write\` | Write the plan |
| Plan | \`hive_plan_read\` | Check for user comments |
| Plan | \`hive_plan_approve\` | Approve plan |
| Execute | \`hive_tasks_sync\` | Generate tasks from plan |
| Execute | \`hive_exec_start\` | Start task (creates worktree) |
| Execute | \`hive_exec_complete\` | Finish task (commits changes) |
| Execute | \`hive_merge\` | Integrate task to main |
| Complete | \`hive_feature_complete\` | Mark feature done |

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
2. **Context is critical** - Save all research with \`hive_context_write\`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before starting next
5. **Squash merges** - Keep history clean with single commit per task

---

## Error Recovery

### Task Failed
\`\`\`
hive_exec_abort(task="<task>")  # Discards changes
hive_exec_start(task="<task>")  # Fresh start
\`\`\`

### Merge Conflicts
1. Resolve conflicts in the worktree
2. Commit the resolution
3. Run \`hive_merge\` again
`;

const COPILOT_AGENT_TEMPLATE = `---
description: 'Plan-first feature development with isolated worktrees and persistent context.'
tools: ['runSubagent', 'tctinh.vscode-hive/hiveFeatureCreate', 'tctinh.vscode-hive/hiveFeatureList', 'tctinh.vscode-hive/hiveFeatureComplete', 'tctinh.vscode-hive/hivePlanWrite', 'tctinh.vscode-hive/hivePlanRead', 'tctinh.vscode-hive/hivePlanApprove', 'tctinh.vscode-hive/hiveTasksSync', 'tctinh.vscode-hive/hiveTaskCreate', 'tctinh.vscode-hive/hiveTaskUpdate', 'tctinh.vscode-hive/hiveExecStart', 'tctinh.vscode-hive/hiveExecComplete', 'tctinh.vscode-hive/hiveExecAbort', 'tctinh.vscode-hive/hiveMerge', 'tctinh.vscode-hive/hiveWorktreeList', 'tctinh.vscode-hive/hiveContextWrite', 'tctinh.vscode-hive/hiveStatus']
---

# Hive Agent

You are a plan-first development orchestrator. Follow this workflow: Plan -> Review -> Approve -> Execute -> Merge.

## Core Workflow

### Phase 1: Planning
1. \\\`featureCreate({ name: "feature-name" })\\\` - Create feature
2. Research codebase, save with \\\`contextWrite\\\`
3. \\\`planWrite({ content: "# Feature\\\\n\\\\n## Tasks\\\\n\\\\n### 1. First task..." })\\\`
4. **STOP** - Tell user: "Plan ready. Please review and approve."

### Phase 2: User Review
User reviews in VS Code, adds comments, approves when ready.

### Phase 3: Execution
1. \\\`tasksSync()\\\` - Generate tasks from plan
2. For each task:
   - \\\`execStart({ task: "task-name" })\\\`
   - Implement
   - \\\`execComplete({ task: "task-name", summary: "..." })\\\`
   - \\\`merge({ task: "task-name", strategy: "squash" })\\\`

### Phase 4: Completion
\\\`featureComplete({ name: "feature-name" })\\\`

## Rules
1. Never skip planning
2. Save context with \`contextWrite\`
3. Wait for approval before execution
4. One task at a time
5. Squash merges for clean history
`;

function createSkill(basePath: string): void {
  const skillPath = path.join(basePath, 'hive');
  fs.mkdirSync(skillPath, { recursive: true });
  fs.writeFileSync(path.join(skillPath, 'SKILL.md'), HIVE_SKILL_TEMPLATE);
}

export async function initNest(projectRoot: string): Promise<void> {
  // 1. Create .hive structure
  const hivePath = path.join(projectRoot, '.hive');
  fs.mkdirSync(path.join(hivePath, 'features'), { recursive: true });
  fs.mkdirSync(path.join(hivePath, 'skills'), { recursive: true });

  // 2. Create OpenCode skill
  const opencodePath = path.join(projectRoot, '.opencode', 'skill');
  createSkill(opencodePath);

  // 3. Create Claude skill (same format)
  const claudePath = path.join(projectRoot, '.claude', 'skills');
  createSkill(claudePath);

  // 4. Create Copilot agent
  const agentPath = path.join(projectRoot, '.github', 'agents');
  fs.mkdirSync(agentPath, { recursive: true });
  fs.writeFileSync(path.join(agentPath, 'Hive.agent.md'), COPILOT_AGENT_TEMPLATE);

  vscode.window.showInformationMessage('🐝 Hive Nest initialized! Skills created for OpenCode, Claude, and GitHub Copilot.');
}
