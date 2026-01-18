# Implementation Map

## 9 Tasks → 3 Files

| File | Tasks |
|------|-------|
| `opencode-hive/src/index.ts` | 5, 7, 9 |
| `vscode-hive/src/extension.ts` | 1, 4, 6 |
| `vscode-hive/src/panels/HiveQueenPanel.ts` | 2, 3, 5, 8 |

## Task Details

### Task 1: Remove gate
- **File**: `extension.ts` line 362-367
- **Change**: Delete if-block that requires active feature

### Task 2: Dashboard view
- **File**: `HiveQueenPanel.ts`
- **Add**: Mode `'dashboard'`
- **Data**: `fs.readdirSync('.hive/features/')` + read each
- **Show**: Cards with badges (blocked/review/active/stale)

### Task 3: Feature detail
- **File**: `HiveQueenPanel.ts`
- **Change**: Click card → show plan + tasks
- **Add**: Back to dashboard button

### Task 4: Diff view
- **File**: `extension.ts`
- **Add**: Command `hive.viewTaskDiff`
- **How**: `git diff main...branch` + `vscode.diff`

### Task 5: BLOCKED check
- **File**: `index.ts` (opencode-hive)
- **Where**: `hive_exec_start`
- **Check**: `fs.existsSync(BLOCKED)` → return message
- **Also**: Button in HiveQueenPanel

### Task 6: Status bar
- **File**: `extension.ts` line 86-134
- **Enhance**: Show `🐝 N | 🟡 N | ⛔ N`

### Task 7: hive_request_review
- **File**: `index.ts` (opencode-hive)
- **New tool** that:
  1. Appends to report.md
  2. Creates PENDING_REVIEW
  3. Polls until gone
  4. Returns REVIEW_RESULT

### Task 8: Review UI
- **File**: `HiveQueenPanel.ts`
- **Add**: Review panel mode
- **Show**: Summary, diff link, approve/changes buttons
- **Actions**: Write REVIEW_RESULT, delete PENDING_REVIEW

### Task 9: Remove sessions
- **File**: `index.ts` (opencode-hive)
- **Remove**: `hive_session_open`, `hive_session_list`
- **Keep**: Simple file reads via existing tools

## Key Patterns

### Polling block
```typescript
while (fs.existsSync(PENDING_REVIEW)) {
  await sleep(2000);
}
```

### BLOCKED check
```typescript
if (fs.existsSync(path.join(featureDir, 'BLOCKED'))) {
  return `⛔ BLOCKED: ${fs.readFileSync(...)}`;
}
```

### Append to report
```typescript
fs.appendFileSync(reportPath, `\n## Attempt ${n}\n${summary}\n`);
```

## Dependencies

```
Task 1 (gate)     → enables Task 2 (dashboard)
Task 2 (dashboard) → enables Task 3 (detail)
Task 7 (tool)     → enables Task 8 (UI)
Task 9 (cleanup)  → independent
Tasks 4,5,6       → independent
```
