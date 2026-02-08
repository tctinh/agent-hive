# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
