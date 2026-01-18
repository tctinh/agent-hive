# Communication Architecture: File-Based Agent Steering

## The Constraint

We cannot:
- Send messages to agents (OpenCode, Copilot, Claude, etc.)
- Interrupt their execution mid-task
- Modify their behavior at runtime
- Push notifications to them

We CAN:
- Create tools that agents call
- Have tools check filesystem state before proceeding
- Return blocking responses that halt agent progress
- Inject prompts (via system prompts, CLAUDE.md, etc.) teaching tool usage
- Use `.hive/` as the communication medium

## The Pattern: Filesystem as Message Bus

```
┌─────────────────┐                    ┌─────────────────┐
│   BEEKEEPER     │                    │     AGENT       │
│  (VSCode Ext)   │                    │ (OpenCode/etc)  │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │  WRITES                              │  READS (via tools)
         ▼                                      ▼
    ┌─────────────────────────────────────────────────┐
    │              .hive/ FILESYSTEM                   │
    ├─────────────────────────────────────────────────┤
    │  comments/<id>.json    ← blockers live here     │
    │  pause-signal          ← presence = paused      │
    │  priority.json         ← task ordering          │
    │  steering/             ← steering instructions  │
    └─────────────────────────────────────────────────┘
         ▲                                      │
         │  READS (watcher)                     │  WRITES
         │                                      ▼
┌────────┴────────┐                    ┌────────┴────────┐
│   BEEKEEPER     │                    │     AGENT       │
│  sees changes   │                    │  reports status │
└─────────────────┘                    └─────────────────┘
```

## How Agents "Receive" Messages

Agents don't receive messages - they **poll via tools**:

1. Agent calls `hive_session_open()` at start
2. Tool reads `.hive/` and returns current state including blockers
3. Agent calls `hive_exec_start(task)` before working
4. Tool checks for blockers, pause-signal, etc.
5. If blocker exists → tool returns blocking response
6. Agent MUST handle this (via prompt injection teaching)

## The Blocking Response Pattern

```typescript
// In hive_exec_start
const blockers = await commentService.getBlockers(feature, task);
if (blockers.length > 0) {
  return {
    success: false,
    blocked: true,
    reason: "BLOCKED_BY_REVIEW",
    blockers: blockers.map(b => ({
      id: b.id,
      priority: b.priority,  // 'blocker'
      body: b.body,
      file: b.target.file,
      line: b.target.line
    })),
    instruction: "Address these blockers before proceeding. Use hive_comment_resolve(id) after fixing each issue."
  };
}
```

## Prompt Injection (Teaching Agents)

In system prompts / CLAUDE.md / agents.md:

```markdown
## Hive Integration

Before starting any task:
1. Call `hive_session_open()` to get current state
2. Check for blockers in the response
3. If blocked, address blockers first

During execution:
- Call `hive_exec_start(task)` before working on a task
- If response.blocked === true, STOP and address blockers
- After fixing, call `hive_comment_resolve(blockerId)`

After completion:
- Call `hive_exec_complete(task, summary)`
- Wait for review verdict before merge
```

## Steering Without Interruption

Since we can't interrupt, we inject "checkpoints" via tools:

| Checkpoint | When Agent Calls | What We Check |
|------------|------------------|---------------|
| Session start | `hive_session_open` | Blockers, steering state |
| Task start | `hive_exec_start` | Task-specific blockers, pause |
| Periodic | `hive_session_refresh` | New comments, priority changes |
| Task end | `hive_exec_complete` | Triggers review |

## Key Insight

The **tool response is our only communication channel** back to the agent.

Therefore:
- Every tool should check for pending feedback
- Blocking responses must include clear instructions
- Agents must be taught (via prompts) to respect these patterns

## Implementation Implications

1. **CommentService** must be efficient (agents call frequently)
2. **Blocking responses** must be structured and actionable
3. **System prompts** must teach the polling pattern
4. **No websockets/push** - everything is pull-based via tool calls
