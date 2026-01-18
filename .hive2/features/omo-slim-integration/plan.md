# OMO-Slim Integration

## Overview

Integrate oh-my-opencode-slim with Hive so that when both plugins are installed:
- `hive_exec_start` spawns worker agents via OMO-Slim's `background_task`
- Workers appear in tmux panes for real-time visibility
- **Hybrid mode**: workers use `question` tool to ask user for decisions, pause at checkpoints
- Deep integration: workers receive full task context (worktree path, plan, context files)

This gives us the best of both worlds: Hive's structured workflow + OMO-Slim's agent execution layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenCode (Tmux)                             │
├───────────────────────┬─────────────────────────────────────────┤
│   Main Pane           │   Worker Panes (via OMO-Slim)           │
│   ───────────────     │   ─────────────────────────────────     │
│   Orchestrator        │   [Task 1] explore agent                │
│                       │   [Task 2] frontend agent               │
│   hive_exec_start ────┼──► Spawns background_task               │
│                       │   OMO-Slim opens tmux pane              │
│                       │                                         │
│   question tool ◄─────┼─── Worker asks: "Which approach?"       │
│   User answers ───────┼──► Worker continues with answer         │
│                       │                                         │
│   Watch & review      │   Worker writes CHECKPOINT → pauses     │
│   hive_exec_complete  │   User reviews → continues              │
└───────────────────────┴─────────────────────────────────────────┘
```

## Detection Logic

```typescript
// In opencode-hive plugin registration
const hasOmoSlim = context.tools?.has('background_task');
export const execMode = hasOmoSlim ? 'delegated' : 'inline';
```

- **Delegated mode**: `hive_exec_start` spawns via `background_task`, returns task_id
- **Inline mode**: Current behavior (same session works on task)

## Tasks

### 1. Add OMO-Slim detection in opencode-hive

In `packages/opencode-hive/src/index.ts`:
- Check if `background_task` tool exists during plugin init
- Export `execMode: 'delegated' | 'inline'` 
- Store reference to call background_task if available

### 2. Create agent selection logic

Add `src/utils/agent-selector.ts`:
- Pattern match task name + spec to select agent type
- Mappings: test→explore, ui/component→frontend, docs→document-writer, refactor→code-simplicity-reviewer, research→librarian
- Default to `general` for implementation tasks

### 3. Create worker prompt template

Add `src/templates/worker-prompt.ts`:
- Inject feature name, task name, worktree path
- Include plan content and context files
- Document **question tool protocol** (ask user for decisions)
- Document checkpoint protocol (write CHECKPOINT file for major pauses)
- Document completion protocol (call hive_exec_complete)

Worker prompt includes:
```markdown
## Human-in-the-Loop Protocol

You have access to the `question` tool. USE IT when you need:
- Clarification on requirements
- Decision between multiple valid approaches
- Approval before destructive/irreversible actions
- Input on design choices

Example:
question({
  questions: [{
    header: "Approach",
    question: "Should I use Context API or Zustand for state management?",
    options: [
      { label: "Context API", description: "Built-in, simpler, good for small state" },
      { label: "Zustand", description: "External lib, more features, better for complex state" }
    ]
  }]
})

For MAJOR checkpoints (before commit, architecture decisions), also write CHECKPOINT file.
```

### 4. Modify hive_exec_start for delegated mode

Update exec tool:
- Create worktree (existing logic)
- If delegated mode: build prompt, select agent, call background_task(sync: false)
- Return { worktreePath, branch, taskId, agent, mode: 'delegated' }
- If inline mode: current behavior

### 5. Add checkpoint file watcher

Create `src/features/checkpoint-monitor.ts`:
- Watch for CHECKPOINT file in active worktrees
- Parse checkpoint content (reason, status, next)
- Expose via hive_worker_status tool

### 6. Configure worker tool access

When spawning worker, configure tools:

**ALLOW (worker can use):**
- `question` - Ask user for decisions (KEY for hybrid mode!)
- `hive_exec_complete` - Signal task done
- `hive_exec_abort` - Bail out on error
- `hive_plan_read` - Understand context
- `hive_context_write` - Save learnings
- `hive_context_read` - Read context files
- All standard tools (read, write, edit, bash, glob, grep, etc.)
- OMO-Slim tools (LSP, ast-grep, grep, etc.)

**DENY (prevent recursion/escalation):**
- `hive_exec_start` - No spawning sub-workers
- `hive_merge` - Only orchestrator merges
- `hive_feature_create/complete` - Only orchestrator manages features
- `background_task` - No recursive delegation

### 7. Add hive_worker_status tool

New tool to check delegated worker status:
- Returns: task, sessionId, agent, status (running/checkpoint/completed/failed)
- If checkpoint: includes reason, status, next from CHECKPOINT file
- Shows if worker is waiting on question response

### 8. Update documentation

Update skill templates and README:
- Document delegated vs inline mode
- Explain tmux pane visibility
- **Document question tool usage for workers**
- Checkpoint protocol for major decisions

### 9. Integration testing

Manual end-to-end test:
- Install both plugins, create feature, approve plan
- Run hive_exec_start, verify tmux pane opens
- Watch worker, verify it asks questions via UI
- Answer question, verify worker continues
- Trigger checkpoint, verify pause
- Complete task, verify commits on branch

## Decisions Made

1. **Checkpoint timeout**: Infinite wait (user must explicitly continue)
2. **Worker crash**: Mark as `failed`, preserve worktree for debugging
3. **Parallel workers**: Yes, allow multiple hive_exec_start spawning parallel workers
4. **Question tool**: Workers MUST use it for decisions, keeping human in the loop

## Non-Goals

- Modifying OMO-Slim source code
- Auto-merging completed tasks
- Complex orchestration (keep it simple for v1)
