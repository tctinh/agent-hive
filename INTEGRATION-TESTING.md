# OMO-Slim Integration Testing

## Prerequisites

1. Install both plugins in OpenCode config:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hive", "oh-my-opencode-slim"]
}
```

2. Run OpenCode in tmux for pane visibility:
```bash
tmux new-session -s opencode
opencode
```

---

## Test Cases

### Test 1: OMO-Slim Detection

**Action**: Start OpenCode with both plugins
**Expected**: Console log shows `[hive] OMO-Slim detected - delegated execution mode enabled`

**Action**: Call `hive_status`
**Expected**: Response includes:
```json
{
  "execution": {
    "mode": "delegated",
    "omoSlimAvailable": true
  }
}
```

### Test 2: Delegated hive_exec_start

**Setup**: Create feature and approve plan with a task

**Action**: Call `hive_exec_start({ task: "01-some-task" })`

**Expected**:
- Returns markdown with "Delegated Execution Mode" heading
- Shows selected agent based on task content
- Provides `background_task` call template
- Worktree created at `.hive/.worktrees/<feature>/<task>`

### Test 3: Worker Spawning

**Action**: Copy the `background_task` call from Test 2 and execute it

**Expected**:
- New tmux pane opens automatically
- Worker session visible in the pane
- Worker starts executing the task

### Test 4: Human-in-the-Loop (question tool)

**Action**: Give worker a task that requires a decision

**Expected**:
- Worker calls `question` tool
- Question UI appears in main OpenCode session
- User can select an option
- Worker continues with the selected option

### Test 5: Checkpoint Protocol

**Action**: Watch worker reach a major milestone

**Expected**:
- Worker writes CHECKPOINT file: `.hive/.worktrees/<feature>/<task>/.hive/CHECKPOINT`
- Worker pauses execution
- `hive_worker_status` shows `status: "checkpoint"`

### Test 6: hive_worker_status

**Action**: While worker is running, call `hive_worker_status()`

**Expected**:
```json
{
  "available": true,
  "execMode": "delegated",
  "workers": [{
    "task": "01-some-task",
    "status": "running",
    "worktreePath": "..."
  }],
  "summary": {
    "total": 1,
    "running": 1,
    "atCheckpoint": 0
  }
}
```

### Test 7: Worker Completion

**Action**: Let worker finish or have worker call `hive_exec_complete`

**Expected**:
- Worker calls `hive_exec_complete({ task: "...", summary: "..." })`
- Task status updated to "done"
- Worktree has commits on the task branch
- Tmux pane closes (or shows completion)

### Test 8: Inline Mode Fallback

**Action**: Call `hive_exec_start({ task: "...", inline: true })`

**Expected**:
- Even with OMO-Slim installed, forces inline mode
- Returns original format: "Worktree created at..."
- No `background_task` instructions

### Test 9: Without OMO-Slim

**Action**: Remove OMO-Slim from plugin config, restart OpenCode

**Expected**:
- `hive_status` shows `execMode: "inline"`
- `hive_exec_start` returns inline format
- `hive_worker_status` returns "OMO-Slim not installed" message

---

## Agent Selection Tests

| Task Name | Expected Agent |
|-----------|----------------|
| "Write unit tests for auth" | `explore` |
| "Create login component" | `frontend-ui-ux-engineer` |
| "Update README" | `document-writer` |
| "Refactor database layer" | `code-simplicity-reviewer` |
| "Research caching strategies" | `librarian` |
| "Implement user service" | `general` |

---

## Known Limitations

1. **Worker crash recovery**: If worker session crashes, must manually check worktree
2. **No parallel worker orchestration**: Multiple `hive_exec_start` calls work, but no coordination
3. **Checkpoint is file-based**: Workers must write CHECKPOINT file to pause

---

## Success Criteria

- [ ] OMO-Slim detected on startup
- [ ] Delegated mode returns background_task instructions
- [ ] Worker spawns in tmux pane
- [ ] Worker can ask questions via question tool
- [ ] Worker writes CHECKPOINT and pauses
- [ ] hive_worker_status shows correct info
- [ ] Worker completion updates task status
- [ ] Inline mode works when forced
- [ ] Graceful fallback when OMO-Slim not installed
