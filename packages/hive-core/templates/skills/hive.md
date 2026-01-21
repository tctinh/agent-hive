---
name: hive
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

Plan-first development with phase-aware orchestration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  @hive (Phase-Aware Master)                 │
│                                                             │
│  Scout Mode ◄────── replan ──────► Receiver Mode            │
│  (Planning)                        (Orchestration)          │
│      │                                   │                  │
│      ▼                                   ▼                  │
│  background_task                   hive_exec_start          │
│  (research)                        (spawn worker)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Forager (Worker)                         │
│  - Executes in isolated worktree                            │
│  - Reports via hive_exec_complete                           │
│  - Can research via background_task                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase Detection

The @hive agent auto-switches mode based on feature state:

| State | Mode | Focus |
|-------|------|-------|
| No feature / planning | **Scout** | Discovery → Planning |
| Approved | **Transition** | Sync tasks → Start execution |
| Executing | **Receiver** | Spawn workers → Handle blockers → Merge |
| Completed | **Report** | Summarize and close |

Check with `hive_status()`.

---

## Agents

| Agent | Mode | Use |
|-------|------|-----|
| `@hive` | Auto | Primary agent - switches Scout/Receiver |
| `@scout` | Explicit | Planning only (won't execute) |
| `@receiver` | Explicit | Orchestration only (won't plan) |
| `@forager` | Subagent | Spawned by exec_start (don't invoke directly) |

---

## Research Delegation (OMO-Slim)

All agents can delegate research to specialists:

| Specialist | Use For |
|------------|---------|
| **explorer** | Find code patterns, locate files |
| **librarian** | External docs, API references |
| **oracle** | Architecture advice, debugging |
| **designer** | UI/UX guidance, component patterns |

```
background_task({
  agent: "explorer",
  prompt: "Find all API routes in src/api/",
  description: "Find API patterns",
  sync: true
})
```

---

## Intent Classification (Do First)

| Intent | Signals | Action |
|--------|---------|--------|
| **Trivial** | Single file, <10 lines | Do directly. No feature. |
| **Simple** | 1-2 files, <30 min | Quick questions → light plan or just do it |
| **Complex** | 3+ files, needs review | Full feature workflow |
| **Refactor** | "refactor", existing code | Safety: tests, rollback, blast radius |
| **Greenfield** | New feature, "build new" | Discovery: find patterns first |

**Don't over-plan trivial tasks.**

---

## Lifecycle

```
Classify Intent → Discovery → Plan → Review → Execute → Merge
                      ↑                           │
                      └───────── replan ──────────┘
```

---

## Phase 1: Discovery (Scout Mode)

### Research First (Greenfield/Complex)

```
background_task({ agent: "explorer", prompt: "Find patterns...", sync: true })
hive_context_write({ name: "research", content: "# Findings\n..." })
```

### Question Tool

```json
{
  "questions": [{
    "question": "What authentication should we use?",
    "header": "Auth Strategy",
    "options": [
      { "label": "JWT", "description": "Token-based, stateless" },
      { "label": "Session", "description": "Cookie-based, server state" }
    ]
  }]
}
```

### Self-Clearance Check

After each exchange:
```
□ Core objective clear?
□ Scope boundaries defined?
□ No critical ambiguities?
□ Technical approach decided?

ALL YES → Write plan
ANY NO → Ask the unclear thing
```

---

## Phase 2: Plan

### Create Feature

```
hive_feature_create({ name: "feature-name" })
```

### Save Context (Royal Jelly)

```
hive_context_write({
  name: "research",
  content: "# Findings\n- Pattern at src/lib/auth:45-78..."
})
```

### Write Plan

```
hive_plan_write({ content: "..." })
```

### Plan Structure (REQUIRED)

```markdown
# {Feature Title}

## Discovery

### Original Request
- "{User's exact words}"

### Interview Summary
- {Point}: {Decision}

### Research Findings
- `{file:lines}`: {Finding}

---

## Non-Goals (What we're NOT building)
- {Explicit exclusion}

## Ghost Diffs (Alternatives Rejected)
- {Approach}: {Why rejected}

---

## Tasks

### 1. {Task Title}

**What to do**:
- {Implementation step}

**Must NOT do**:
- {Task guardrail}

**References**:
- `{file:lines}` — {WHY this reference}

**Acceptance Criteria**:
- [ ] {Verifiable outcome}
- [ ] Run: `{command}` → {expected}

---

## Success Criteria
- [ ] {Final checklist}
```

### Key Sections

| Section | Purpose |
|---------|---------|
| **Discovery** | Ground plan in user words + research |
| **Non-Goals** | Prevents scope creep |
| **Ghost Diffs** | Prevents re-proposing rejected solutions |
| **References** | File:line citations with WHY |
| **Must NOT do** | Task-level guardrails |
| **Acceptance Criteria** | Verifiable conditions |

---

## Phase 3: Review

1. User reviews in VS Code
2. Check comments: `hive_plan_read()`
3. Revise if needed
4. User approves via: `hive_plan_approve()`

---

## Phase 4: Execute (Receiver Mode)

### Sync Tasks

```
hive_tasks_sync()
```

### Execute Each Task

```
hive_exec_start({ task: "01-task-name" })  // Spawns Forager
  ↓
[Forager implements in worktree]
  ↓
hive_exec_complete({ task, summary, status: "completed" })
  ↓
hive_merge({ task: "01-task-name", strategy: "squash" })
```

### Parallel Execution (Swarming)

When tasks are parallelizable:

```
hive_exec_start({ task: "02-task-a" })
hive_exec_start({ task: "03-task-b" })
hive_worker_status()  // Monitor all
```

---

## Blocker Handling

When worker returns `status: 'blocked'`:

### Quick Decision (No Plan Change)

1. `hive_worker_status()` - get details
2. Ask user via question tool
3. Resume: `hive_exec_start({ task, continueFrom: "blocked", decision: "..." })`

### Plan Gap Detected

If blocker suggests plan is incomplete:

```json
{
  "questions": [{
    "question": "This suggests our plan may need revision. How proceed?",
    "header": "Plan Gap Detected",
    "options": [
      { "label": "Revise Plan", "description": "Go back to planning" },
      { "label": "Quick Fix", "description": "Handle as one-off" },
      { "label": "Abort Feature", "description": "Stop entirely" }
    ]
  }]
}
```

If "Revise Plan":
1. `hive_exec_abort({ task })`
2. `hive_context_write({ name: "learnings", content: "..." })`
3. `hive_plan_write({ content: "..." })` (updated plan)
4. Wait for re-approval

---

## Tool Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Discovery | `background_task` | Research delegation |
| Plan | `hive_feature_create` | Start feature |
| Plan | `hive_context_write` | Save research |
| Plan | `hive_plan_write` | Write plan |
| Plan | `hive_plan_read` | Check comments |
| Plan | `hive_plan_approve` | Approve plan |
| Execute | `hive_tasks_sync` | Generate tasks |
| Execute | `hive_exec_start` | Spawn Forager worker |
| Execute | `hive_exec_complete` | Finish task |
| Execute | `hive_exec_abort` | Discard task |
| Execute | `hive_merge` | Integrate task |
| Execute | `hive_worker_status` | Check workers/blockers |
| Complete | `hive_feature_complete` | Mark done |
| Status | `hive_status` | Overall progress |

---

## Iron Laws

**Never:**
- Plan without discovery
- Execute without approval
- Complete without verification
- Assume when uncertain - ASK
- Force through blockers that suggest plan gaps

**Always:**
- Match effort to complexity
- Include file:line references with WHY
- Define Non-Goals and Must NOT guardrails
- Provide verification commands
- Offer replan when blockers suggest gaps

---

## Error Recovery

### Task Failed
```
hive_exec_abort({ task })  # Discard
hive_exec_start({ task })  # Fresh start
```

### After 3 Failures
1. Stop all workers
2. Consult oracle: `background_task({ agent: "oracle", prompt: "Analyze failure..." })`
3. Ask user how to proceed

### Merge Conflicts
1. Resolve in worktree
2. Commit resolution
3. `hive_merge` again
