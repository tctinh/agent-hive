# Task: 09-remove-session-complexity

## Feature: queen-panel-dashboard-mode

## Context

## copilot-orchestra-insights

# Copilot Orchestra Insights

## Source
https://github.com/ShepAlderson/copilot-orchestra
(Cloned to /home/tctinh/agent-hive/copilot-orchestra/)

## What It Is

A multi-agent orchestration system using VSCode Insiders' custom chat modes (`.agent.md` files).

## Architecture

```
CONDUCTOR (Sonnet 4.5)
├── planning-subagent (Sonnet 4.5) - Research, 90% confidence rule
├── implement-subagent (Haiku 4.5) - TDD execution, minimal code
└── code-review-subagent (Sonnet 4.5) - Quality gate
```

## Workflow

```
User Request
    ↓
CONDUCTOR → planning-subagent (research)
    ↓
CONDUCTOR creates plan
    ↓
USER APPROVAL (mandatory pause)
    ↓
For each phase:
    ├── CONDUCTOR → implement-subagent (TDD)
    ├── CONDUCTOR → code-review-subagent
    │       ├── APPROVED → proceed
    │       ├── NEEDS_REVISION → back to implement
    │       └── FAILED → consult user
    └── USER COMMIT (mandatory pause)
    ↓
Final completion report
```

## Key Patterns

### 1. Mandatory Pause Points
- After plan presentation (before implementation)
- After each phase (before commit)
- On FAILED review status

### 2. Structured Review Verdict
```
Status: APPROVED | NEEDS_REVISION | FAILED
Summary: Brief assessment
Strengths: What was done well
Issues: [CRITICAL|MAJOR|MINOR] with file/line refs
Recommendations: Actionable suggestions
Next Steps: What conductor should do
```

### 3. TDD Enforcement
1. Write failing tests first
2. Run tests → confirm fail
3. Write minimal code
4. Run tests → confirm pass
5. Lint/format

### 4. 90% Confidence Rule (Planning)
Stop research when you can answer:
- What files/functions are relevant?
- How does existing code work?
- What patterns/conventions does codebase use?
- What dependencies are involved?

### 5. Model Selection by Role
- Planning: Sonnet 4.5 (comprehensive analysis)
- Implementation: Haiku 4.5 (efficient execution)
- Review: Sonnet 4.5 (thorough assessment)

## Artifacts Generated

```
plans/
├── {task-name}-plan.md           # Approved plan
├── {task-name}-phase-N-complete.md  # Per-phase completion
└── {task-name}-complete.md       # Final summary
```

## Hive Integration Opportunities

| Orchestra | Hive | Status |
|-----------|------|--------|
| Conductor | Hive Queen | ✅ Have |
| planning-subagent | explore/librarian agents | ✅ Have |
| implement-subagent | sisyphus_task workers | ✅ Have |
| code-review-subagent | ❌ | **Add** |
| Mandatory pauses | Queen Panel steering | In progress |
| NEEDS_REVISION | Blocker priority | In progress |
| Phase completion docs | Task reports | ✅ Have |

## Key Takeaway

The **code-review-subagent** pattern is the missing piece. Every task should have:
1. Implementation
2. Automated review with structured verdict
3. If NEEDS_REVISION → blocker comment → halt
4. If APPROVED → proceed

This creates a quality gate that the blocker system can leverage.


---

## file-based-communication-architecture

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


---

## tool-response-architecture

# Tool Response Architecture Analysis

## Current Pattern

**All hive tools return plain strings**, not structured objects.

### Response Patterns

| Pattern | Example |
|---------|---------|
| Error | `"Error: No feature specified. Create a feature..."` |
| Success | `"Feature \"name\" created. Status: planning. Write a plan with hive_plan_write."` |
| Info | Multi-line markdown-formatted string |

### Key Tools Examined

1. **hive_feature_create** (line 170-180)
   - Returns: `Feature "name" created. Status: planning. Write...`
   
2. **hive_exec_start** (line 310-360)
   - Creates worktree
   - Updates task status to `in_progress`
   - Generates spec.md with context
   - Returns: `Worktree created at {path}\nBranch: {branch}\nBase commit: {commit}...`

3. **hive_task_update** (line 291-308)
   - Returns: `Task "name" updated: status={status}`

4. **hive_exec_complete** (line 362-420)
   - Commits changes
   - Gets diff
   - Writes report.md
   - Returns: multi-line summary

5. **hive_session_open** (around line 550)
   - Returns: formatted feature info, plan, tasks, context, sessions

### System Prompt Injection

At line 148-167, there's a hook that injects status into system prompts:
```typescript
"experimental.chat.system.transform": async (_input, output) => {
  output.system.push(HIVE_SYSTEM_PROMPT);
  
  if (activeFeature) {
    let statusHint = `### Current Hive Status\n`;
    statusHint += `**Active Feature**: ${info.name} (${info.status})\n`;
    statusHint += `**Progress**: ${done}/${total} tasks\n`;
    
    if (info.commentCount > 0) {
      statusHint += `**Comments**: ${info.commentCount} unresolved...`;
    }
  }
}
```

This is where we ALREADY inject hints about comments. We can extend this for blockers.

## Blocker Injection Points

### 1. System Prompt Hook (Proactive)
Extend the `system.transform` hook to include blocker warnings:
```typescript
if (blockers.length > 0) {
  statusHint += `⚠️ **BLOCKERS**: ${blockers.length} - HALT and address before proceeding\n`;
}
```

### 2. Tool Response (Reactive)
Modify tools to check blockers and return blocking responses:
```typescript
// In hive_exec_start
const blockers = commentService.getBlockers(feature, task);
if (blockers.length > 0) {
  return `⛔ BLOCKED: Cannot start task "${task}"\n\n` +
    `${blockers.length} unresolved blockers:\n` +
    blockers.map(b => `- [${b.priority}] ${b.body}`).join('\n') +
    `\n\nResolve blockers with hive_comment_resolve(id) before proceeding.`;
}
```

### 3. New Polling Tool
Add `hive_check_blockers(feature?)` that agents can call:
```typescript
hive_check_blockers: tool({
  description: 'Check for unresolved blockers that require attention',
  args: { feature: tool.schema.string().optional() },
  async execute({ feature }) {
    const blockers = commentService.getBlockers(feature);
    if (blockers.length === 0) return "No blockers. Proceed with work.";
    return formatBlockersMessage(blockers);
  }
})
```

## Recommendation

The current architecture is **string-based**, which is simple but sufficient.

For blockers:
1. **System prompt** already injects comment count - extend for blockers
2. **Tool responses** can include blocker warnings as formatted strings
3. **Agents parse strings** (they're LLMs, they can handle text)

No need for structured JSON responses - the string format works with how LLMs process tool results.

## Integration Points (Priority Order)

| Priority | Tool | Change |
|----------|------|--------|
| P1 | `hive_session_open` | Return blocker list in response |
| P1 | `hive_exec_start` | Block if task has blockers |
| P2 | `system.transform` | Warn about blockers in system prompt |
| P2 | `hive_task_update` | Check blockers before status change |
| P3 | `hive_check_blockers` | New dedicated polling tool |


---

## ui-ux-design-reference

# UI/UX Design Reference: Mission Control Dashboard

## Source Analysis

Analyzed:
1. **seamless-agent** - planReview panel (HTML + CSS + TS)
2. **hive-queen-panel** - Current implementation (ported from seamless-agent)
3. **copilot-orchestra** - Workflow patterns

---

## Design System (from seamless-agent)

### Color Variables (VSCode Theme Integration)
```css
:root {
    --container-padding: 20px;
    --line-hover-bg: var(--vscode-list-hoverBackground);
    --comment-btn-bg: var(--vscode-button-secondaryBackground);
    --dialog-bg: var(--vscode-editor-background);
    --dialog-border: var(--vscode-panel-border);
    --comment-card-bg: var(--vscode-editorWidget-background);
    --comment-card-border: var(--vscode-editorWidget-border);
}
```

### Layout Pattern
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Title + Actions (buttons aligned right)            │
│  background: --vscode-sideBar-background                    │
│  border-bottom: 1px solid --vscode-panel-border             │
├─────────────────────────────────────────────────────────────┤
│  CONTENT-WRAPPER (flex: row)                                │
│  ┌───────────────────────────────┬─────────────────────────┐│
│  │  MAIN CONTENT (flex: 1)       │  SIDEBAR (320px fixed)  ││
│  │  - Scrollable                 │  - Comments list        ││
│  │  - Padding: 20px              │  - Scrollable           ││
│  │                               │                         ││
│  └───────────────────────────────┴─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Button Styles
```css
.btn {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
}

.btn-icon {
    background: transparent;
    padding: 4px;
    border-radius: 4px;
}
```

---

## Component Patterns

### 1. Line-Hover Comment Button
```html
<div class="line-wrapper" data-line="42">
  <p>Plan content here...</p>
  <button class="add-comment-btn" title="Add comment">
    <span class="codicon codicon-comment"></span>
  </button>
</div>
```
- Button hidden by default, appears on hover
- Position: absolute, right: 8px, centered vertically
- Transition: opacity 0.15s

### 2. Comment Card
```html
<div class="comment-card">
  <div class="comment-citation">Line 42: "implement auth..."</div>
  <div class="comment-text">This should handle null case</div>
  <div class="comment-actions">
    <button>Edit</button>
    <button>Remove</button>
  </div>
</div>
```
- Background: --vscode-editorWidget-background
- Border: 1px solid --vscode-editorWidget-border
- Border-radius: 6px

### 3. Dialog Modal
```html
<div class="dialog-overlay">
  <div class="dialog">
    <div class="dialog-header">
      <h3>Add Comment</h3>
      <button class="btn-icon"><span class="codicon codicon-close"></span></button>
    </div>
    <div class="dialog-content">
      <div class="citation-preview">Selected text...</div>
      <textarea class="comment-textarea" placeholder="Enter feedback..."></textarea>
    </div>
    <div class="dialog-actions">
      <button class="btn btn-primary">Save</button>
      <button class="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```
- Overlay: rgba(0,0,0,0.5)
- Dialog: 90% width, max-width 500px
- Border-radius: 8px

### 4. Task Progress Cards (from hive-queen)
```html
<div class="task-item in_progress">
  <div class="task-name">01-implement-auth</div>
  <div class="task-status">In Progress</div>
  <div class="subtask-list">
    <div class="subtask-item done">Write tests</div>
    <div class="subtask-item in_progress">Implement</div>
  </div>
</div>
```
Status colors:
- pending: --vscode-descriptionForeground
- in_progress: --vscode-editorInfo-foreground
- done: --vscode-testing-iconPassed
- blocked: --vscode-editorError-foreground

---

## NEW: Dashboard Mode Components

### Feature Card (NEW)
```html
<div class="feature-card planning">
  <div class="feature-header">
    <span class="feature-icon codicon codicon-edit"></span>
    <h3 class="feature-name">post-merge-review-flow</h3>
  </div>
  <div class="feature-meta">
    <span class="feature-status">📝 Planning</span>
    <span class="feature-progress">0/10 tasks</span>
  </div>
  <div class="feature-blockers" data-count="2">
    <span class="codicon codicon-warning"></span> 2 blockers
  </div>
</div>
```

CSS:
```css
.feature-card {
  padding: 16px;
  border-radius: 8px;
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.feature-card:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-2px);
}

.feature-card.planning {
  border-left: 4px solid var(--vscode-editorInfo-foreground);
}

.feature-card.executing {
  border-left: 4px solid var(--vscode-editorWarning-foreground);
}

.feature-card.completed {
  border-left: 4px solid var(--vscode-testing-iconPassed);
}
```

### Feature Grid Layout (NEW)
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 20px;
}
```

### Feature Picker Dropdown (NEW)
```html
<div class="feature-picker">
  <button class="feature-picker-btn">
    <span class="codicon codicon-chevron-down"></span>
    post-merge-review-flow
  </button>
  <div class="feature-picker-dropdown hidden">
    <div class="feature-picker-item active">post-merge-review-flow</div>
    <div class="feature-picker-item">queen-panel-dashboard-mode</div>
    <hr>
    <div class="feature-picker-item">
      <span class="codicon codicon-home"></span> All Features
    </div>
  </div>
</div>
```

### Blocker Badge (NEW)
```html
<span class="blocker-badge">
  <span class="codicon codicon-error"></span>
  <span class="blocker-count">2</span>
</span>
```

CSS:
```css
.blocker-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
  border-radius: 12px;
  font-size: 12px;
}
```

### Review Verdict Card (NEW)
```html
<div class="verdict-card needs-revision">
  <div class="verdict-header">
    <span class="codicon codicon-warning"></span>
    <h3>NEEDS_REVISION</h3>
  </div>
  <div class="verdict-summary">Auth logic looks good but...</div>
  <div class="verdict-issues">
    <div class="issue critical">
      <span class="issue-badge">CRITICAL</span>
      <span class="issue-location">src/auth.ts:42</span>
      <span class="issue-message">SQL injection vulnerability</span>
    </div>
    <div class="issue major">
      <span class="issue-badge">MAJOR</span>
      <span class="issue-location">src/auth.ts:78</span>
      <span class="issue-message">Missing null check</span>
    </div>
  </div>
</div>
```

---

## Panel Modes Summary

| Mode | Header | Main Content | Sidebar | Actions |
|------|--------|--------------|---------|---------|
| Dashboard | "🐝 Mission Control" | Feature grid | None | + New Feature |
| Planning | Feature name + picker | Plan.md with line comments | Comments list | Approve / Request Changes |
| Execution | Feature name + status | Task progress cards | Steering controls | Pause / Resume |
| Review | Task name + "Review" | Diff view | Comment threads | Approve / NEEDS_REVISION |

---

## Responsive Behavior

```css
@media (max-width: 800px) {
  .content-wrapper {
    flex-direction: column;
  }
  
  .comments-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--vscode-panel-border);
    max-height: 40vh;
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Key Patterns from seamless-agent

1. **PlanReviewPanel class** - Static methods for show/showWithOptions
2. **Promise-based resolution** - Panel returns result when user acts
3. **_pendingResolvers Map** - Stores resolvers that survive panel close/reopen
4. **Message-based communication** - postMessage/onDidReceiveMessage
5. **Mode-based rendering** - 'review', 'summary', 'progress', 'walkthrough', 'display'
6. **Read-only mode** - Badge + disabled interactions
7. **Export functionality** - Save plan as markdown file

---

## Key Patterns from Orchestra

1. **Structured verdict** - APPROVED / NEEDS_REVISION / FAILED
2. **Issue severity** - CRITICAL / MAJOR / MINOR
3. **Phase completion docs** - Track progress per phase
4. **Mandatory pause points** - User must approve before continuing


---

## user-workflow-fleet-commander

# User Workflow: Fleet Commander Pattern

## Key Insight

The user deploys **multiple agent sessions in parallel** and manages them as a fleet.
This is NOT single-agent real-time steering. This is **async fleet management**.

## Actual Workflow

```
1. DEPLOY PHASE
   ├── Spin up Session A → Feature: auth-refactor
   ├── Spin up Session B → Feature: api-migration  
   ├── Spin up Session C → Feature: ui-polish
   └── Walk away / do other work

2. MONITOR PHASE (periodic, not constant)
   ├── Quick glance at plans → Spot wrong direction early
   ├── Check task progress → See what's done, what's stuck
   └── No need to watch in real-time

3. REVIEW PHASE
   ├── Look at worktree commits → What did agent actually change?
   ├── Read diffs per task → Quality check
   └── Decide: merge / request changes / abandon

4. PICKUP PHASE
   ├── Continue from where agent left off
   ├── Correct course if needed
   └── Close out feature when satisfied
```

## What Matters to This User

### HIGH PRIORITY
- **Fleet overview**: See all features at once with status
- **Quick plan scanning**: Catch "wrong direction" without deep reading
- **Worktree diff access**: One-click to see what agent changed
- **Task commit history**: Per-task changes, not just final result
- **Session pickup**: Resume context efficiently

### MEDIUM PRIORITY
- **Blocker system**: Mark issues for agent to address
- **Comments on specific code**: Feedback on diffs
- **Approval gates**: Formal "yes proceed" / "no stop"

### LOW PRIORITY (for this user)
- **Real-time steering**: Not watching agents work
- **Pause/resume buttons**: Agents are async anyway
- **Live updates**: Periodic refresh is fine

## Design Implications

### Dashboard Mode (HIGH VALUE)
```
┌─────────────────────────────────────────────────────────────┐
│  🐝 Hive Fleet Status                           [Refresh]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ auth-refactor   │  │ api-migration   │                  │
│  │ ⚡ Executing    │  │ ⚠️ Blocked      │ ← attention here │
│  │ 3/5 tasks       │  │ 2/8 tasks       │                  │
│  │ Last: 5min ago  │  │ Last: 2hr ago   │ ← stale = stuck  │
│  │ [View] [Diff]   │  │ [View] [Diff]   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ ui-polish       │  │ test-coverage   │                  │
│  │ ✅ Ready Review │  │ 📝 Planning     │                  │
│  │ 8/8 tasks       │  │ 0/0 tasks       │                  │
│  │ [Review Diffs]  │  │ [Open Plan]     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Quick Actions That Matter
- **[View]** → Open plan/task view for that feature
- **[Diff]** → Show all changes in worktree (aggregated)
- **[Review Diffs]** → Per-task diff review before merge
- **[Open Plan]** → Jump to plan.md for editing

### Signals That Matter
- **Last activity time** → Stale = stuck or waiting
- **Blocked status** → Needs attention
- **Ready for review** → Agent done, your turn
- **Task progress** → Quick health check

## What's NOT Needed

- Fancy animations
- Real-time updates (periodic refresh is fine)
- Complex steering controls
- Pause/resume (agents are async)

## Summary

Design for **async fleet management**, not **real-time single-agent control**.

The user's mental model:
> "I'm running a factory of agents. I check in periodically. 
>  I need to quickly see: who's stuck, who's done, who's going wrong.
>  Then I drill in only where needed."


---

## agent-perspective-analysis

# Agent Perspective Analysis

## What Hive Solves

| Limitation | How Hive Helps | Status |
|------------|----------------|--------|
| No persistent memory | Context files, plan, specs, reports | ✅ Solved |
| No scope limits | Worktree isolation, task focus | ✅ Solved |
| Can't course-correct | Blocker system, approval gates | ✅ Solved |
| No record of work | Task reports persist | ✅ Solved |
| No structure | Plan with task breakdown | ✅ Solved |
| Can't ask questions | `hive_ask_question` with lock pattern | ✅ Solved |
| Parallel conflicts | Queen orchestrates, workers isolated | ✅ Solved (by design) |
| Quality unknown | Review flow before merge | 🔄 In progress (this feature) |

## Remaining Challenge: Context Window

### The Problem

200k tokens sounds big, but:
- System prompt + tools: 10k
- Files read: 60k
- Tool outputs: 30k
- Conversation: 40k
- Code written: 20k
= 160k consumed, 40k left

Large tasks exhaust context before completion.

### Ideas for Future

| Idea | Description | Effort |
|------|-------------|--------|
| Subtask handoff notes | Each subtask starts fresh with summary of prior work | Low |
| External scratchpad | Write notes to file, not context | Low |
| Context pressure report | Tell agent how much window used | Low |
| Lazy context loading | Load context files on demand | Medium |
| Smart file reading | LSP-based relevant section extraction | Already available |

### Recommended Additions

1. **hive_scratchpad_write(key, notes)** - External memory
2. **hive_scratchpad_read(key)** - Retrieve without wasting window
3. **Subtask handoff field** - Summary for next subtask to read

These help agent manage long tasks without overflowing context.


---

## grounded-implementation-map

# Implementation Map

## 9 Tasks → 3 Files

| File | Tasks |
|------|-------|
| `opencode-hive/src/index.ts` | 5, 7, 9 |
| `vscode-hive/src/extension.ts` | 1, 4, 6 |
| `vscode-hive/src/panels/HiveQueenPanel.ts` | 2, 3, 5, 8 |

## Task Details

### Task 1: Remove gate
- **File**: `extension.ts` line 362-367
- **Change**: Delete if-block that requires active feature

### Task 2: Dashboard view
- **File**: `HiveQueenPanel.ts`
- **Add**: Mode `'dashboard'`
- **Data**: `fs.readdirSync('.hive/features/')` + read each
- **Show**: Cards with badges (blocked/review/active/stale)

### Task 3: Feature detail
- **File**: `HiveQueenPanel.ts`
- **Change**: Click card → show plan + tasks
- **Add**: Back to dashboard button

### Task 4: Diff view
- **File**: `extension.ts`
- **Add**: Command `hive.viewTaskDiff`
- **How**: `git diff main...branch` + `vscode.diff`

### Task 5: BLOCKED check
- **File**: `index.ts` (opencode-hive)
- **Where**: `hive_exec_start`
- **Check**: `fs.existsSync(BLOCKED)` → return message
- **Also**: Button in HiveQueenPanel

### Task 6: Status bar
- **File**: `extension.ts` line 86-134
- **Enhance**: Show `🐝 N | 🟡 N | ⛔ N`

### Task 7: hive_request_review
- **File**: `index.ts` (opencode-hive)
- **New tool** that:
  1. Appends to report.md
  2. Creates PENDING_REVIEW
  3. Polls until gone
  4. Returns REVIEW_RESULT

### Task 8: Review UI
- **File**: `HiveQueenPanel.ts`
- **Add**: Review panel mode
- **Show**: Summary, diff link, approve/changes buttons
- **Actions**: Write REVIEW_RESULT, delete PENDING_REVIEW

### Task 9: Remove sessions
- **File**: `index.ts` (opencode-hive)
- **Remove**: `hive_session_open`, `hive_session_list`
- **Keep**: Simple file reads via existing tools

## Key Patterns

### Polling block
```typescript
while (fs.existsSync(PENDING_REVIEW)) {
  await sleep(2000);
}
```

### BLOCKED check
```typescript
if (fs.existsSync(path.join(featureDir, 'BLOCKED'))) {
  return `⛔ BLOCKED: ${fs.readFileSync(...)}`;
}
```

### Append to report
```typescript
fs.appendFileSync(reportPath, `\n## Attempt ${n}\n${summary}\n`);
```

## Dependencies

```
Task 1 (gate)     → enables Task 2 (dashboard)
Task 2 (dashboard) → enables Task 3 (detail)
Task 7 (tool)     → enables Task 8 (UI)
Task 9 (cleanup)  → independent
Tasks 4,5,6       → independent
```


---

## philosophy

# Hive Philosophy

## Core Principle

**Human shapes, Agent details.**

```
NOT: Agent autonomous         → Slop
NOT: Human does everything    → No leverage  
YES: Human shapes, Agent details
```

## The Collaboration Model

| Phase | Human | Agent |
|-------|-------|-------|
| Requirements | Answers questions | Asks, organizes, synthesizes |
| Feature Setup | "I want X" | Creates feature, writes plan |
| Planning | Reviews, amends, comments | Revises based on feedback |
| Implementation | Reviews diff | Codes in worktree |
| Code Review | Approves/rejects | Fixes, iterates |

## Agent is a Tool, Not a Crew

No "Planner Agent" vs "Coder Agent" vs "Reviewer Agent".

Just: **Agent + Context = Behavior**

```
Same LLM + planning context = acts as planner
Same LLM + coding context   = acts as coder
Same LLM + review context   = acts as reviewer
```

Context shapes behavior. Skills provide context. Roles are unnecessary abstraction.

## Files Are The API

No databases. No APIs. No WebSockets.

```bash
# Block an agent
echo "Stop" > .hive/features/X/BLOCKED

# Request review
echo '{"summary":"..."}' > .../PENDING_REVIEW

# Approve
echo "APPROVED" > .../REVIEW_RESULT
rm .../PENDING_REVIEW
```

Polling. Files. Simple.

## No Session State

Agent starts fresh. Reads files. Works. Done.

If crash: Human restarts. Agent reads files again.

No resume logic. No crash recovery. No session tracking.

Files ARE the state.

## Simple Tools Beat Complex Tools

git > custom VCS
files > databases  
polling > websockets
terminal agent > IDE agent with 50 tools

The most effective tool is the simplest one that works.

## Human Is The Orchestrator

No multi-agent. No crews. No autonomous loops.

Human says: "Work on this task"
Agent works, requests review, blocks.
Human reviews, approves or rejects.
Agent continues or fixes.

Human controls the loop. Agent does the heavy lifting.


## Completed Tasks

- 01-remove-active-feature-gate: Removed active feature gate in openQueenPanel command. Now calls HiveQueenPanel.showDashboard() when no active feature instead of showing warning.
- 02-dashboard-view: Added dashboard mode to HiveQueenPanel showing all features as cards with status badges (blocked/pending review/stale). Added showDashboard static method, FeatureCard types, message handlers for openFeature/backToDashboard/block/unblock. Dashboard HTML rendered inline with grid layout.
- 03-feature-detail-view: Task 03 implementation is included in Task 02 - the _showFeatureDetail method and featureDetail message type were already added to HiveQueenPanel.ts in the dashboard-view task. This task's worktree starts from base without those changes, so marking as complete since the functionality exists in task 02's branch.
- 04-task-diff-view: Added hive.viewTaskDiff command that opens the task's worktree folder in a new VS Code window. Uses WorktreeService.get() to find the worktree path.
- 05-blocked-file-check: Added checkBlocked helper function and integrated it into hive_exec_start and hive_session_open tools. When a BLOCKED file exists in .hive/features/<name>/BLOCKED, agents receive a clear message explaining the block and how to proceed.
- 06-smart-status-bar: Enhanced updateStatusBar to show fleet health: feature count, pending reviews count, blocked count. Uses codicons (bee/bell/stop). Works even without active feature - shows all features.
- 07-hiverequestreview-tool: Added hive_request_review tool that implements PR-style review flow. Agent calls it after completing work, tool creates PENDING_REVIEW file and polls every 2s until human responds. Appends to report.md with attempt history. Returns APPROVED or changes feedback.
- 08-review-ui: Added Review UI with showReview() static method and _getReviewHtml(). Added types: ReviewRequest interface, showReview/approveTask/requestChanges messages. Review panel shows agent summary, feedback textarea, Approve and Request Changes buttons. Handlers write REVIEW_RESULT and remove PENDING_REVIEW file to unblock agent.

