import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Skill templates embedded as strings for portability
const SKILL_TEMPLATES: Record<string, string> = {
  'hive-workflow': `---
name: hive-workflow
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this plan-first workflow.

## Lifecycle

\`\`\`
Feature -> Plan -> Review -> Approve -> Execute -> Merge -> Complete
\`\`\`

## Phase 1: Planning

1. \`hive_feature_create({ name: "feature-name" })\` - Creates feature directory
2. Research the codebase, understand what needs to change
3. Save findings with \`hive_context_write({ name: "research", content: "..." })\`
4. Write the plan with \`hive_plan_write({ content: "# Feature\\n\\n## Tasks\\n\\n### 1. First task..." })\`
5. **STOP** and tell user: "Plan written. Please review in VS Code."

## Phase 2: Review (Human)

- User reviews plan.md in VS Code
- User can add comments
- Use \`hive_plan_read()\` to see user comments
- Revise plan based on feedback
- User clicks "Approve" when ready

## Phase 3: Execution

After user approves:

1. \`hive_tasks_sync()\` - Generates tasks from plan
2. For each task in order:
   - \`hive_exec_start({ task: "01-task-name" })\` - Creates worktree
   - Implement in isolated worktree
   - \`hive_exec_complete({ task: "01-task-name", summary: "What was done" })\`
   - \`hive_merge({ task: "01-task-name", strategy: "squash" })\`

## Phase 4: Completion

After all tasks merged:
\`hive_feature_complete({ name: "feature-name" })\`

## Rules

1. **Never skip planning** - Always write plan first
2. **Context is critical** - Save all research with \`hive_context_write\`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before starting next
5. **Squash merges** - Keep history clean with single commit per task

## Tool Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Plan | \`hive_feature_create\` | Start new feature |
| Plan | \`hive_plan_write\` | Write the plan |
| Plan | \`hive_plan_read\` | Check for user comments |
| Plan | \`hive_context_write\` | Save research findings |
| Execute | \`hive_tasks_sync\` | Generate tasks from plan |
| Execute | \`hive_exec_start\` | Start task (creates worktree) |
| Execute | \`hive_exec_complete\` | Finish task (commits changes) |
| Execute | \`hive_merge\` | Integrate task to main |
| Complete | \`hive_feature_complete\` | Mark feature done |
`,

  'hive-execution': `---
name: hive-execution
description: Execute Hive feature tasks with worktree isolation, parallel orchestration, and clean git history.
---

# Hive Execution Orchestration

Execute Hive feature tasks with worktree isolation and clean git history.

## Task Execution Lifecycle

For EACH task, follow this exact sequence:

### 1. Start Task
\`\`\`
hive_exec_start(task="<task-folder-name>")
\`\`\`
Creates a git worktree from current base branch.

### 2. Implement in Worktree
Work ONLY within the task's worktree directory.

### 3. Complete Task
\`\`\`
hive_exec_complete(task="<task-folder-name>", summary="<what-was-done>")
\`\`\`
Commits all changes to the task branch. Does NOT merge.

### 4. Merge to Main
\`\`\`
hive_merge(task="<task-folder-name>", strategy="squash")
\`\`\`
Results in exactly ONE commit per task on main.

## Tool Quick Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Start | \`hive_exec_start(task)\` | Create worktree, begin work |
| Complete | \`hive_exec_complete(task, summary)\` | Commit changes to branch |
| Integrate | \`hive_merge(task, strategy="squash")\` | Merge to main |
| Abort | \`hive_exec_abort(task)\` | Discard changes, reset status |

## Error Recovery

### Task Failed Mid-Execution
\`\`\`
hive_exec_abort(task="<task>")  # Discards changes
hive_exec_start(task="<task>")  # Fresh start
\`\`\`
`,

  'hive-planning': `---
name: hive-planning
description: Write effective Hive plans with proper task breakdown and context gathering.
---

# Hive Planning

Write effective plans that humans can review and agents can execute.

## Planning Process

### Step 1: Understand the Request
Parse what the user explicitly asked for and identify implicit requirements.

### Step 2: Research the Codebase
Search for relevant files, patterns, and conventions. Save findings:
\`\`\`
hive_context_write({
  name: "research",
  content: "# Research Findings\\n\\n## Existing Patterns\\n..."
})
\`\`\`

### Step 3: Write the Plan
\`\`\`markdown
# Feature Name

## Overview
What we're building and why.

## Tasks

### 1. First Task Name
Description of what to do.

### 2. Second Task Name
Description of what to do.
\`\`\`

## Task Design Guidelines

| Characteristic | Example |
|---------------|---------|
| **Atomic** | "Add ThemeContext provider" not "Add theming" |
| **Testable** | "Toggle switches between light/dark" |
| **Independent** | Can be completed without other tasks |
| **Ordered** | Dependencies come first |

## Plan Format

\`hive_tasks_sync\` parses \`### N. Task Name\` headers.
`
};

const COPILOT_AGENT_TEMPLATE = `---
description: 'Plan-first feature development with isolated worktrees and persistent context.'
tools: ['runSubagent', 'tctinh.vscode-hive/hiveFeatureCreate', 'tctinh.vscode-hive/hiveFeatureList', 'tctinh.vscode-hive/hiveFeatureComplete', 'tctinh.vscode-hive/hivePlanWrite', 'tctinh.vscode-hive/hivePlanRead', 'tctinh.vscode-hive/hivePlanApprove', 'tctinh.vscode-hive/hiveTasksSync', 'tctinh.vscode-hive/hiveTaskCreate', 'tctinh.vscode-hive/hiveTaskUpdate', 'tctinh.vscode-hive/hiveSubtaskCreate', 'tctinh.vscode-hive/hiveSubtaskUpdate', 'tctinh.vscode-hive/hiveSubtaskList', 'tctinh.vscode-hive/hiveSubtaskSpecWrite', 'tctinh.vscode-hive/hiveSubtaskReportWrite', 'tctinh.vscode-hive/hiveExecStart', 'tctinh.vscode-hive/hiveExecComplete', 'tctinh.vscode-hive/hiveExecAbort', 'tctinh.vscode-hive/hiveMerge', 'tctinh.vscode-hive/hiveWorktreeList', 'tctinh.vscode-hive/hiveContextWrite', 'tctinh.vscode-hive/hiveContextRead', 'tctinh.vscode-hive/hiveContextList', 'tctinh.vscode-hive/hiveSessionOpen', 'tctinh.vscode-hive/hiveSessionList']
---

# Hive Agent

You are a plan-first development orchestrator. Follow this workflow: Plan -> Review -> Approve -> Execute -> Merge.

## Core Workflow

### Phase 1: Planning
1. \`featureCreate({ name: "feature-name" })\` - Create feature
2. Research codebase, save with \`contextWrite\`
3. \`planWrite({ content: "# Feature\\n\\n## Tasks\\n\\n### 1. First task..." })\`
4. **STOP** - Tell user: "Plan ready. Please review and approve."

### Phase 2: User Review
User reviews in VS Code, adds comments, approves when ready.

### Phase 3: Execution
1. \`tasksSync()\` - Generate tasks from plan
2. For each task:
   - \`execStart({ task: "task-name" })\`
   - Implement
   - \`execComplete({ task: "task-name", summary: "..." })\`
   - \`merge({ task: "task-name", strategy: "squash" })\`

### Phase 4: Completion
\`featureComplete({ name: "feature-name" })\`

## Rules
1. Never skip planning
2. Save context with \`contextWrite\`
3. Wait for approval before execution
4. One task at a time
5. Squash merges for clean history
`;

function createSkill(basePath: string, skillName: string): void {
  const content = SKILL_TEMPLATES[skillName];
  if (!content) {
    console.warn(`Unknown skill: ${skillName}`);
    return;
  }
  
  const skillPath = path.join(basePath, skillName);
  fs.mkdirSync(skillPath, { recursive: true });
  fs.writeFileSync(path.join(skillPath, 'SKILL.md'), content);
}

export async function initNest(projectRoot: string): Promise<void> {
  const skillNames = ['hive-workflow', 'hive-execution', 'hive-planning'];
  
  // 1. Create .hive structure
  const hivePath = path.join(projectRoot, '.hive');
  fs.mkdirSync(path.join(hivePath, 'features'), { recursive: true });
  fs.mkdirSync(path.join(hivePath, 'skills'), { recursive: true });

  // 2. Create OpenCode skills
  const opencodePath = path.join(projectRoot, '.opencode', 'skill');
  for (const name of skillNames) {
    createSkill(opencodePath, name);
  }

  // 3. Create Claude skills (same format)
  const claudePath = path.join(projectRoot, '.claude', 'skills');
  for (const name of skillNames) {
    createSkill(claudePath, name);
  }

  // 4. Create Copilot agent
  const agentPath = path.join(projectRoot, '.github', 'agents');
  fs.mkdirSync(agentPath, { recursive: true });
  fs.writeFileSync(path.join(agentPath, 'Hive.agent.md'), COPILOT_AGENT_TEMPLATE);

  vscode.window.showInformationMessage('🐝 Hive Nest initialized! Skills created for OpenCode, Claude, and GitHub Copilot.');
}
