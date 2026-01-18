# Research Findings: Post-Merge Review Flow

## Issue Reference
https://github.com/tctinh/agent-hive/issues/5

## Problem Statement

When hive tools execute merges from worktrees, the git diff view in VS Code disappears.
This breaks the developer's ability to review code changes after autonomous agent execution.

## Current Architecture

### Merge Flow (what happens today)
```
hive_exec_complete(task)
├── Commits changes to task branch
├── Updates task status to 'done'
└── Worktree preserved at path

hive_merge(task, strategy)
├── Validates task status = 'done'
├── Calls worktreeService.merge()
├── Returns: { success, sha, filesChanged[] }
└── ❌ DIFF CONTENT NOT PRESERVED
```

### Key Files
- `packages/opencode-hive/src/index.ts:445-471` - hive_merge tool
- `packages/hive-core/src/services/worktreeService.ts:498+` - merge implementation
- `packages/vscode-hive/src/tools/merge.ts` - VS Code extension wrapper

### Feedback Mechanism (current)
- `hive_session_refresh` exists for checking user steering
- Tools hint: "Call hive_session_refresh periodically"
- Agent must explicitly call - no proactive polling
- Comments stored in plan.md (inline comments via VS Code)

## Feature Request (from @rbcb-bedag)

### Three Components Requested:

1. **Markdown editor with comments** ✅ DONE (Issue #4)
   - Implemented in hive-queen-panel feature

2. **Post-merge diff review** ❌ NOT IMPLEMENTED
   - View code changes even AFTER worktree merge
   - Comment on specific code lines/hunks
   - Preserve diff info in JSON for later viewing

3. **Proactive feedback polling** ❌ NOT IMPLEMENTED
   - All hive tools check for new comments automatically
   - Agent reacts without explicit refresh call

## Technical Considerations

### For Diff Preservation
- Capture git diff BEFORE merge
- Store in `.hive/features/{feature}/tasks/{task}/diff.json`
- Include: patch content, files changed, before/after SHAs
- VS Code extension reads diff.json to render diff view

### For Proactive Polling
- Option A: Every tool response includes pending_comments
- Option B: Extension polls and notifies via file watchers
- Option C: Webhook/event system between extension and agent

### VS Code Diff API
- `vscode.commands.executeCommand('vscode.diff', uri1, uri2, title)`
- Can create virtual documents for before/after content
- TextDocumentContentProvider for custom schemes
