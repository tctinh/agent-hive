# Task: 04-drop-hiveask

## Feature: hive-simplify-focus

## Context

## simplify-focus

# Simplify Hive — Context

## The Problem
We over-engineered. Queen Panel is a dashboard (we said we're not that). 24+ tools wrap file ops agents can do directly. Three skills when one would do.

## Decisions
- Remove Queen Panel entirely (keep sidebar)
- File-based approval: `.hive/features/<feature>/APPROVED` marker
- Drop `hive_ask` → use OpenCode `question` tool
- Merge 3 skills → single `hive.md`
- CLI-first, VS Code sidebar secondary

## Key Files
- Queen Panel: `packages/vscode-hive/src/panels/*`, `media/hiveQueen.*`, `extension.ts`
- Skills: `packages/hive-core/templates/skills/*`, `src/templates.ts`
- Plan approval: `packages/hive-core/src/services/planService.ts`
- Prompts: `oh-my-opencode/src/agents/*-prompt.ts`

## Philosophy Alignment
- P4: Good enough wins — stop over-engineering
- Free-form context — no rigid task specs
- Human shapes, Agent builds — plan says what/why, worker figures out how


## Completed Tasks

- 01-inventory-what-we-have: Created HIVE-TOOLS.md inventory documenting 25 tools (23 keep, 2 remove: hive_ask, hive_ask_list_pending) and 7 skills (3 consolidate into hive.md, keep copilot-agent.md separate).
- 02-remove-queen-panel: Removed Queen Panel completely: deleted panels/ and webview/ directories (HiveQueenPanel.ts, types.ts, hiveQueen.ts = 1458 lines). Updated extension.ts to remove imports, status bar item, hive.openQueenPanel and hive.showAsk commands. Updated package.json to remove command registration, keybinding, and webview build step. Net -1,557 lines.
- 03-file-based-approval-marker: Implemented file-based APPROVED marker. Added getApprovedPath() to paths.ts. Updated PlanService: approve() creates APPROVED file with timestamp, write() deletes it (revokeApproval), read() checks marker for status. Maintains backwards compatibility with feature.json.

