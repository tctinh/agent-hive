# opencode-hive

[![npm version](https://img.shields.io/npm/v/opencode-hive)](https://www.npmjs.com/package/opencode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](../../LICENSE)

**From Vibe Coding to Hive Coding** — The OpenCode plugin that brings structure to AI-assisted development.

## Why Hive?

Stop losing context. Stop repeating decisions. Start shipping with confidence.

```
Vibe: "Just make it work"
Hive: Plan → Review → Approve → Execute → Ship
```

## Installation

```bash
npm install opencode-hive
```

## Optional: Enable MCP Research Tools

1. Create `.opencode/mcp-servers.json` using the template:
   - From this repo: `packages/opencode-hive/templates/mcp-servers.json`
   - Or from npm: `node_modules/opencode-hive/templates/mcp-servers.json`
2. Set `EXA_API_KEY` to enable `websearch_exa` (optional).
3. Restart OpenCode.

This enables tools like `grep_app_searchGitHub`, `context7_query-docs`, `websearch_web_search_exa`, and `ast_grep_search`.

## The Workflow

1. **Create Feature** — `hive_feature_create("dark-mode")`
2. **Write Plan** — AI generates structured plan
3. **Review** — You review in VS Code, add comments
4. **Approve** — `hive_plan_approve()`
5. **Execute** — Tasks run in isolated git worktrees
6. **Ship** — Clean commits, full audit trail

### Planning-mode delegation

During planning, "don't execute" means "don't implement" (no code edits, no worktrees). Read-only exploration is explicitly allowed and encouraged, both via local tools and by delegating to Scout.

#### Canonical Delegation Threshold

- Delegate to Scout when you cannot name the file path upfront, expect to inspect 2+ files, or the question is open-ended ("how/where does X work?").
- Local `read`/`grep`/`glob` is acceptable only for a single known file and a bounded question.

## Tools

### Feature Management
| Tool | Description |
|------|-------------|
| `hive_feature_create` | Create a new feature |
| `hive_feature_complete` | Mark feature as complete |

### Planning
| Tool | Description |
|------|-------------|
| `hive_plan_write` | Write plan.md |
| `hive_plan_read` | Read plan and comments |
| `hive_plan_approve` | Approve plan for execution |

### Tasks
| Tool | Description |
|------|-------------|
| `hive_tasks_sync` | Generate tasks from plan |
| `hive_task_create` | Create manual task |
| `hive_task_update` | Update task status/summary |

### Worktree
| Tool | Description |
|------|-------------|
| `hive_worktree_start` | Start normal work on task (creates worktree) |
| `hive_worktree_create` | Resume blocked task in existing worktree |
| `hive_worktree_commit` | Complete task (applies changes) |
| `hive_worktree_discard` | Abort task (discard changes) |

### Troubleshooting

#### Repeated blocked-resume errors / loop

If you see repeated retries around `continueFrom: "blocked"`, use this protocol:

1. Call `hive_status()` first.
2. If status is `pending` or `in_progress`, start normally with:
   - `hive_worktree_start({ feature, task })`
3. Only use blocked resume when status is exactly `blocked`:
   - `hive_worktree_create({ task, continueFrom: "blocked", decision })`

Do not retry the same blocked-resume call on non-blocked statuses; re-check `hive_status()` and use `hive_worktree_start` for normal starts.

#### Using with DCP plugin

When using Dynamic Context Pruning (DCP), use a Hive-safe config in `~/.config/opencode/dcp.jsonc`:

- `manualMode.enabled: true`
- `manualMode.automaticStrategies: false`
- `turnProtection.enabled: true` with `turnProtection.turns: 12`
- `tools.settings.nudgeEnabled: false`
- protect key tools in `tools.settings.protectedTools` (at least: `hive_status`, `hive_worktree_start`, `hive_worktree_create`, `hive_worktree_commit`, `hive_worktree_discard`, `question`)
- disable aggressive auto strategies:
  - `strategies.deduplication.enabled: false`
  - `strategies.supersedeWrites.enabled: false`
  - `strategies.purgeErrors.enabled: false`

For local plugin testing, keep OpenCode plugin entry as `"opencode-hive"` (not `"opencode-hive@latest"`).

#### Compaction recovery and session re-anchoring

OpenCode can compact long sessions. When that happens mid-orchestration or mid-task, Hive needs the session to recover its role and task boundaries without re-reading the whole repository.

The plugin now persists durable session metadata and uses it during `experimental.session.compacting` to rebuild a compact re-anchor prompt.

Where:

- Global session state is written to `.hive/sessions.json`.
- Feature-local mirrors are written to `.hive/features/<feature>/sessions.json`.
- Session classification distinguishes `primary`, `subagent`, `task-worker`, and `unknown`.
- Primary and subagent recovery can replay the stored user directive once after compaction.
- For task workers, the re-anchor context can include `.hive/features/<feature>/tasks/<task>/worker-prompt.md`.

Task-worker recovery is intentionally strict:

- keep the same role
- do not delegate
- do not re-read the full codebase
- re-read `worker-prompt.md`
- continue from the last known point

This split is deliberate: post-compaction replay is for primary/subagent intent, while task-worker recovery comes from durable worktree context plus `worker-prompt.md` so implementation sessions stay attached to the exact task contract.

This matters most for `forager-worker` and forager-derived custom agents, because they are the sessions most likely to be compacted mid-implementation.

## Prompt Budgeting & Observability

Hive automatically bounds worker prompt sizes to prevent context overflow and tool output truncation.

### Budgeting Defaults

| Limit | Default | Description |
|-------|---------|-------------|
| `maxTasks` | 10 | Number of previous tasks included |
| `maxSummaryChars` | 2,000 | Max chars per task summary |
| `maxContextChars` | 20,000 | Max chars per context file |
| `maxTotalContextChars` | 60,000 | Total context budget |

When limits are exceeded, content is truncated with `...[truncated]` markers and file path hints are provided so workers can read the full content.

### Observability

`hive_worktree_start` and blocked-resume `hive_worktree_create` output include metadata fields:

- **`promptMeta`**: Character counts for plan, context, previousTasks, spec, workerPrompt
- **`payloadMeta`**: JSON payload size, whether prompt is inlined or referenced by file
- **`budgetApplied`**: Budget limits, tasks included/dropped, path hints for dropped content
- **`warnings`**: Array of threshold exceedances with severity levels (info/warning/critical)

### Prompt Files

Large prompts are written to `.hive/features/<feature>/tasks/<task>/worker-prompt.md` and passed by file reference (`workerPromptPath`) rather than inlined in tool output. This prevents truncation of large prompts.

That same `worker-prompt.md` path is also reused during compaction recovery so task workers can re-anchor to the exact task assignment after a compacted session resumes.

## Plan Format

```markdown
# Feature Name

## Overview
What we're building and why.

## Tasks

### 1. Task Name
Description of what to do.

### 2. Another Task
Description.
```

## Configuration

Hive reads config from these locations, in order:

1. `<project>/.opencode/agent_hive.json` (preferred)
2. `~/.config/opencode/agent_hive.json` (fallback)

If project config exists but is invalid JSON or invalid shape, Hive falls back to global config and surfaces a runtime warning.

You can customize agent models, variants, disable skills, and disable MCP servers.

### Project-local config example

Create `.opencode/agent_hive.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agentMode": "unified",
  "disableSkills": []
}
```

### Disable Skills or MCPs

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "disableSkills": ["brainstorming", "writing-plans"],
  "disableMcps": ["websearch", "ast_grep"]
}
```

#### Available Skills

| ID | Description |
|----|-------------|
| `brainstorming` | Use before any creative work. Explores user intent, requirements, and design through collaborative dialogue before implementation. |
| `writing-plans` | Use when you have a spec or requirements for a multi-step task. Creates detailed implementation plans with bite-sized tasks. |
| `executing-plans` | Use when you have a written implementation plan. Executes tasks in batches with review checkpoints. |
| `dispatching-parallel-agents` | Use when facing 2+ independent tasks. Dispatches multiple agents to work concurrently on unrelated problems. |
| `test-driven-development` | Use when implementing any feature or bugfix. Enforces write-test-first, red-green-refactor cycle. |
| `systematic-debugging` | Use when encountering any bug or test failure. Requires root cause investigation before proposing fixes. |
| `code-reviewer` | Use when reviewing implementation changes against an approved plan or task to catch missing requirements, YAGNI, dead code, and risky patterns. |
| `verification-before-completion` | Use before claiming work is complete. Requires running verification commands and confirming output before success claims. |

#### Available MCPs

| ID | Description | Requirements |
|----|-------------|--------------|
| `websearch` | Web search via [Exa AI](https://exa.ai). Real-time web searches and content scraping. | Set `EXA_API_KEY` env var |
| `context7` | Library documentation lookup via [Context7](https://context7.com). Query up-to-date docs for any programming library. | None |
| `grep_app` | GitHub code search via [grep.app](https://grep.app). Find real-world code examples from public repositories. | None |
| `ast_grep` | AST-aware code search and replace via [ast-grep](https://ast-grep.github.io). Pattern matching across 25+ languages. | None (runs via npx) |

### Per-Agent Skills

Each agent can have specific skills enabled. If configured, only those skills appear in `hive_skill()`:

```json
{
  "agents": {
    "hive-master": {
      "skills": ["brainstorming", "writing-plans", "executing-plans"]
    },
    "forager-worker": {
      "skills": ["test-driven-development", "verification-before-completion"]
    }
  }
}
```

**How `skills` filtering works:**

| Config | Result |
|--------|--------|
| `skills` omitted | All skills enabled (minus global `disableSkills`) |
| `skills: []` | All skills enabled (minus global `disableSkills`) |
| `skills: ["tdd", "debug"]` | Only those skills enabled |

Note: Wildcards like `["*"]` are **not supported** - use explicit skill names or omit the field entirely for all skills.

### Auto-load Skills

Use `autoLoadSkills` to automatically inject skills into an agent's system prompt at session start.

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agents": {
    "hive-master": {
      "autoLoadSkills": ["parallel-exploration"]
    },
    "forager-worker": {
      "autoLoadSkills": ["test-driven-development", "verification-before-completion"]
    }
  }
}
```

**Supported skill sources:**

`autoLoadSkills` accepts both Hive builtin skill IDs and file-based skill IDs. Resolution order:

1. **Hive builtin** — Skills bundled with opencode-hive (always win if ID matches)
2. **Project OpenCode** — `<project>/.opencode/skills/<id>/SKILL.md`
3. **Global OpenCode** — `~/.config/opencode/skills/<id>/SKILL.md`
4. **Project Claude** — `<project>/.claude/skills/<id>/SKILL.md`
5. **Global Claude** — `~/.claude/skills/<id>/SKILL.md`

Skill IDs must be safe directory names (no `/`, `\`, `..`, or `.`). Missing or invalid skills emit a warning and are skipped—startup continues without failure.

**How `skills` and `autoLoadSkills` interact:**

- `skills` controls what appears in `hive_skill()` — the agent can manually load these on demand
- `autoLoadSkills` injects skills unconditionally at session start — no manual loading needed
- These are **independent**: a skill can be auto-loaded but not appear in `hive_skill()`, or vice versa
- User `autoLoadSkills` are **merged** with defaults (use global `disableSkills` to remove defaults)

**Default auto-load skills by agent:**

| Agent | autoLoadSkills default |
|-------|------------------------|
| `hive-master` | `parallel-exploration` |
| `forager-worker` | `test-driven-development`, `verification-before-completion` |
| `scout-researcher` | (none) |
| `architect-planner` | `parallel-exploration` |
| `swarm-orchestrator` | (none) |

### Per-Agent Model Variants

You can set a `variant` for each Hive agent to control model reasoning/effort level. Variants are keys that map to model-specific option overrides defined in your `opencode.json`.

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agents": {
    "hive-master": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "variant": "high"
    },
    "forager-worker": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "variant": "medium"
    },
    "scout-researcher": {
      "variant": "low"
    }
  }
}
```

The `variant` value must match a key in your OpenCode config at `provider.<provider>.models.<model>.variants`. For example, with Anthropic models you might configure thinking budgets:

```json
// opencode.json
{
  "provider": {
    "anthropic": {
      "models": {
        "claude-sonnet-4-20250514": {
          "variants": {
            "low": { "thinking": { "budget_tokens": 5000 } },
            "medium": { "thinking": { "budget_tokens": 10000 } },
            "high": { "thinking": { "budget_tokens": 25000 } }
          }
        }
      }
    }
  }
}
```

**Precedence:** If a prompt already has an explicit variant set, the per-agent config acts as a default and will not override it. Invalid or missing variant keys are treated as no-op (the model runs with default settings).

### Custom Derived Subagents

Define plugin-only custom subagents with `customAgents`. Freshly initialized `agent_hive.json` files already include starter template entries under `customAgents`; those seeded `*-example-template` entries are placeholders only, should be renamed or deleted before real use, and are intentionally worded so planners/orchestrators are unlikely to select them as configured. Each custom agent must declare:

- `baseAgent`: one of `forager-worker` or `hygienic-reviewer`
- `description`: delegation guidance injected into primary planner/orchestrator prompts

Published example (validated by `src/e2e/custom-agent-docs-example.test.ts`):

```json
{
  "agents": {
    "forager-worker": {
      "variant": "medium"
    },
    "hygienic-reviewer": {
      "model": "github-copilot/gpt-5.2-codex"
    }
  },
  "customAgents": {
    "forager-ui": {
      "baseAgent": "forager-worker",
      "description": "Use for UI-heavy implementation tasks.",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.2,
      "variant": "high"
    },
    "reviewer-security": {
      "baseAgent": "hygienic-reviewer",
      "description": "Use for security-focused review passes."
    }
  }
}
```

Inheritance rules when a custom agent field is omitted:

| Field | Inheritance behavior |
|-------|----------------------|
| `model` | Inherits resolved base agent model (including user overrides in `agents`) |
| `temperature` | Inherits resolved base agent temperature |
| `variant` | Inherits resolved base agent variant |
| `autoLoadSkills` | Merges with base agent auto-load defaults/overrides, de-duplicates, and applies global `disableSkills` |

ID guardrails:

- `customAgents` keys cannot reuse built-in Hive agent IDs
- plugin-reserved aliases are blocked (`hive`, `architect`, `swarm`, `scout`, `forager`, `hygienic`, `receiver`)
- operational IDs are blocked (`build`, `plan`, `code`)

Compaction classification follows the base agent:

- `forager-worker` derivatives are treated as `task-worker`
- `hygienic-reviewer` derivatives are treated as `subagent`

This ensures custom workers recover with the same execution constraints as their base role.

### Custom Models

Override models for specific agents:

```json
{
  "agents": {
    "hive-master": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.5
    }
  }
}
```

## Pair with VS Code

For the full experience, install [vscode-hive](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive) to review plans inline with comments.

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](../../LICENSE) for details.

---

**Stop vibing. Start hiving.** 🐝
