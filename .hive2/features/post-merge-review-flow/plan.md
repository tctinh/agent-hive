# Post-Merge Review Flow

> Issue: https://github.com/tctinh/agent-hive/issues/5
> Vision: Review code changes even AFTER worktree merge, with comment feedback loop
> Decisions: Patch+JSON storage, native VS Code diff, per-task comments, extension-push feedback

## Overview

Enable developers to review code diffs and leave comments on agent work **after autonomous merge completion**. Currently, once `hive_merge` runs, the git diff disappears from VS Code. This feature preserves diffs and enables post-merge code review with a feedback loop back to agents.

### Components

1. **Diff Preservation** - Capture and store diff before merge
2. **Diff Viewing** - Open preserved diffs in VS Code native diff view
3. **Feedback Push** - Extension signals new comments to agents via file

---

## Tasks

### 1. Extend WorktreeService to capture diff before merge

Modify `worktreeService.merge()` to capture full diff content before performing the merge operation.

**What to implement:**
- Before merge, run `git diff {base}...{branch}` to get full patch
- Run `git diff --stat` to get file change summary
- Store both in task directory as `diff.patch` and `diff.json`
- Update MergeResult type to include diff metadata

**Files to modify:**
- `packages/hive-core/src/services/worktreeService.ts`
- `packages/hive-core/src/types.ts`

**diff.json schema:**
```json
{
  "capturedAt": "ISO timestamp",
  "baseSha": "abc123",
  "mergeSha": "def456", 
  "strategy": "squash",
  "files": [
    { "path": "src/foo.ts", "additions": 10, "deletions": 5, "status": "modified" }
  ],
  "stats": { "filesChanged": 3, "insertions": 45, "deletions": 12 }
}
```

### 2. Update hive_merge tool to save diff artifacts

Ensure the hive_merge tool orchestrates diff capture and storage.

**What to implement:**
- Call new diff capture method before merge
- Write `diff.patch` and `diff.json` to task directory
- Include diff summary in tool response message
- Handle errors gracefully (merge succeeds even if diff capture fails)

**Files to modify:**
- `packages/opencode-hive/src/index.ts` (hive_merge tool)
- `packages/vscode-hive/src/tools/merge.ts` (VS Code version)

### 3. Add VS Code command to open task diff

Create a command that opens the preserved diff in VS Code's native diff view.

**What to implement:**
- New command: `hive.openTaskDiff`
- Read `diff.patch` from task directory
- Use TextDocumentContentProvider to create virtual "before" document
- Use `vscode.diff` command to show native diff view
- Register in package.json and command palette

**Technical approach:**
```typescript
// Register content provider for hive-diff:// scheme
// Parse patch to reconstruct "before" content
// Open: vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, title)
```

**Files to create/modify:**
- `packages/vscode-hive/src/diffProvider.ts` (new)
- `packages/vscode-hive/src/extension.ts`
- `packages/vscode-hive/package.json`

### 4. Add diff button to task tree view

Add UI affordance to open diff from the Hive sidebar.

**What to implement:**
- Add "View Diff" inline button on completed+merged tasks
- Only show if `diff.patch` exists
- Clicking triggers `hive.openTaskDiff` command
- Add icon (e.g., `$(diff)`)

**Files to modify:**
- `packages/vscode-hive/src/providers/sidebarProvider.ts`
- `packages/vscode-hive/package.json` (menu contributions)

### 5. Implement per-task review comments storage

Create infrastructure for storing code review comments per task.

**What to implement:**
- New file: `.hive/features/{feature}/tasks/{task}/review-comments.json`
- Schema for comments with line references
- Service methods: addComment, getComments, resolveComment
- Comments reference file path + line number from diff

**review-comments.json schema:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "createdAt": "ISO timestamp",
      "file": "src/foo.ts",
      "line": 42,
      "hunk": "@@ -40,6 +40,10 @@",
      "body": "This should handle null case",
      "resolved": false
    }
  ]
}
```

**Files to create/modify:**
- `packages/hive-core/src/services/reviewService.ts` (new)
- `packages/hive-core/src/index.ts` (export)

### 6. Add comment UI to diff view

Enable adding comments from the diff view.

**What to implement:**
- CodeLens provider for diff view showing "Add Comment" on each hunk
- Or: Context menu "Add Review Comment" on selected lines
- Modal/input box to enter comment text
- Save to review-comments.json via reviewService

**Files to create/modify:**
- `packages/vscode-hive/src/reviewCodeLensProvider.ts` (new)
- `packages/vscode-hive/src/extension.ts`

### 7. Implement feedback signal file mechanism

Extension writes pending feedback to a signal file that agents can detect.

**How it works:**
```
Developer adds comment in VS Code
    ↓
Extension detects change (file watcher on review-comments.json)
    ↓
Extension writes: .hive/features/{feature}/pending-feedback.json
    ↓
Agent's next hive tool call reads this file
    ↓
Tool response includes: "⚠️ Pending feedback on task X"
    ↓
Agent reacts to feedback
```

**pending-feedback.json schema:**
```json
{
  "updatedAt": "ISO timestamp",
  "items": [
    {
      "type": "review-comment",
      "task": "01-extract-auth",
      "count": 2,
      "preview": "This should handle null case..."
    }
  ]
}
```

**Files to create/modify:**
- `packages/vscode-hive/src/feedbackWatcher.ts` (new)
- `packages/vscode-hive/src/extension.ts`

### 8. Update hive tools to check pending feedback

Modify key hive tools to read and surface pending feedback.

**What to implement:**
- Helper function: `checkPendingFeedback(feature)`
- Integrate into: `hive_session_open`, `hive_exec_start`, `hive_task_update`
- Append feedback summary to tool response when present
- Clear feedback items when agent acknowledges (optional)

**Files to modify:**
- `packages/opencode-hive/src/index.ts`
- `packages/hive-core/src/services/feedbackService.ts` (new)

### 9. Add hive_review_read tool

New tool for agents to explicitly read review comments.

**What to implement:**
- Tool: `hive_review_read(task)` - returns all review comments for a task
- Tool: `hive_review_respond(task, commentId, response)` - agent responds to comment
- Include in both opencode-hive and vscode-hive

**Files to modify:**
- `packages/opencode-hive/src/index.ts`
- `packages/vscode-hive/src/tools/review.ts` (new)

### 10. Update Queen Panel to show review status

Integrate review status into the existing Hive Queen Panel.

**What to implement:**
- Show badge on tasks with unresolved comments
- List pending comments in task detail view
- Quick action to open diff view from panel

**Files to modify:**
- `packages/vscode-hive/src/panels/HiveQueenPanel.ts`
- `packages/vscode-hive/src/webview/hiveQueen.ts`

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        BEFORE MERGE                              │
├─────────────────────────────────────────────────────────────────┤
│  hive_merge()                                                    │
│      │                                                           │
│      ├── Capture: git diff base...branch > diff.patch           │
│      ├── Capture: git diff --stat > diff.json                   │
│      ├── Store: .hive/.../tasks/{task}/diff.*                   │
│      └── Execute: git merge/squash/rebase                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      DIFF VIEWING                                │
├─────────────────────────────────────────────────────────────────┤
│  VS Code Extension                                               │
│      │                                                           │
│      ├── DiffContentProvider (hive-diff:// scheme)              │
│      ├── Parse diff.patch → reconstruct before/after            │
│      └── vscode.diff(beforeUri, afterUri, title)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FEEDBACK LOOP                                 │
├─────────────────────────────────────────────────────────────────┤
│  Developer adds comment                                          │
│      ↓                                                           │
│  Extension writes pending-feedback.json                          │
│      ↓                                                           │
│  Agent's next tool call reads file                               │
│      ↓                                                           │
│  Tool response: "⚠️ 2 pending comments on task X"               │
│      ↓                                                           │
│  Agent calls hive_review_read(task)                              │
│      ↓                                                           │
│  Agent addresses feedback or responds                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] `hive_merge` creates `diff.patch` and `diff.json` in task directory
- [ ] "View Diff" button appears on merged tasks in sidebar
- [ ] Clicking opens native VS Code diff view with before/after
- [ ] Can add comments on diff lines, saved to `review-comments.json`
- [ ] Extension auto-writes `pending-feedback.json` when comments added
- [ ] `hive_session_open` and key tools surface pending feedback
- [ ] `hive_review_read` tool returns comments for agent consumption
- [ ] Queen Panel shows review status badges

---

## Out of Scope

- GitHub PR integration (future enhancement)
- Comment threading/replies (keep flat for v1)
- Real-time collaboration (single developer flow)
- Diff for non-merged tasks (use normal git diff)
