# Hive Tools Inventory

## Tools (18 total)

### Feature Management (2 tools)
| Tool | Purpose |
|------|---------|
| `hive_feature_create` | Create new feature, set as active |
| `hive_feature_complete` | Mark feature completed (irreversible) |

### Plan Management (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_plan_write` | Write plan.md (execution truth; clears plan review comments) |
| `hive_plan_read` | Read plan.md and related review comments so approval can account for overview + plan feedback |
| `hive_plan_approve` | Approve plan for execution |

### Task Management (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_tasks_sync` | Generate tasks from approved plan, or refresh pending plan-backed tasks with `refreshPending: true` after a plan amendment |
| `hive_task_create` | Create manual task (not from plan) with explicit `dependsOn` and optional structured metadata |
| `hive_task_update` | Update task status or summary |

#### Task model notes

- Plan-backed tasks get their DAG from `plan.md` `Depends on:` annotations during `hive_tasks_sync`.
- Manual tasks always persist explicit `dependsOn`; omitting it means `[]`, not implicit sequential ordering.
- manual tasks are append-only.
- If `order` is omitted, Hive uses the next order; explicit `order` is only accepted when it equals that next order, so intermediate insertion requires plan amendment.
- Explicit manual dependencies are only for isolated follow-up work that already depends on finished tasks; dependencies on unfinished work require plan amendment.
- Structured manual task metadata can include `goal`, `description`, `acceptanceCriteria`, `references`, `files`, `reason`, and `source`; Hive uses it to build worker-facing `spec.md` content.
- Use manual tasks for isolated ad-hoc/operator work. In the issue-72 `3b` / `3c` shape, first ask `hive-helper` for observable state clarification or interrupted-state wrap-up; only request a manual task when the follow-up can append safely after the approved DAG. If review feedback changes downstream sequencing, dependencies, or scope, amend `plan.md` instead, then run `hive_tasks_sync({ refreshPending: true })`.

### Worktree (4 tools)
| Tool | Purpose |
|------|---------|
| `hive_worktree_start` | Create worktree and begin normal work |
| `hive_worktree_create` | Resume blocked task in existing worktree |
| `hive_worktree_commit` | Commit changes, write report (does NOT merge), optional `message` controls git commit text |
| `hive_worktree_discard` | Discard changes, reset status |

#### hive_worktree_commit input notes

- `summary`: task/report summary.
- `message` (optional): git commit message text.
- Multi-line `message` is allowed when creating a commit.
- Omit `message` (or pass `''`) to use default commit message behavior.

#### hive_worktree_commit output

- Always returns JSON with control-flow fields:
  - `ok`: whether the operation succeeded
  - `terminal`: whether worker should stop (`true`) or continue (`false`)
  - `status`: completion status (`completed`, `blocked`, `failed`, `partial`) or error/rejected state
  - `taskState`: resulting persisted task state
  - `nextAction`: explicit next step for worker/orchestrator
- Non-terminal responses (for example `reason: "verification_required"`) require worker remediation and retry.

#### hive_worktree_start / hive_worktree_create output

- `workerPromptPath`: file path to `.hive/features/<feature>/tasks/<task>/worker-prompt.md`
- `workerPromptPreview`: short preview of the prompt
- `promptMeta`, `payloadMeta`, `budgetApplied`, `warnings`: size and budget observability

### Merge (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_merge` | Merge task branch (strategies: merge/squash/rebase); optional helper-friendly conflict preservation, cleanup, and `message` for merge/squash |

#### hive_merge input notes

- `preserveConflicts?: boolean` defaults to `false`; when `true`, merge conflicts stay in place for an isolated helper session instead of being auto-aborted.
- `cleanup?: 'none' | 'worktree' | 'worktree+branch'` defaults to `'none'`; successful merges can keep the worktree, remove only the worktree, or remove the worktree and delete the task branch.
- `message` is optional and applies to `merge`/`squash` strategies.
- Do not provide `message` with `strategy: 'rebase'`.
- Omit `message` (or pass `''`) to use default merge/squash message behavior.

#### hive_merge output

- Returns JSON with the shared merge result envelope plus a concise `message` string.
- Shared result fields:
  - `success`
  - `merged`
  - `strategy`
  - `sha?`
  - `filesChanged`
  - `conflicts`
  - `conflictState` (`none`, `aborted`, or `preserved`)
  - `cleanup.worktreeRemoved`
  - `cleanup.branchDeleted`
  - `cleanup.pruned`
  - `error?`
- `conflictState: 'preserved'` means the caller requested `preserveConflicts: true` and must resolve the merge locally before cleanup can finish.

### Context (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_context_write` | Write context file, including reserved `context/overview.md` via `name: "overview"` |

### Network (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_network_query` | Query prior features for deterministic `plan.md` + network-safe context snippets only |

#### hive_network_query input

- `feature?: string` — current feature to exclude from results; defaults to the active feature when available
- `query: string` — case-insensitive substring query over `plan.md` and network-safe context files

#### hive_network_query output

- Always returns JSON with exactly these top-level fields:
  - `query`
  - `currentFeature` (`string | null`)
  - `results`
- `results` is an array of snippet records:
  - `feature`
  - `sourceType` (`plan` | `context`)
  - `sourceName`
  - `path`
  - `updatedAt`
  - `snippet`
- No-match responses are explicit JSON with `results: []`.
- The tool is read-only and callers must opt in to using returned snippets.

### Status (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_status` | Get comprehensive feature status as JSON, including overview metadata, per-document review counts, and context inclusion flags |

### AGENTS.md (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_agents_md` | Initialize or sync AGENTS.md from codebase or feature context |

### Skill (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_skill` | Load a Hive skill by name |

---

## Removed Tools

| Tool | Reason |
|------|--------|
| `hive_subtask_*` (5 tools) | Subtask complexity not needed, use todowrite instead |
| `hive_session_*` (2 tools) | Replaced by `hive_status` |
| `hive_context_read` | Agents can read files directly |
| `hive_context_list` | Agents can use glob/Read |

---

## Tool Categories Summary

| Category | Count | Tools |
|----------|-------|-------|
| Feature | 2 | create, complete |
| Plan | 3 | write, read, approve |
| Task | 3 | sync, create, update |
| Worktree | 4 | start, create, commit, discard |
| Merge | 1 | merge |
| Context | 1 | write |
| Network | 1 | query |
| Status | 1 | status |
| AGENTS.md | 1 | agents_md |
| Skill | 1 | skill |
| **Total** | **18** | |

## Reserved Overview Convention

- There is no dedicated overview write tool.
- Use `hive_context_write({ name: "overview", content })` to maintain `.hive/features/<feature>/context/overview.md`.
- Humans review `context/overview.md` first; `plan.md` stays authoritative for execution and task parsing, and can still include a readable design summary before `## Tasks`.
- `hive_status` and the VS Code extension surface the overview as the primary human-facing document.
