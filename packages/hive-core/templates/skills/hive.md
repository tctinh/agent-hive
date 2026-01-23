---
name: hive
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

Plan-first development with bee roles.

## Architecture

```
Architect Bee (planner) -> Swarm Bee (orchestrator)
                     \-> Scout Bee (research)
Swarm Bee -> Forager Bee (execution)
Swarm Bee -> Hygienic Bee (plan review)
```

---

## Agents

| Agent | Mode | Use |
|-------|------|-----|
| `@architect-bee` | Primary | Planning only |
| `@swarm-bee` | Primary | Orchestration |
| `@scout-bee` | Subagent | Research assistance |
| `@forager-bee` | Subagent | Executes tasks in worktrees |
| `@hygienic-bee` | Subagent | Plan quality review |

---

## Research Delegation (MCP Tools + task)

Use MCP tools for focused research; use `task` to delegate to scout-bee or other specialist subagents.

| Tool | Use For |
|------|---------|
| `grep_app_searchGitHub` | Find code in OSS repos |
| `context7_query-docs` | Library documentation |
| `websearch_web_search_exa` | Web search and scraping |
| `ast_grep_search` | AST-aware code search |
| `task` | Delegate to scout-bee or specialist | 

```
task({
  subagent_type: "scout-bee",
  prompt: "Find all API routes in src/api/",
  description: "Find API patterns"
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

## Phase 1: Discovery (Architect Bee)

### Research First (Greenfield/Complex)

```
task({ subagent_type: "explorer", prompt: "Find patterns..." })
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

## Phase 4: Execute (Swarm Bee)

### Sync Tasks

```
hive_tasks_sync()
```

### Execute Each Task

```
hive_exec_start({ task: "01-task-name" })  // Creates worktree; returns delegation instructions
task({ ...taskCall })  // Only when delegationRequired is true
  ↓
[Forager Bee implements in worktree]
  ↓
hive_exec_complete({ task, summary, status: "completed" })
  ↓
hive_merge({ task: "01-task-name", strategy: "squash" })
```

### Parallel Execution (Swarming)

When tasks are parallelizable:

If `delegationRequired` is returned for a task, call `task` to spawn that worker.

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
| Discovery | `grep_app_searchGitHub` / `context7_query-docs` / `task` | Research delegation |
| Plan | `hive_feature_create` | Start feature |
| Plan | `hive_context_write` | Save research |
| Plan | `hive_plan_write` | Write plan |
| Plan | `hive_plan_read` | Check comments |
| Plan | `hive_plan_approve` | Approve plan |
| Execute | `hive_tasks_sync` | Generate tasks |
| Execute | `hive_exec_start` | Spawn Forager Bee worker |
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
2. Consult oracle: `task({ subagent_type: "oracle", prompt: "Analyze failure..." })`
3. Ask user how to proceed

### Merge Conflicts
1. Resolve in worktree
2. Commit resolution
3. `hive_merge` again
