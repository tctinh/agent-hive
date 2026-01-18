# Task: 03-rename-sessionopen-to-hivestatus-delete-sessionservice

## Feature: hive-tool-reduction

## Context

## omo-integration-research

# OmO Integration Research

> Research findings from exploring oh-my-opencode to understand how Hive should integrate.

## Core Philosophy

**Hive controls the chaos that uncontrolled agents create.**

| Layer | Role | Examples |
|-------|------|----------|
| OmO | Agent intelligence | Prometheus, Sisyphus, Oracle, Explore, Librarian |
| Hive | Structural discipline | Worktree isolation, plan approval, context persistence |

OmO agents are powerful but ephemeral. Hive gives them memory and safety.

---

## Point 1: Output Formats

### Discovery

VSCode's `hive_session_open` already has structured data internally:

```typescript
// packages/vscode-hive/src/tools/session.ts
interface SessionRefreshResult {
  feature: string;
  phase: 'planning' | 'approved' | 'executing' | 'done';
  planSummary: string | null;
  tasks: Array<{ name: string; status: string; folder: string }>;
  progress: { total: number; done: number; inProgress: number; pending: number };
  contextFiles: string[];
  warnings: string[];
  tips: string[];
}
```

### Problem

Data is converted to markdown string for output (lines 122-167).

### Solution

Return JSON directly. OmO agents can consume structured data without parsing markdown.

---

## Point 2: Context File Conventions

### Discovery

OmO's `directory-agents-injector` hook (183 lines):
- Triggers on Read tool execution
- Walks UP from file directory to project root
- Collects ALL `AGENTS.md` files along path
- Injects as `[Directory Context: {path}]\n{content}`
- Uses session cache to avoid re-injection
- Truncates if too long

### OmO Pattern

```
project/AGENTS.md              → Project-wide context
project/src/AGENTS.md          → src-specific context
project/src/components/AGENTS.md → Component context
```

Reading a file injects ALL ancestor AGENTS.md files in order.

### Hive Implication

Context files at `.hive/features/{f}/context/*.md`:
- Use plain markdown (OmO is format-agnostic)
- Include clear headers for sections
- Be self-contained (each file is isolated)

**No format changes needed** - OmO injects markdown as-is.

---

## Point 3: Plan Format Compatibility

### Discovery

Sisyphus uses `.sisyphus/plans/*.md` with TODO checkboxes:

```markdown
# {Plan Title}

## Context
[Background, constraints, research]

## Work Objectives
[Goals, deliverables, definition of done]

## TODOs
- [ ] 1. Task Name
  **What to do**: [steps]
  **Acceptance Criteria**: [verification]
  **Commit**: [message]

- [ ] 2. Another Task
  ...
```

Key directories:
- `.sisyphus/plans/` - Plan files
- `.sisyphus/drafts/` - Working drafts during planning
- `.sisyphus/notepads/{plan-name}/` - Learnings during execution

### Hive Current Format

Uses `### N. Task Name` headers:

```markdown
## Tasks

### 1. Task Name
Description...

### 2. Another Task
Description...
```

### Compatibility

Both formats work! 
- Hive parses `### N.` headers for task sync
- Sisyphus parses `- [ ] N.` checkboxes

**Recommendation**: Support BOTH patterns in `hive_tasks_sync`:
- `### N. Task Name` (current, VSCode sidebar friendly)
- `- [ ] N. Task Name` (Sisyphus compatible)

---

## Point 4: Integration Hooks

### Discovery

OmO uses system directives for agent behavior:
- `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - DELEGATION_REQUIRED]`
- `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - BOULDER_CONTINUATION]`
- `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - PROMETHEUS_READ_ONLY]`
- etc.

These are used for filtering system-generated vs user messages.

### Hive Opportunity

Could emit system directives:
- `[HIVE: PLAN_APPROVAL_REQUIRED]`
- `[HIVE: WORKTREE_ACTIVE path=/path]`
- `[HIVE: TASK_COMPLETE task=1]`

### Decision

**Skip for now** - this is over-engineering. JSON status output is sufficient for OmO agents. They can parse structured data.

---

## Summary: Required Changes

| Point | Finding | Action |
|-------|---------|--------|
| 1. Output format | Already structured internally | Change output from markdown to JSON |
| 2. Context conventions | OmO injects any markdown | No change - already compatible |
| 3. Plan format | Sisyphus uses checkboxes | Optional: Support both `###` and `- [ ]` |
| 4. Integration hooks | OmO uses system directives | Skip - JSON status sufficient |

---

## Key Files Referenced

| File | Purpose |
|------|---------|
| `oh-my-opencode/src/hooks/directory-agents-injector/index.ts` | AGENTS.md injection logic |
| `oh-my-opencode/src/shared/system-directive.ts` | System directive patterns |
| `packages/vscode-hive/src/tools/session.ts` | SessionRefreshResult interface |
| `packages/hive-core/src/services/sessionService.ts` | Session tracking (TO DELETE) |


---

## init-sidebar-research

# Init & Skill Setup Research

## User Requirement (Updated)

**Init button should be ALWAYS available**, not just when .hive doesn't exist.

Use cases:
- Initialize Hive in a new workspace
- Reinstall/update skills after Hive update
- Add skills to a new AI tool
- Fix corrupted skill files

The button should be a **persistent sidebar action**, not welcome content.

---

## VS Code Sidebar Action Patterns

### Option 1: View Title Actions (Recommended)

In `package.json`:
```json
{
  "contributes": {
    "menus": {
      "view/title": [
        {
          "command": "hive.initSkills",
          "when": "view == hive-features",
          "group": "navigation"
        }
      ]
    }
  }
}
```

This adds an icon button to the sidebar header (next to collapse/refresh).

### Option 2: Tree Item with Action

Add a permanent "Setup" item at the top of the tree:
```typescript
class SetupItem extends vscode.TreeItem {
  constructor() {
    super('🐝 Install Skills', vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'hive.initSkills',
      title: 'Install Hive Skills'
    };
    this.tooltip = 'Install/update Hive skills for OpenCode, Claude, Copilot';
  }
}
```

### Option 3: Both Welcome + Persistent

- Welcome content when no .hive (for new users)
- Title action always available (for skill management)

---

## Current initNest Command

`hive.initNest` does:
1. Create `.hive/features/`
2. Create `.hive/skills/`
3. Install OpenCode skill
4. Install Claude skill  
5. Install Copilot agent

**Proposal**: Split into two commands:

| Command | Purpose |
|---------|---------|
| `hive.initNest` | Create .hive structure (first-time setup) |
| `hive.initSkills` | Install/update skills only (can run anytime) |

Or keep as one command that:
- Creates .hive if not exists
- Always updates skills

---

## Skill Installation Locations

| Tool | Path | Template |
|------|------|----------|
| OpenCode | `.opencode/skill/hive/SKILL.md` | hive.md |
| Claude | `.claude/skills/hive/SKILL.md` | hive.md |
| Copilot | `.github/agents/Hive.agent.md` | copilot-agent.md |

---

## Implementation Recommendation

1. **Add view/title action** for persistent "Install Skills" button
2. **Keep welcome content** for first-time user guidance
3. **Single command** that handles both init and skill install
4. **Always overwrite skills** to ensure latest version

```json
{
  "contributes": {
    "commands": [
      {
        "command": "hive.initSkills",
        "title": "Install Hive Skills",
        "icon": "$(tools)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "hive.initSkills",
          "when": "view == hive-features",
          "group": "navigation"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "hive-features",
        "contents": "Welcome to Hive!\n\n[🐝 Initialize Workspace](command:hive.initNest)\n\nThis creates .hive/ and installs skills.",
        "when": "!hive.initialized"
      }
    ]
  }
}
```


## Completed Tasks

- 01-dependency-audit: ## Audit Complete

### SubtaskService (4 files)
- `hive-core/services/subtaskService.ts` - DELETE
- `hive-core/services/index.ts:4` - Remove export
- `vscode-hive/tools/subtask.ts` - DELETE
- `opencode-hive/index.ts:9,116` - Remove import/instantiate

### SessionService (4 files)
- `hive-core/services/sessionService.ts` - DELETE
- `hive-core/services/index.ts:8` - Remove export
- `opencode-hive/index.ts:11,118` - Remove import/instantiate
- `opencode-hive/e2e/plugin-smoke.test.ts:151` - Comment only, no change

### Subtask Extensive (EXPANDED SCOPE)
Beyond SubtaskService, also need to clean:
- `hive-core/types.ts:41` - Remove `subtasks` from Task type
- `hive-core/paths.ts:67-87` - Remove getSubtaskPath/Status/Spec/ReportPath
- `hive-core/taskService.ts:297-468` - Remove createSubtask, updateSubtask, deleteSubtask, getSubtask, writeSubtaskSpec/Report, readSubtaskSpec/Report
- `vscode-hive/sidebarProvider.ts` - SubtaskItem, subtaskCount, getSubtasksFromFolders
- 5 tool definitions in opencode-hive

### Context read/list
- REMOVE: opencode-hive tools, vscode-hive tools
- KEEP: contextService.list() method (used by session.ts:105, plan.ts:33,96)
- UPDATE: exec.ts:36 tip mentions context_read

### No unexpected dependencies found.
- 02-delete-subtaskservice-and-subtask-tools: ## Removed Subtask System (5 tools)

### Files Deleted
- `packages/hive-core/src/services/subtaskService.ts` (198 lines)
- `packages/vscode-hive/src/tools/subtask.ts` (116 lines)

### Files Modified
- `hive-core/services/index.ts` - Removed SubtaskService export
- `hive-core/services/taskService.ts` - Removed 182 lines of subtask methods
- `hive-core/types.ts` - Removed Subtask, SubtaskType, SubtaskStatus (19 lines)
- `hive-core/utils/paths.ts` - Removed subtask path functions (23 lines)
- `opencode-hive/index.ts` - Removed 5 tools, updated system prompt (140 lines)
- `vscode-hive/tools/index.ts` - Removed getSubtaskTools export

### System Prompt Updated
- Tool count: 24 → 18
- Removed subtask tools from table
- Removed "Subtasks & TDD" section
- Changed `hive_session_refresh` to `hive_status` in text

**Total: 670 deletions, 8 files changed**

