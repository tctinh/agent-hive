# Hive Design

## Core Concept

Context-Driven Development for AI coding assistants.

```
PROBLEM  -> CONTEXT  -> EXECUTION -> REPORT
(why)       (what)      (how)        (shape)
```

## Architecture

```
.hive/                    <- Shared data (all clients)
├── active-feature        <- Active feature logical name pointer
├── features/             <- Feature-scoped work
│   └── 01_feature-name/
│       ├── feature.json  <- Feature metadata and state
│       ├── plan.md       <- Human-facing plan artifact and execution truth
│       ├── tasks.json    <- Task list with status
│       ├── contexts/     <- Persistent knowledge files
│       └── tasks/        <- Individual task folders
│           └── {task}/
│               ├── status.json      <- Task state
│               ├── spec.md          <- Task context and requirements
│               ├── worker-prompt.md <- Full worker prompt
│               └── report.md        <- Execution summary and results
└── .worktrees/           <- Isolated git worktrees per task
    └── {feature}/{task}/ <- Full repo copy for safe execution

packages/
├── hive-core/            <- Shared logic (services, types, utils)
├── opencode-hive/        <- OpenCode plugin (planning, execution, tracking)
└── vscode-hive/          <- VS Code extension (visualization, review, approval)
```

## Data Flow

1. User creates feature via `hive_feature_create`
2. Agent writes plan via `hive_plan_write`
3. User reviews in VSCode, adds comments
4. User approves via `hive_plan_approve`
5. Tasks synced via `hive_tasks_sync` (generates spec.md for each)
6. Each task executed via `hive_worktree_start` -> work -> `hive_worktree_commit`
7. Changes applied from worktree to main repo
8. Report generated with diff stats and file list

## Prompt Management

- `spec.md` is the single source for plan/context/prior task summaries in worker prompts to avoid duplication.
- `hive_worktree_start` writes the full prompt to `.hive/features/<feature>/tasks/<task>/worker-prompt.md` and returns `workerPromptPath` plus a short preview.
- Prompt budgets default to last 10 tasks, 2000 chars per summary, 20KB per context file, 60KB total; `promptMeta`, `payloadMeta`, and `warnings` report sizes.

## Feature Resolution (v0.5.0)

All tools use logical feature names with `.hive/active-feature` as the shared active-feature pointer. Storage may be indexed for new features (`01_feature-name`) while tool input/output stays logical:

```typescript
function resolveFeature(explicit?: string): string | null {
  // 1. Use explicit parameter if provided
  if (explicit) return explicit
  
  // 2. Use .hive/active-feature when it points at a live feature
  const active = readActiveFeature()
  if (active) return active

  // 3. Detect from worktree path (.hive/.worktrees/{feature}/{task}/)
  const detected = detectContext(cwd)
  if (detected?.feature) return detected.feature
  
  // 4. Fall back to the first non-completed feature in deterministic order
  const features = listFeatures()
  if (features.length > 0) return features[0]
  
  // 5. Require explicit parameter if none can be resolved
  return null
}
```

This enables:
- Multi-session support (parallel agents on different features)
- Stable active-feature behavior via `.hive/active-feature`
- Indexed storage without leaking folder names into status output
- Explicit override (always specify feature when needed)

## Session Tracking

Hive uses a two-level session model so compaction recovery can find the right role before it finds the right feature:

- Global session identity lives in `.hive/sessions.json`.
- Once a session is bound to a feature, it is mirrored into `.hive/features/<feature>/sessions.json`.
- The global file is the recovery source of truth; feature-local mirrors keep history discoverable from the feature folder.

Tracked metadata can include:

- `sessionId`
- `agent` / `baseAgent`
- `sessionKind`
- `featureName`
- `taskFolder`
- `workerPromptPath`
- `directivePrompt`
- replay flags and activity metadata

### Session kinds

Hive distinguishes `primary`, `subagent`, `task-worker`, and `unknown` sessions.

- `primary`: top-level Hive / Architect / Swarm conversations
- `subagent`: delegated Scout or Hygienic sessions
- `task-worker`: Forager workers and forager-derived custom agents executing a task
- `unknown`: safe fallback when Hive cannot classify the session confidently

### Recovery behavior after compaction

When OpenCode emits a compaction event, Hive rebuilds a minimal re-anchor prompt from stored session metadata.

- Primary and subagent sessions are re-anchored to their role.
- Primary and subagent sessions can restore the last real user directive through post-compaction replay.
- Task-worker sessions do not rely on directive replay; they recover from durable worktree metadata and re-read `worker-prompt.md`.
- If `workerPromptPath` was stored explicitly, Hive uses it. Otherwise it reconstructs the expected `.hive/features/<feature>/tasks/<task>/worker-prompt.md` path from `featureName` and `taskFolder`.
- Recovery prompts tell sessions not to switch roles, not to rediscover state through status tools, and not to re-read the full codebase.

This keeps recovery narrow and deterministic: orchestrators recover their role and directive, while workers recover their exact task contract.

## Task Lifecycle

```
pending -> in_progress -> done
                      \-> blocked -> (resume) -> done
                      \-> failed
                      \-> partial
                      \-> cancelled
```

### Status Vocabulary (TaskStatusType)

| Status | Description |
|--------|-------------|
| `pending` | Not started |
| `in_progress` | Currently being worked on |
| `done` | Completed successfully |
| `blocked` | Waiting for user decision (blocker protocol) |
| `failed` | Execution failed (errors, tests not passing) |
| `partial` | Partially completed (some work done, not finished) |
| `cancelled` | Cancelled by user |

### spec.md (generated on task sync)
Contains task context for the executing agent:
- Task number, name, feature, folder
- Full description from plan
- Prior tasks (what came before)
- Upcoming tasks (what comes after)

### report.md (generated on task complete)
Contains execution results:
- Feature name, completion timestamp
- Status (success/failed)
- Summary (agent-provided)
- Diff statistics (files changed, insertions, deletions)
- List of modified files

## Worktree Isolation

Each task executes in an isolated git worktree:
- Full repo copy at `.hive/.worktrees/{feature}/{task}/`
- Agent makes changes freely without affecting main repo
- On `hive_worktree_commit`: diff extracted and applied to main repo
- On `hive_worktree_discard`: worktree discarded, no changes applied

## Key Principles

- **No global state** — All tools accept explicit feature parameter
- **Detection-first** — Worktree path reveals feature context
- **Isolation** — Each task in own worktree, safe to discard
- **Audit trail** — Every action logged to `.hive/`
- **Agent-friendly** — Minimal overhead during execution

## Source of Truth Rules

Hive uses file-based state with clear ownership boundaries:

| File | Owner | Other Access |
|------|-------|--------------| 
| `feature.json` | Hive Master | VS Code (read-only) |
| `tasks.json` | Hive Master | VS Code (read-only) |
| `status.json` (task) | Worker | Hive Master (read), Poller (read-only) |
| `plan.md` | Hive Master | VS Code (read + comment, execution source of truth) |
| `comments/plan.json` | VS Code | Hive Master (read-only) |
| `spec.md` | `hive_worktree_start` / `hive_worktree_create` | Worker (read-only) |
| `report.md` | Worker | All (read-only) |
| `BLOCKED` | Beekeeper | All (read-only, blocks operations) |

### Poller Constraints

The VSCode extension poller watches `.hive/` for changes:
- **Read-only**: Poller NEVER writes to any file
- **Debounced**: File changes debounced to avoid thrashing
- **Selective**: Only watches files it needs for UI

## Field Ownership

Task `status.json` fields and who writes them:

| Field | Written By | When |
|-------|-----------|------|
| `status` | Worker via `hive_worktree_commit` | On completion/block |
| `origin` | `hive_tasks_sync` | On task creation |
| `planTitle` | `hive_tasks_sync` | On task creation |
| `summary` | Worker via `hive_worktree_commit` | On completion |
| `startedAt` | `hive_worktree_start` / `hive_worktree_create` | On task start/resume |
| `completedAt` | `hive_worktree_commit` | On completion |
| `baseCommit` | `hive_worktree_start` / `hive_worktree_create` | On worktree creation/resume |
| `blocker` | Worker via `hive_worktree_commit` | When blocked |

## Idempotency Expectations

### Idempotent Operations

These operations are safe to retry:
- `hive_plan_read` - Pure read
- `hive_status` - Pure read

### Non-Idempotent Operations

These operations have side effects:
- `hive_feature_create` - Creates feature directory (errors if exists)
- `hive_plan_write` - Overwrites plan.md, clears comments
- `hive_tasks_sync` - Reconciles tasks (additive, removes orphans)
- `hive_worktree_start` - Creates worktree for normal start
- `hive_worktree_create` - Resumes blocked task in existing worktree
- `hive_worktree_commit` - Commits changes, writes report (once per completion)
- `hive_merge` - Merges branch (fails if already merged)

### Recovery Patterns

If a tool call fails mid-operation:
1. Check `hive_status` to see current state
2. Most operations leave state consistent (atomic file writes)
3. Worktrees can be cleaned up with `hive_worktree_discard`
4. Partial merges require manual git intervention
