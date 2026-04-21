# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.5] - 2026-04-21

### Added
- **Hive now teaches trigger-based skill loading for Copilot work**: The generated Hive prompt and repository-wide guidance now explicitly load `parallel-exploration` for multi-domain research, `systematic-debugging` for bugs and failing tests, `test-driven-development` for implementation, and `verification-before-completion` before completion claims.
- **Task lookup and tool-aware workflow guidance now ship across the built-in skills**: Writing-plans, executing-plans, parallel-exploration, dispatching-parallel-agents, systematic-debugging, test-driven-development, and verification-before-completion now explain when `hive_status()`, browser tools, Playwright MCP, `todo`, and `vscode/memory` materially improve the work instead of treating those capabilities as ambient background tools.

### Changed
- **Generated Scout, Forager, and Hygienic prompts now explain when to use browser, Playwright, todo, and memory**: The committed `.github/agents/*` artifacts and their generators now give role-specific guidance for rendered UI inspection, repeatable browser automation, active checklists, and durable note-taking.
- **Copilot instructions and workflow guidance now prefer task-triggered tool usage over generic capability lists**: The repo-wide Copilot steering and Hive workflow instruction now tell agents to load only the skill or tool guidance the current task actually triggers, reducing guesswork during planning, execution, and verification.
- **Version-bearing release surfaces are refreshed to `1.4.5`**: Root/workspace manifests, `packages/opencode-hive/plugin.json`, tracked workspace lockfile markers, the changelog, the dedicated release note, and the PHILOSOPHY evolution history now all describe the same shipped patch.

### Fixed
- **Multi-domain read-only investigations no longer leave `parallel-exploration` implicit**: Hive's generated Copilot guidance now makes the fan-out path explicit instead of relying on agents to infer the right skill from a generic list.
- **Committed generated Copilot artifacts no longer drift behind the updated generator contract**: The `.github/agents`, `.github/instructions`, `.github/copilot-instructions.md`, and `.github/skills/*` outputs are resynchronized with the source generators for the new tool-aware guidance.

## [1.4.4] - 2026-04-21

### Added
- **Copilot-native scaffolding now ships the full review/execution surface**: The generated `.github` artifact suite now carries the modern Copilot-first Hive workflow end to end — aligned agents, prompts, instructions, hooks, and skills that treat `plan.md` as the single required review and execution document while leaning on native browser, MCP, memory, and delegation capabilities instead of legacy helper flows.
- **Official ast-grep MCP adoption is now part of the shipped package contract**: The OpenCode-side package, templates, and supporting docs now point at the official ast-grep MCP server surface, so the recommended verification and structural-search setup no longer depends on an implied custom launcher story.

### Changed
- **Hive's Copilot/VS Code path now tells one response-first story**: The VS Code extension surface, generated Copilot agents, and supporting artifacts now consistently favor direct `@forager` execution, structured `hive_task_update` progress reporting, and a short final natural-language handoff rather than older worktree/merge-oriented Copilot guidance.
- **Generated agent metadata is aligned with current GitHub Copilot contracts**: Hive now keeps GPT-5.4 with no curated `tools:` block, Scout and Hygienic use Claude Sonnet 4.6, Forager offers GPT-5.4 or Claude Sonnet 4.6, and curated subagents now consistently expose `web`, `browser`, `io.github.upstash/context7/*`, `playwright/*`, `todo`, and `vscode/memory` where the Copilot path benefits from them.
- **Version-bearing release surfaces are refreshed to `1.4.4`**: Root/workspace manifests, `packages/opencode-hive/plugin.json`, tracked workspace lockfile markers, the changelog, the dedicated release note, and the PHILOSOPHY evolution history now all describe the same shipped `1.4.4` contract.

### Fixed
- **Generated Copilot artifacts no longer drift behind their source generators**: Stale model strings, outdated scoped tool IDs, and missing browser / Context7 / memory / todo assignments are now corrected in both generator source and committed artifacts, reducing divergence between what `initNest` produces and what the repo documents.
- **Worker completion stays machine-readable without losing the human summary**: The response-first worker path now preserves structured task-state updates and still ends with a concise natural-language handoff, making orchestrator state and operator review easier to trust.
- **OpenCode plan approval no longer depends on removed overview review counts**: `opencode-hive` now follows the shared plan-only approval contract instead of referencing the deleted `reviewCounts.overview` field, which restores a clean package build for release verification.

## [1.4.3] - 2026-04-12

### Added
- **Selective release recovery is now an explicit operator workflow**: The release documentation and workflow contract now describe how to rerun only the unfinished release targets for an existing `vX.Y.Z` tag, instead of improvising ad-hoc recovery after a partial publish.

### Changed
- **Copilot askQuestions parity now ships consistently across generated artifacts (PR #82)**: The merged askQuestions parity work is now part of the documented `1.4.3` release story, keeping the VS Code/Copilot artifact surface aligned with the same planning and execution flow that Hive already exposes elsewhere.
- **Release hardening now ships as part of the same patch**: `release:check` continues to enforce both the release artifact and workflow contracts, the workflow uses the checked-in npm publish access helper, and the release docs now spell out rehearsal-before-tagging plus tag-backed recovery so operators can validate and recover releases without relying on stale helper flows.

### Fixed
- **Release recovery guidance now matches the actual workflow gates**: The shipped docs and tests now reflect that manual rehearsals never publish, recovery is tag-only, and a recovery run must opt into the exact unfinished targets, reducing the chance of accidental republish attempts from the wrong ref or mode.

## [1.4.2] - 2026-04-10

### Added
- **Project-local config at `.hive/agent-hive.json` (PR #77)**: Agent Hive now reads config with explicit precedence: `<project>/.hive/agent-hive.json` first, falling back to the legacy `<project>/.opencode/agent_hive.json`, then global `~/.config/opencode/agent_hive.json`. If the new project config exists but is invalid, it skips the legacy fallback and falls back to global defaults with a visible `[hive:config]` runtime warning — rather than silently inheriting a stale config.
- **`hive_status()` now surfaces `helperStatus` (OpenCode-only, PR #79)**: Machine-readable interrupted wrap-up state is now available directly in `hive_status()` output under the `helperStatus` key. Fields include `doneTasksWithLiveWorktrees`, `dirtyWorktrees`, `nonInProgressTasksWithWorktrees`, `manualTaskPolicy`, and `ambiguityFlags`, giving orchestrators and operators an explicit, queryable surface for diagnosing stuck state.
- **Integrated issue #72 regression suite (PR #79)**: E2e smoke tests now cover the `3b`/`3c` helper follow-up failure modes from issue #72 — specifically, `hive_task_create` append-only enforcement and `hive_status` `helperStatus` contract — as a gated regression that runs with the standard `bun run test` suite.

### Changed
- **`hive-helper` is now a bounded hard-task operational assistant (PR #79)**: Previously merge-only, `hive-helper` now documents three bounded modes — merge recovery, state clarification, and safe manual follow-up assistance — while keeping the contract honest: manual tasks remain append-only, unfinished-task dependencies require plan amendment back to Hive/Swarm, and Helper stays runtime-only and network-blind. Its tool boundary is locked to `hive_merge`, `hive_status`, and `hive_context_write` only.
- **GitHub Copilot restored as a VS Code desktop preview path (PR #80)**: Hive's forward support story now reflects the milestone-1 direction honestly. OpenCode remains the first-class runtime. The VS Code desktop path is back as a supported preview via revived VS Code LM tool registration, modernized Copilot-native artifacts (prompt files, `copilot-instructions.md`, updated skill templates), and guidance that leans on Copilot's built-in browser, MCP, and Playwright workflows — without claiming parity across GitHub.com, cloud, CLI, or JetBrains.
- **OpenCode runtime contract trimmed to verifiable surfaces (PR #79)**: Removed `todoProjection`, `checkpoint.json`, child-session replay/provenance plumbing, and prompt/doc/test assertions that depended on extra runtime-only contracts that do not exist in the shipped OpenCode binary. Recovery stays bounded through durable `.hive` session metadata and `worker-prompt.md`.
- **Deterministic manual-task accept/reject matrix (PR #79)**: `TaskService.createManualTask()` now enforces the documented append-only, DAG-preserving policy deterministically: explicit dependencies on not-done tasks are rejected, insertion at non-sequential order positions is rejected, and the error messages are machine-readable with the correct follow-up action.
- **VS Code sidebar and bootstrap surfacing expanded (PR #80)**: `sidebarProvider` now surfaces more Hive artifacts (plan, tasks, context), `initNest` scaffolding generates updated Copilot-native artifact structure, and `regenerateAgents` refreshes the full suite including prompt files and `copilot-instructions.md`.
- **Plugin manifest regenerated to match slimmer runtime (PR #79)**: `packages/opencode-hive/plugin.json` regenerated to reflect only the hooks, tools, and agents that the plugin actually registers — removing stale contract entries that referenced removed infrastructure.

### Fixed
- **OpenCode smoke test no longer depends on local binary or layout assumptions (PR #79)**: `plugin-smoke.test.ts` is now gated behind a real `opencode` CLI check so CI no longer fails on environments without OpenCode installed. The `.opencode/plugin/hive.ts` fixture path is corrected to match the actual installed layout.

## [1.4.1] - 2026-04-10

### Changed
- Release prep and recovery guidance now document version-agnostic `vX.Y.Z` release steps, required npm / VS Code credential preflights, recovery of the missed `1.4.0` publish from the tagged commit, and the hardening/package-contract prep expected before tagging `1.4.1`.

### Fixed
- `opencode-hive` npm package now correctly includes `templates/` directory in the published artifact (`files` whitelist in `package.json`).
- `release-artifacts.test.mjs` is now version-aware (reads version dynamically from root `package.json`) and includes tarball assertions for `dist/index.js`, `skills/`, and `templates/`.
- GitHub Actions release workflow now runs `npm whoami` + `npm access list collaborators` preflight before `npm publish`, and `npx @vscode/vsce verify-pat` before VS Code publish, to catch expired credentials before attempting the upload.

## [1.4.0] - 2026-04-07

### Added
- **Deterministic Hive Network foundation (PR #75)**: Added `NetworkService` and `hive_network_query` so Hive, Architect, Swarm, and Hygienic can retrieve network-safe snippets from prior features with deterministic ordering and explicit JSON results.
- **Reserved context semantics documented end-to-end**: Clarified `overview` as the human-facing summary/history surface, `draft` as planner scratchpad, and `execution-decisions` as orchestration log while keeping `plan.md` as execution truth and AGENTS promotion limited to durable context.

### Changed
- **OpenCode is now the first-class harness story**: `opencode-hive` remains the primary supported runtime, `vscode-hive` stays as the review/sidebar companion, and GitHub Copilot / VS Code language-model-tool support is no longer a first-class supported path starting in `1.4.0`.
- **Branch hardening now ships as one coherent minor release**: Helper merge isolation, selective network visibility, and compaction/recovery guidance land together here instead of being described as separate patch follow-ups.
- **Bootstrap continuity is kept for now**: Existing `.github/*` artifact generation remains available for teams that still rely on it, but it is continuity scaffolding rather than the recommended primary workflow.

### Fixed
- **Helper/runtime boundary drift**: `hive-helper` remains merge-only and network-blind, reducing the chance that helper flows escape their integration-only role.
- **Historical context overreach**: Hive Network and AGENTS synchronization now respect network-safe / durable-only boundaries instead of treating all context as equal execution input.

## [1.3.6] - 2026-04-04

### Added
- **Worker-specific post-compaction replay (PR #67)**: Task-worker recovery now replays a bounded resume contract that re-binds the resumed Forager to the exact current task, re-reads the original `worker-prompt.md`, and explicitly forbids turning compaction recovery into merge/planning work
- **Structured DAG-aware manual tasks (PR #69)**: Manual tasks now carry structured metadata/spec content, explicit `dependsOn`, and refreshed pending-task sync support so follow-up work can be modeled as first-class DAG nodes instead of implicit sequential leftovers

### Changed
- **Review follow-up routing is now explicit**: Hive and Swarm now distinguish inline fixes, isolated manual tasks, and true plan amendments so review feedback changes the right execution surface instead of being forced through one generic path
- **Pending task refreshes preserve execution history**: `hive_tasks_sync({ refreshPending: true })` now rewrites only pending plan tasks from the latest approved plan while keeping manual tasks and tasks with execution history intact

### Fixed
- **Task-worker drift after compaction**: Resumed workers are re-bounded to their stored feature/task assignment instead of recovering into a generic assistant posture that can drift past the active task
- **Implicit dependency mistakes in follow-up work**: Manual-task creation and plan refresh flows now make dependencies explicit, reducing accidental sequencing errors when review feedback introduces new DAG edges

## [1.3.5] - 2026-03-30

### Added
- **Durable compaction recovery (PR #64)**: Main now persists global Hive session identity in `.hive/sessions.json`, classifies sessions as `primary`, `subagent`, `task-worker`, or `unknown`, and re-anchors compacted sessions so recovery can resume with the correct role and constraints instead of rediscovering state from scratch
- **Task-worker recovery from `worker-prompt.md`**: Compacted task workers now recover from durable worktree assignment metadata and the original `worker-prompt.md` launch contract so they resume the right task instead of drifting into generic planner behavior

### Changed
- **Directive replay after compaction**: Primary and subagent sessions now persist their original directive and replay it once on the first resumed turn so compaction recovery restores both role metadata and the user/task assignment together
- **Release history on main completed**: Main now carries forward the previously missing `v1.3.4` changelog and release-note record before documenting the new PR #64 work, so the `1.3.x` story distinguishes the shipped `v1.3.4` history repair from the new `v1.3.5` recovery changes

### Fixed
- **Session recovery after OpenCode compaction**: Hive now restores primary, subagent, and task-worker sessions from durable state without depending on prompt preservation, reducing the chance of lost role boundaries or missing assignment context after compaction

## [1.3.4] - 2026-03-25

### Added
- **PR #62 history-alignment release note**: Added a dedicated `v1.3.4` release record for PR #62 / `488aa29` so the `1.3.x` line now documents the reserved `context/overview.md` workflow, document-aware review handling, overview-first status/sidebar surfacing, indexed feature storage, and planner/orchestrator guidance under the corrective patch where this history alignment is explained honestly

### Changed
- **Release history alignment for PR #62**: Rewrote the `v1.3.2` changelog and release note so they no longer claim PR #62 literally shipped in `v1.3.2`; those records now explain that the release branch did not yet include the formal PR #62 history and that the explicit alignment arrives in `v1.3.4`
- **Version Bump**: Bumped root and package versions to `1.3.4` (`agent-hive`, `hive-core`, `opencode-hive`, `vscode-hive`)

### Fixed
- **Technically honest patch narrative**: Clarified that `v1.3.4` is a history-correction patch on top of `v1.3.3`, not new conflict resolution, because the shipped `1.3.x` tree already matched the PR #62 behavior being documented

## [1.3.3] - 2026-03-24

### Added
- **Recovered PR #57 payload**: Restored the missing VS Code / Copilot rewrite that should have been present on the release branch, including generated Copilot artifacts, updated LM tool wiring, regenerate-agents support, and the intended extension/sidebar cleanup

### Changed
- **Historical release notes corrected**: Split the published `v1.3.2` narrative from the actual `v1.3.3` recovery scope so the changelog no longer claims PR #57 shipped in `v1.3.2`
- **Version Bump**: Bumped root and package versions to `1.3.3` (`agent-hive`, `hive-core`, `opencode-hive`, `vscode-hive`)

### Fixed
- **Release lockfile repair**: Regenerated `package-lock.json` from corrected manifests so workspace versions now match `1.3.3` without corrupting the third-party `node_modules/once` entry
- **Undocumented shipped `v1.3.2` fix now recorded**: The release history now acknowledges the `6a2d870` status manifest test stabilization that shipped in `v1.3.2` but was omitted from the original notes

## [1.3.2] - 2026-03-21

### Added
- **Reserved Human-Facing Overview (PR #62)**: Features can now maintain `.hive/features/<feature>/context/overview.md` as the primary human-readable summary/history file while continuing to use existing context tooling for writes and updates
- **Document-Aware Review Tracking**: Plan and overview reviews now store unresolved threads separately so status, approvals, and UI review flows can distinguish `plan` feedback from `overview` feedback
- **Overview-First Status and VS Code Surfacing**: Hive status output and the VS Code extension now surface overview metadata, open overview first for humans when present, and keep the reserved overview out of generic context duplication
- **Reserved-Overview and Release-Branch Regression Coverage**: Added focused service, prompt, status, approval, sidebar, and plugin smoke tests covering overview exclusion from worker execution context, document-aware approval behavior, and the restored release-branch UX behavior

### Changed
- **Planner and Orchestrator Guidance**: Plan-writing prompts, tool messaging, and planning skills now instruct agents to refresh `context/overview.md` as the primary human-facing review artifact after meaningful plan changes while keeping `plan.md`/`spec.md` as execution truth
- **Approval Gate Semantics**: Plan approval now reports and blocks on unresolved comments in either `plan` or `overview`, including overview-first review flows in the VS Code extension and OpenCode plugin
- **Release-Branch VS Code Behavior Preserved**: Reconciliation work kept the dedicated Overview sidebar entry, excluded `overview.md` from generic context duplication, and re-exposed the `hive_status` language-model tool manifest entry after the PR #57 rewrite landed on the release branch
- **Custom Commit/Merge Messages (#63 / `ac7e78d`) Preserved**: The integrated release branch keeps optional `message` support for `hive_worktree_commit` and `hive_merge` across core, plugin, and VS Code surfaces
- **Release Verification Stability**: Stabilized the `writeAtomic()` regression coverage so full release verification no longer depends on environment-specific readonly-directory behavior

### Fixed
- **Worker Execution Context Purity**: Reserved `context/overview.md` is no longer injected into worker prompt/spec payloads, preserving `plan.md` as the execution contract
- **Review Approval Feedback**: Approval flows now return document-aware unresolved-comment counts instead of overlooking overview comments or failing with less actionable messaging
- **Status manifest test stabilization (`6a2d870`)**: The shipped `v1.3.2` tag included the `packages/vscode-hive/src/tools/status.test.ts` stabilization fix even though the original release notes were drafted one commit earlier

## [1.3.1] - 2026-03-17

### Added
- **Custom Multi-Model Subagents**: Users can now define `customAgents` in `~/.config/opencode/agent_hive.json` to create additional taskable workers and reviewers derived from `forager-worker` or `hygienic-reviewer`. Custom agents inherit the base prompt, tools, and permissions while allowing targeted overrides for `model`, `temperature`, `variant`, and `autoLoadSkills`
- **`hive_worktree_start` Tool**: New dedicated tool for normal task starts, split from `hive_worktree_create`. `hive_worktree_start` handles pending/failed tasks; `hive_worktree_create` is now exclusively for resuming blocked tasks (`continueFrom: "blocked"`)
- **Custom Agent Delegation in `hive_worktree_start`**: Returns `defaultAgent`, `eligibleAgents`, and delegation instructions so orchestrators can choose the best-matching configured worker instead of always using the built-in forager
- **Custom Agent Prompt Injection**: Configured custom subagents are surfaced in primary orchestrator prompts (`hive-master`, `architect-planner`, `swarm-orchestrator`) under a "Configured Custom Subagents" section for routing guidance
- **Reserved-Name Guardrails**: Custom agent IDs cannot shadow built-in Hive agents, plugin aliases, or OpenCode operational agent IDs
- **Seeded Config Templates**: `hive_init` generates `agent_hive.json` with commented-out custom agent examples that are self-disqualifying, making it easy to define custom agents by filling in real values
- **`compaction-hook.test.ts`** and **`hook-cadence.test.ts`**: New regression tests for hook behavior and cadence logic
- **`HOOK_CADENCE.md`**: Documentation for the hook cadence system

### Changed
- **`hive_worktree_create` API Hardened**: Now exclusively for blocked-resume paths. Rejects calls where task state is not `blocked` with a structured `terminal: true` error to stop retry loops. Returns `reason: "task_not_blocked"` and `correctTool: "hive_worktree_start"` for clear orchestrator guidance
- **Blocked-Resume Response Contracts**: All blocked-resume guard responses now include `success`, `terminal`, `reason`, and `nextAction` fields for machine-readable orchestration
- **Agent Prompts (Hive, Swarm)**: Updated tool guidance to use `hive_worktree_start` for normal starts and `hive_worktree_create` strictly for blocked resumes. Added "Configured Custom Subagents" section with reviewer routing guidance
- **Dependency Check responses**: `executeWorktreeStart` now returns `terminal: true` with `reason: "dependencies_not_done"` when task dependencies are unmet
- **`hive_status` nextAction**: Updated to suggest `hive_worktree_start` for runnable tasks
- **Skills Updated**: `dispatching-parallel-agents`, `executing-plans`, and `parallel-exploration` skills updated for `hive_worktree_start` / `hive_worktree_create` split
- **ConfigService Extended**: Normalizes custom agents, inherits effective base-agent runtime config, and exposes lookup helpers for custom agent resolution
- **Variant Hook Extended**: Applies configured variants to accepted custom agents through the shared `chat.message` variant hook path
- **VSCode Extension Aligned**: `exec.ts`, `status.ts`, `task.ts`, and `initNest.ts` updated to reflect the `hive_worktree_start` / `hive_worktree_create` semantics split
- **Version Bump**: Bumped root and package versions to `1.3.1` (`agent-hive`, `hive-core`, `opencode-hive`, `vscode-hive`)

### Fixed
- **Blocked-Resume Retry Loops**: Orchestrators that drifted into retrying `continueFrom: "blocked"` on non-blocked tasks now receive a hard terminal rejection with a corrective `nextAction`, breaking the loop
- **Skill Template Reference**: `parallel-exploration` skill now references `hive_worktree_start` (not `hive_worktree_create`) for parallel implementation work
- **Custom Agent Skill Deduplication**: Inherited `autoLoadSkills` are merged and deduplicated against base agent skills so skills are not loaded twice

### Design Notes
- Base agents supported for custom derivation: `forager-worker` and `hygienic-reviewer` only — primary planner/swarm/scout derivation explicitly out of scope (likely never supported)
- No automatic semantic router added; orchestrators still choose the worker/reviewer from prompt-visible descriptions — keeps models in control of routing decisions
- Custom prompt overrides not supported in this slice — the combination of Hive system prompt + role `description` field is sufficient for correct model "expert mode" activation
- Self-disqualifying config templates chosen over JSONC comments to maintain JSON schema compatibility

## [1.3.0] - 2026-02-25

### Added
- **Multi-Source Prompt Alignment (OMO + Claude + Anthropic + Codex)**: Updated Forager, Hive, Swarm, and Scout prompts with stronger intent extraction/verbalization, exploration hierarchy, verification discipline, and concise instruction patterns
- **PHILOSOPHY.md v1.3.0 Evolution Notes**: Added a dedicated evolution section documenting adopted patterns, rejected patterns, and rationale across all four source guides

### Changed
- **Verification Model**: Shifted from mandatory TDD verification to best-effort worker verification + orchestrator batch testing. Workers use ast-grep for lightweight code checks in worktrees (no project dependencies needed). Orchestrators run full build + test suite after merging each batch on the main branch
- **Forager Prompt**: Removed TDD flow, added best-effort ast-grep verification model. Workers focus on writing quality code with ~80% confidence, not overthinking verification. Added `ast_grep_scan-code` and `ast_grep_find_code` to Allowed Research tools
- **Hive Prompt**: Added Batch-Merge-Verify Workflow section — orchestrator merges batch, runs `build` + `test`, diagnoses failures with full context
- **Swarm Prompt**: Same batch-merge-verify workflow as Hive. Replaced "Merge only after verification passes" with batch workflow reference
- **AGENTS.md**: Updated worktree dependency note and P6 description to reflect best-effort + batch verification model
- **Verification Gate Softened**: `hive_worktree_commit` no longer hard-rejects commits without test/build keywords. Returns advisory `verificationNote` field instead, keeping keyword tracking for observability
- **Prompt Contract Cleanup**: Restored compatibility phrases required by prompt regression tests while keeping aligned behavior updates (turn termination wording, completion/blocked guidance, verification section headings)
- **Branch Hygiene for Hive Artifacts**: Removed `.hive/features/omo-pattern-alignment` files from git tracking on this branch while preserving local copies for operator continuity
- **Version Bump**: Bumped root and package versions to `1.3.0` (`agent-hive`, `hive-core`, `opencode-hive`, `vscode-hive`)

### Fixed
- **AST Tool Name Mismatch**: Replaced non-existent `ast_grep_search` prompt references with available AST tools
- **Plugin E2E Contract**: Updated plugin smoke test expectation to match advisory `verificationNote` behavior for `hive_worktree_commit` when verification evidence is missing

### Design Notes
- Symlinks for shared node_modules rejected: cross-platform risk (Windows), potential dependency conflicts
- Pure batch testing (zero worker verification) rejected: too many back-and-forth cycles
- ast-grep chosen over LLM self-review: already integrated via MCP, no new dependencies, ~80% accuracy vs ~50% for LLM review
- Agent prompts kept language-agnostic (not bun/node specific) since Hive supports Python, Go, Rust, etc.

## [1.2.0] - 2026-02-08

### Added
- **Docker Mastery Skill**: On-demand skill teaching agents container thinking — debugging, docker-compose, Dockerfile authoring, image optimization, integration testing. Primary user: Forager. Loaded via `hive_skill("docker-mastery")`
- **AGENTS.md Mastery Skill**: On-demand skill teaching agents what makes effective pseudo-memory — signal vs noise filtering, section structure, when to prune. Primary users: Hive, Swarm, Architect. Loaded via `hive_skill("agents-md-mastery")`
- **Atomic AGENTS.md Apply**: New `apply` action on `hive_agents_md` tool — agents propose → user approves → apply writes atomically to eliminate manual edit errors
- **Persistent Sandbox Containers**: One container per worktree, reused across commands via `docker exec`. 50 test runs = 1 container (not 50). Reduces overhead, speeds up test execution
- **Context Lifecycle Management**: `archive()` moves stale contexts to timestamped archive/, `stats()` reports context health (count/size/age), size warning at 20K chars
- **Sandbox Bypass Audit Logging**: All HOST: commands logged with `[hive:sandbox]` prefix for visibility into sandbox escape usage

### Changed
- **Discovery Gate Tightened**: Replaced substring match with regex + 100 char minimum content length. Empty or comment-hidden Discovery sections now rejected (P7 Hard Gates enforcement)
- **Forager Prompt**: Removed HOST: escape hatch documentation — agents must report as blocked and ask users when host access needed
- **Agent Prompts (Hive, Swarm, Forager)**: Added skill references for docker-mastery and agents-md-mastery
- **Skill Count**: 9 skills → 11 skills (docker-mastery, agents-md-mastery added)
- **JSON Schema**: Added sandbox, dockerImage, and persistentContainers properties to agent_hive.schema.json

### Fixed
- **Discovery Gate Bypass**: Empty Discovery sections or hidden Discovery headers (in HTML comments) no longer pass validation

## [1.1.1] - 2026-02-08

### Added
- **AGENTS.md Self-Maintenance Tool**: New `hive_agents_md` tool with `init` and `sync` operations — agents can bootstrap AGENTS.md from codebase analysis and propose updates from feature context discoveries (with approval gate per P2)
- **Docker Sandbox Isolation**: Level 1 Docker sandboxing for worker execution — transparent bash interception wraps test commands in containers, auto-detects project runtime (node/python/go/rust), includes `HOST:` escape hatch for host-level operations

### Changed
- **Architect Prompt Hardened**: Expanded intent classification with Strategy column, 6-item clearance checklist, Test Strategy section, Turn Termination rules
- **Forager Prompt Hardened**: "Resolve Before Blocking" guidance (try 3+ approaches), expanded Orient pre-flight, 6-item Completion Checklist
- **Forager Prompt**: Added Docker Sandbox awareness section to Iron Laws — explains transparent container wrapping and HOST: escape hatch
- **Scout Prompt Fixed**: Fixed leaked persistence example (truncated research dump), added year awareness to Iron Laws
- **Swarm Prompt Hardened**: Removed non-existent "oracle" subagent reference, added "After Delegation — VERIFY" checklist, Turn Termination
- **Hive Prompt Hardened**: Turn Termination (valid/invalid endings), Hard Blocks table replacing vague Iron Laws prose, AI-Slop Flags
- **Hygienic Prompt Hardened**: Agent-executable verification emphasis with ✅/❌ examples, expanded Active Implementation Simulation
- **Writing-Plans Skill**: Added agent-executable acceptance criteria guidance
- **Hive Skill Loading**: Added `systematic-debugging`, `test-driven-development`, `verification-before-completion` to Hive's skill table
- **PHILOSOPHY.md**: Added "Wax Seal" (sandbox) to Hive Terminology table, added v1.1.1 evolution notes documenting AGENTS.md integration and Docker sandbox design decisions
- **Agent Prompts (Hive + Swarm)**: Added AGENTS.md maintenance guidance — orchestrators sync context findings after feature completion

### Removed
- **Onboarding Skill**: Deleted — unreferenced by any agent (10 skills → 9)

### Fixed
- **Broken Skill References**: Fixed `executing-plans` referencing deleted `finishing-a-development-branch`, fixed `test-driven-development` referencing non-existent `@testing-anti-patterns.md`
- **Skill Registry Regenerated**: `registry.generated.ts` updated to reflect 9 skills

### Stats
- 6 agent prompts updated, 3 skills fixed/removed, 39 prompt tests added/updated
- Clean build across all 3 packages, 9 skills registered

## [1.1.0] - 2026-02-06

### Added
- **Worker Orient Phase**: Forager agents now run a pre-flight checklist before coding — read references, check patterns, verify assumptions. Prevents "code first, ask questions later" failures
- **Task-Type Auto-Inference**: `buildSpecContent()` automatically infers task type (greenfield/testing/modification/bugfix/refactoring) from task name and plan section, giving workers better context without manual annotation
- **Post-Batch Code Review Checkpoints**: After each batch merge, orchestrators (Hive + Swarm) prompt for optional Hygienic reviewer consultation to catch drift early
- **Scout Research Persistence**: Scout agents now persist research findings to context files via `hive_context_write`, so discoveries survive for future workers instead of dying with the session
- **Active Discovery**: Planning agents (Hive + Architect) challenge user assumptions during planning — collaborative pushback on proposals that may not survive "Good Enough Wins" (P4)
- **Worktree Info in `hive_status`**: Task status output now includes worktree path and branch info per task for better visibility

### Changed
- **Tool Consolidation**: Simplified from 22 tools → 14 tools by removing redundant background task and journal infrastructure
- **Tool Rename**: `hive_exec_start` → `hive_worktree_create`, `hive_exec_complete` → `hive_worktree_commit` — names now reflect the worktree-based execution model
- **Worker Summary Guidance**: Forager prompts now guide richer summaries (files changed, key decisions, gotchas, what's left) instead of the old notepad-based approach
- **All Agent Prompts Updated**: Hive, Swarm, Architect, Scout, Forager, Hygienic — all reflect the consolidated tool set and new capabilities
- **All Skills Updated**: Removed background task references, renamed exec→worktree throughout
- **VS Code Extension Updated**: Tool registrations reflect the 14-tool set

### Removed
- **Background Task Infrastructure**: ~5,000 lines deleted — `agent-gate.ts`, `concurrency.ts`, `manager.ts`, `poller.ts`, `store.ts`, `types.ts`, `background-tools.ts` and tests. The complexity wasn't justified; direct worktree execution is simpler and more reliable
- **`delegateMode` Config**: Removed from types and configuration — no longer needed without background tasks
- **Journal Infrastructure**: Removed journal paths, templates, and references from hive-core — journals were write-only artifacts nobody read
- **8 Redundant Tools**: `hive_background_start`, `hive_background_status`, `hive_background_cancel`, `hive_background_result`, `hive_exec_start`, `hive_exec_complete`, `hive_journal_read`, `hive_feature_status`
- **Dead Notepad References**: Cleaned up stale notepad guidance from forager prompt

### Fixed
- **Stale Tool References**: `hive_exec_start`/`hive_exec_complete` → `hive_worktree_create`/`hive_worktree_commit` in PHILOSOPHY.md and all documentation

### Stats
- 54 files changed, 512 insertions, 7,328 deletions (net ~6,800 lines removed)
- Test suite: 88 tests across 5 files (4 new tests for task-type inference)
- Clean build across all 3 packages (hive-core, opencode-hive, vscode-hive)

## [1.0.7] - 2026-02-04

### Added
- **E2E Smoke Tests**: Comprehensive end-to-end testing suite for the OpenCode plugin
  - Plugin smoke tests covering core functionality
  - Better test coverage for task delegation workflows
- **@path Prompt References**: Use `@path` prompt references for task delegation
  - More reliable worker prompt referencing for native tasks
  - Improved path handling in worker prompts

### Fixed
- **Missing Dependency Skills**: Fixed missing dependency skills in OpenCode agents
  - Align plan templates with updated dependency guidance
  - Architect agent: updated to include missing dependency skills
  - Hive agent: synchronized with new dependency handling
  - Swarm agent: added missing skill references
  - Skills registry: regenerated to include all required dependencies

### Changed
- **Documentation**: Enhanced documentation across all packages
  - AGENTS.md: Added guidance on worker prompt referencing
  - OpenCode Hive README: Expanded documentation on task delegation
  - DATA-MODEL.md: Updated data model documentation
  - HIVE-TOOLS.md: Clarified tool usage patterns
- **Writing-Plans Skill**: Major skill documentation update
  - 95 insertions, 52 deletions for better clarity
  - Better dependency annotation guidance
  - Clearer task structure documentation

## [1.0.6] - 2026-02-03

### Added
- **Task Dependency System**: Full dependency tracking and enforcement for task ordering
  - Parse task dependencies from plan templates using `@dep:task-name` syntax
  - Persist task dependencies in status metadata for runtime validation
  - Validate task dependency graphs during `hive_tasks_sync` to catch cycles and missing dependencies
  - Enforce dependencies at execution entrypoints to ensure proper task sequencing
  - Surface runnable tasks and dependency blocks in `hive_status` for visibility
  - Guide dependency-aware task batching to optimize parallel execution while respecting dependencies
  - Dependency annotations in plan templates with clear syntax documentation
- **Architect Task Delegation**: Allow Architect agent to delegate execution tasks via `task()` function
  - Enable Architect to transition from planning to execution by spawning workers
  - Document task() parallelism rules in dispatching-parallel-agents skill
  - Add task-mode guidance to parallel-exploration skill
  - Align Hive/Swarm prompts and tools template with delegateMode configuration

### Fixed
- **Scout Agent Improvements**: Prevent scout background recursion and auto-loading issues
  - Stop scout auto-loading parallel exploration skill unnecessarily
  - Block background delegation from subagents to prevent recursion
  - Disable delegation tools inside workers for proper permission boundaries
  - Deny delegation permissions for subagents to enforce architectural boundaries
  - Prevent scout background recursion with proper checks
- **Dependency Graph Alignment**: Fix alignment of legacy dependency fallback across all tools
- **Spec Generation**: Unify spec generation across sync and exec for consistency
- **Tool Alignment**: Align opencode hive tools with dependency graphs

### Changed
- **Documentation**: Comprehensive documentation updates
  - Standardize on `hive_background` tools terminology
  - Update background task reminders with better guidance
  - Describe dependency semantics in `hive_status` documentation
  - Clarify Architect task() delegation rules

### Tests
- Extended dependency parsing and enforcement coverage

## [1.0.5] - 2026-01-31

### Added
- Support user custom skills for autoloader

### Fixed
- Normalize Windows path casing in prompt validation and plan comments

## [1.0.4] - 2026-01-29

### Added
- New `code-reviewer` skill for reviewing code changes.

### Fixed
- Inject `autoLoadSkills` in prompts to ensure agents receive skill instructions reliably.


## [1.0.2] - 2026-01-27

### Added
- `agentMode` and `delegateMode` configuration for unified or dedicated agent orchestration.
- Gated agent registration based on `agentMode`.

### Changed
- Improved package-wide build scripts and build order using `bun --filter`.
- Updated default configuration generation and accessors.

### Fixed
- Resolved issues with `opencode.json` registration in unified mode.

## [1.0.1] - 2026-01-27

### Added
- Parallel exploration skill with default auto-load for planner agents.
- Per-agent model variant configuration in opencode-hive.
- Selective disable support for skills and MCPs.

### Changed
- Background task timeout guidance and defaults (30–120s guidance, 60s default).
- Delegation/planning tuning and worker prompt de-dup + prompt file delegation.

### Tests & Docs
- Stabilized runtime smoke tests and auto-load skill coverage.
- Documented per-agent variant configuration.

## [0.8.3] - 2026-01-20

- See the GitHub release/tag `v0.8.3` for details.


## [0.8.2] - 2026-01-11

- See the GitHub release/tag `v0.8.2` for details.
