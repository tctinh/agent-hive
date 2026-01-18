# Hive Queen Panel (Beekeeper's Observation Window)

> Issue: https://github.com/tctinh/agent-hive/issues/4
> Vision: The Beekeeper's unified view into the Nest - from Waggle Dance through Swarming
> Context: `.hive/features/hive-queen-panel/context/`

## Overview

Build a VS Code WebviewPanel that serves as the **Beekeeper's window into the Hive**. Watch the Waggle Dance (planning), approve when ready, then observe the Swarm (execution) and **steer the agent in real-time** via comments and answering questions.

This is NOT a task management dashboard. It's **mission control for the active Nest**.

### Philosophy Evolution

This feature evolves **P2: Plan → Approve → Execute** from binary to continuous:

| Old P2 | New P2 |
|--------|--------|
| Execution is autonomous | Execution is collaborative |
| Beekeeper watches only | Beekeeper steers and answers |
| Agent works blind | Agent asks when stuck |

### Terminology Strategy (Hybrid)

| Layer | Approach |
|-------|----------|
| Tool names | Technical (`hive_task_*`) |
| Tool descriptions | Technical + brief philosophy context |
| System prompt | Minimal mapping |
| Context files | Full philosophy details |

### Architecture (Filesystem-Mediated)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Agent          │     │    .hive/       │     │  Panel          │
│  (Copilot/OC)   │────▶│  (filesystem)   │◀────│  (VS Code)      │
│                 │◀────│                 │────▶│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     writes asks             shared state          answers asks
     reads answers           lock files            removes locks
```

## Tasks

### 1. Port panel infrastructure from seamless-agent

Copy and adapt WebviewPanel + assets:

**From seamless-agent**:
- `src/webview/planReviewPanel.ts` → `src/panels/HiveQueenPanel.ts`
- `media/planReview.html` → `media/hiveQueen.html`
- `media/planReview.css` → `media/hiveQueen.css`

**Key mechanics to port**:
- WebviewPanel with `retainContextWhenHidden: true`
- HTML template with nonce CSP
- PostMessage protocol
- State persistence

**Adaptations**:
- Rebrand to "Hive Queen"
- Add phase indicator (Planning/Execution)
- Add task progress section
- Add ask/answer section

**~400 lines to port/adapt**

### 2. Port file reference system (#filename)

Enable workspace file references in comments/answers:

**From**: `seamless-agent/src/webview/webviewProvider.ts`

- `#` trigger for autocomplete
- `searchFiles` using `vscode.workspace.findFiles()`
- Dropdown with file icon, name, path
- Selected files as attachments

**~100 lines**

### 3. Implement panel views

**Planning phase (Waggle Dance)**:
- Rendered plan.md with syntax highlighting
- Comments via existing `PlanCommentController` (already works!)
- Approve/Reject buttons → calls existing `PlanService.approve()`

**Execution phase (Swarming)**:
```
### 1. ✅ Port panel infrastructure            [DONE]
### 2. 🔄 Port file reference ←ACTIVE          [IN PROGRESS]
    ├─ 🧪 tests (done)
    ├─ ⚙️ impl (working...)  
    └─ 🔒 verify (pending)
### 3. ⏳ Implement panel views                 [PENDING]
```

- FileSystemWatcher on `.hive/features/{nest}/tasks/`
- Live task status updates
- Subtask progress display
- "View Report" when available

**~200 lines**

### 4. Integrate with hive-core services

Connect panel to existing services:

```typescript
import { FeatureService, PlanService, TaskService } from 'hive-core';

// Read state
const feature = featureService.getActive();
const plan = planService.read(feature);
const tasks = taskService.list(feature);

// Already exists, just wire up
```

**New service**: `AskService` (see Task 5)

**~50 lines integration code**

### 5. Implement ask/answer system

**Simple design**: ONE ask type - text question, text answer.

#### Ask file format
```json
{
  "id": "001",
  "question": "Should I use bcrypt or argon2 for hashing?",
  "context": "I see both in the codebase...",
  "task": "03-auth-middleware",
  "timestamp": 1234567890
}
```

#### Lock-based blocking
```
Agent                              Panel
  │                                  │
  ├─ write 001.json ────────────────►│
  ├─ write 001.lock                  │
  ├─ sleep loop...                   │◄─ FileSystemWatcher
  │   while (lock exists)            ├─ show question
  │     sleep(1s)                    │
  │                                  │◄─ user types answer
  │                                  ├─ write 001-answer.json
  │◄──────────────────── rm 001.lock─┤
  ├─ read answer                     │
  └─ continue                        │
```

#### AskService (hive-core)
```typescript
// packages/hive-core/src/services/askService.ts
export class AskService {
  create(question: string, context?: string): Promise<string>  // returns askId
  waitForAnswer(askId: string, timeout?: number): Promise<string>  // blocks
  answer(askId: string, response: string): Promise<void>  // removes lock
  listPending(): Promise<Ask[]>
  dismiss(askId: string): Promise<void>  // cleanup stale
}
```

#### hive_ask tool (vscode-hive)
```typescript
{
  name: 'hive_ask',
  displayName: 'Ask User',
  modelDescription: 'Ask user a question and BLOCK until they respond. Use when stuck or need direction. Don\'t guess - ask!',
  inputSchema: {
    question: { type: 'string', required: true },
    context: { type: 'string' },
    timeout: { type: 'number', default: 300 },
  },
  invoke: async ({ question, context, timeout }) => {
    const askId = await askService.create(question, context);
    const answer = await askService.waitForAnswer(askId, timeout);
    return JSON.stringify({ answer });
  }
}
```

**~150 lines total**

### 6. Implement hive_session_refresh tool

Returns ACTUAL feature-specific data (not generic):

```typescript
{
  name: 'hive_session_refresh',
  displayName: 'Refresh Context',
  modelDescription: 'Call periodically to stay aligned. Returns current status, user comments, pending asks, and what\'s already done.',
  invoke: async ({ feature }) => {
    return {
      feature: activeFeature.name,
      phase: planApproved ? 'execution' : 'planning',
      
      // Actual data
      planSummary: extractFirstParagraph(plan),
      progress: { completed: 3, total: 10 },
      currentTask: { name: 'Port file reference', status: 'in_progress' },
      
      // Context
      contextFiles: ['research-findings.md'],
      
      // User steering  
      recentComments: getCommentsLastHour(),
      pendingAsks: listPendingAsks(),
      
      // What's done
      completedTasks: getCompletedSummaries(),
      
      // Warnings
      warnings: contextFiles.length === 0 
        ? ['No context files - consider creating with hive_context_write']
        : [],
    };
  }
}
```

**~80 lines**

### 7. Add context reminders (warn, don't block)

**In hive_plan_write**:
```typescript
const contextFiles = await listContextFiles();
return {
  success: true,
  message: contextFiles.length === 0
    ? `Plan saved. 
       
       ⚠️ No context files yet. Workers need context to execute well.
       Use hive_context_write to save your research findings.
       You can add context anytime - even after plan approval.`
    : `Plan saved. Context files: ${contextFiles.join(', ')}`,
};
```

**In hive_session_refresh** (during any phase):
```typescript
warnings: contextFiles.length === 0
  ? ['No context files - use hive_context_write to document research, patterns, decisions']
  : []
```

**Key insight**: Context can be added anytime, even during execution. Just remind, never block.

**~20 lines additions**

### 8. Enhanced tool hints

Update existing tools to nudge refresh and context:

**In hive_exec_start**:
```typescript
message: `Worktree created at ${path}.
          
          Next: Check spec.md for requirements.
          Tip: Call hive_session_refresh to see user comments.
          Remember: Use hive_ask if stuck - don't guess.`
```

**In hive_exec_complete**:
```typescript
message: `Task complete. Summary saved.
          
          Next: Use hive_merge to integrate, or start next task.
          Tip: Update context files if you learned something useful.`
```

**Pattern**: Each tool output includes next step + tip + reminder

**~50 lines additions across tools**

### 9. Update system prompt (minimal)

Add to HIVE_SYSTEM_PROMPT:

```typescript
const HIVE_ADDITIONS = `
## Staying Aligned

- Call hive_session_refresh periodically to check for user steering
- Use hive_ask when stuck - don't guess, ask the user
- Save research to context files - workers need this info

## Quick Reference

| Term | Meaning |
|------|---------|
| Nest | Feature you're working on |
| Waggle Dance | Planning phase |
| Swarming | Execution phase |
| Beekeeper | The user (they steer, you build) |
`;
```

**~20 lines addition to system prompt**

### 10. Register commands and polish

- Command: `hive.openQueenPanel` 
- Keybinding: `Cmd+Shift+H` / `Ctrl+Shift+H`
- Status bar: 🐝 with pending asks count
- Auto-refresh panel when `.hive/` changes

**~50 lines**

## File Structure

```
.hive/features/{nest}/
├── plan.md
├── plan-status.json        # existing
├── comments.json           # existing  
├── asks/                   # NEW
│   ├── 001.json           # question
│   ├── 001.lock           # blocking lock
│   └── 001-answer.json    # user's answer
├── context/
└── tasks/
```

## What We're NOT Building (v1)

- ❌ Hover-to-comment (use existing VS Code comments)
- ❌ Multiple ask types (just text question/answer)
- ❌ Blocking on missing context (just warn)
- ❌ Complex diff view for reviews (just ask questions)
- ❌ Full terminology in system prompt (keep minimal)

## Success Criteria

- [ ] Panel opens with `Cmd+Shift+H`
- [ ] Shows rendered plan.md
- [ ] Shows live task progress during execution
- [ ] Agent can call `hive_ask` and block until user answers
- [ ] Panel shows pending asks, user can answer
- [ ] Answer removes lock, agent continues
- [ ] `hive_session_refresh` returns actual feature data
- [ ] Tool hints remind about refresh and context
- [ ] Works with both Copilot and OpenCode

## Estimates

| Task | Lines | Complexity |
|------|-------|------------|
| 1. Port panel | ~400 | Medium (mostly copy) |
| 2. File reference | ~100 | Low |
| 3. Panel views | ~200 | Medium |
| 4. Service integration | ~50 | Low |
| 5. Ask system | ~150 | Medium |
| 6. Session refresh | ~80 | Low |
| 7. Context reminders | ~20 | Low |
| 8. Tool hints | ~50 | Low |
| 9. System prompt | ~20 | Low |
| 10. Commands | ~50 | Low |
| **Total** | **~1100** | **Medium** |

## References

### Existing (leverage, don't rebuild)
- `PlanCommentController` - VS Code native comments (works!)
- `PlanService.approve()` - Approval flow (works!)
- `PlanService.getComments()` - Comment storage (works!)
- Tool registration pattern in `tools/*.ts`
- Tool hints pattern in `exec.ts`

### From seamless-agent (port)
- `planReviewPanel.ts` - Panel mechanics
- `planReview.html/css` - UI template
- `webviewProvider.ts` - File search

### From hive-core (integrate)
- `featureService.ts`
- `planService.ts`
- `taskService.ts`
- `contextService.ts`
