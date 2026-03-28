# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.4] - 2026-03-25

### Added
- **PR #62 history-alignment release note**: Added a dedicated `v1.3.4` release record for commit `488aa29` so the `1.3.x` line now documents the reserved overview workflow, document-aware review flow, overview-first status/sidebar surfacing, indexed feature storage, and prompt guidance under the corrective patch where this history alignment is explained honestly

### Changed
- **Release history alignment for PR #62**: Rewrote the `v1.3.2` changelog and release note so they no longer claim PR #62 literally shipped in `v1.3.2`; those records now explain that the release branch did not yet include PR #62 history and that the formal PR #62 history alignment arrives in `v1.3.4`
- **Version Bump**: Bumped root and package versions to `1.3.4` (`agent-hive`, `hive-core`, `opencode-hive`, `vscode-hive`)

### Fixed
- **Technically honest patch narrative**: Clarified that `v1.3.4` is a history correction on top of `v1.3.3`, not new source conflict resolution, because PR #62 (`488aa29`) is already tree-equivalent to the shipped `1.3.3` release line

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
- **Corrected historical note**: The published `v1.3.2` release did not yet include PR #62 as literal branch history; this record now describes the shipped status-manifest stabilization and preserves the branch narrative until the formal PR #62 history alignment arrives in `v1.3.4`

### Changed
- **Release branch record clarified**: The `1.3.2` tag notes now separate what was truly published on the `1.3.x` branch from later PR #62 reconstruction work, while still preserving the shipped `6a2d870` follow-up fix in the historical record

### Fixed
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
