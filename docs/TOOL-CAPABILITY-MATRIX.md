# Hive Tool Capability Matrix

This document maps Hive tools against GitHub Copilot's built-in tools to identify overlaps and clarify tool responsibilities.

## GitHub Copilot Built-in Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `read` | Read file contents | Works in any directory including worktrees |
| `edit` | Edit/create files | Works in any directory including worktrees |
| `execute` | Run terminal commands | Tests, builds, git operations |
| `search` | Search codebase | Grep, file search |
| `runSubagent` | Parallel execution | Delegate tasks to sub-agents |
| `todo` | Track tasks in UI | Ephemeral, session-only |
| `memory` | Cross-session memory | May drift over time |
| `web` | Fetch web content | Documentation, research |

## Hive Tools - Final Decision

### Feature Domain (3 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveFeatureCreate` | Create new feature workspace | None | **KEEP** - Unique |
| `hiveFeatureList` | List all features | None | **KEEP** - Unique |
| `hiveFeatureComplete` | Mark feature done | None | **KEEP** - Unique |

**Rationale**: No Copilot equivalent. Essential for feature orchestration.

### Plan Domain (3 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hivePlanWrite` | Write plan.md | `edit` (partial) | **KEEP** - Manages plan lifecycle |
| `hivePlanRead` | Read plan + comments | `read` (partial) | **KEEP** - Includes comment parsing |
| `hivePlanApprove` | Approve plan for execution | None | **KEEP** - Unique workflow |

**Rationale**: Plan lifecycle is core to Hive. Comment integration is unique.

### Task Domain (3 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveTasksSync` | Generate tasks from plan | None | **KEEP** - Unique |
| `hiveTaskCreate` | Create manual task | None | **KEEP** - Unique |
| `hiveTaskUpdate` | Update task status | None | **KEEP** - Unique |

**Rationale**: Task management tied to plan parsing and worktree lifecycle.

### Subtask Domain (6 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveSubtaskCreate` | Create subtask | `todo` (partial) | **KEEP** - Persists, TDD workflow |
| `hiveSubtaskUpdate` | Update subtask status | `todo` (partial) | **KEEP** - Persists |
| `hiveSubtaskList` | List subtasks | `todo` (partial) | **KEEP** - Persists |
| `hiveSubtaskSpecWrite` | Write subtask spec | None | **KEEP** - Unique |
| `hiveSubtaskReportWrite` | Write subtask report | None | **KEEP** - Unique |

**Rationale**: Unlike Copilot's ephemeral `todo`, subtasks persist to disk. Enables TDD workflow with test → implement → verify cycle. Spec and report files provide audit trail.

### Exec Domain (3 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveExecStart` | Create worktree, begin task | None | **KEEP** - Unique |
| `hiveExecComplete` | Commit changes, mark done | None | **KEEP** - Unique |
| `hiveExecAbort` | Discard worktree | None | **KEEP** - Unique |

**Rationale**: Git worktree management is Hive's core differentiator. No Copilot equivalent.

### Merge Domain (2 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveMerge` | Merge task branch | `execute` (git merge) | **KEEP** - Handles worktree cleanup |
| `hiveWorktreeList` | List active worktrees | `execute` (git worktree list) | **KEEP** - Feature-scoped |

**Rationale**: While git commands are possible via `execute`, Hive tools manage the full worktree lifecycle including cleanup.

### Context Domain (3 tools) - KEEP ALL

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveContextWrite` | Write context file | `memory` (partial) | **KEEP** - Persists as files |
| `hiveContextRead` | Read context | `memory` (partial) | **KEEP** - Persists as files |
| `hiveContextList` | List context files | None | **KEEP** - Useful for sub-agents |

**Rationale**: Copilot's `memory` tool may drift over time and is not reliable for long-running features. Hive context persists as actual files in `.hive/features/<name>/context/`, providing:
- Reliable persistence across sessions
- Readable by sub-agents
- Git-trackable
- Human-readable audit trail

### Session Domain (2 tools) - REMOVE

| Tool | Purpose | Copilot Equivalent | Decision |
|------|---------|-------------------|----------|
| `hiveSessionOpen` | Open session, get context | Native session handling | **REMOVE** |
| `hiveSessionList` | List sessions | Native session handling | **REMOVE** |

**Rationale**: GitHub Copilot handles session management natively. These tools were designed for OpenCode's session model which differs from Copilot's. Removing reduces complexity.

## Summary

| Domain | Current | After Audit | Change |
|--------|---------|-------------|--------|
| Feature | 3 | 3 | - |
| Plan | 3 | 3 | - |
| Task | 3 | 3 | - |
| Subtask | 6 | 6 | - |
| Exec | 3 | 3 | - |
| Merge | 2 | 2 | - |
| Context | 3 | 3 | - |
| Session | 2 | 0 | -2 |
| **Total** | **24** | **22** | **-2** |

## Tool Responsibility Matrix

### Use Hive Tools For

- **Feature lifecycle**: Creating, tracking, completing features
- **Plan management**: Writing, reviewing, approving plans
- **Task orchestration**: Syncing tasks from plans, tracking progress
- **TDD subtasks**: Persistent test/implement/verify cycles
- **Worktree operations**: Creating, completing, aborting isolated work
- **Merging**: Integrating completed work
- **Feature context**: Persistent, file-based context for sub-agents

### Use Copilot Built-in Tools For

- **File operations**: `read`/`edit` for any file manipulation
- **Terminal**: `execute` for tests, builds, git commands
- **Research**: `web` for documentation lookup
- **Parallel work**: `runSubagent` for delegating tasks
- **Quick tracking**: `todo` for ephemeral in-session tracking
- **Search**: Finding code, files in workspace

### Interplay Example

```
1. hiveFeatureCreate("auth")           # Hive: Create feature
2. hiveContextWrite("architecture")    # Hive: Save research
3. hivePlanWrite(content)              # Hive: Write plan
4. User reviews, approves
5. hiveTasksSync()                     # Hive: Generate tasks
6. hiveExecStart("01-auth-service")    # Hive: Create worktree
7. read/edit/execute                   # Copilot: Do work in worktree
8. hiveExecComplete("01-auth-service") # Hive: Commit changes
9. hiveMerge("01-auth-service")        # Hive: Integrate to main
```
