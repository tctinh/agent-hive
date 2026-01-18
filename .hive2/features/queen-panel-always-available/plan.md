# Queen Panel Always Available

> Fix UX issue: Panel should be accessible at any time, not gated behind active feature

## Overview

The Hive Queen Panel currently requires an active feature to open. When user presses `Ctrl+Shift+H` without an active feature, they get a warning message and the panel doesn't open. This breaks the expected UX where the panel is always available as a dashboard.

## Problem

**Current behavior** (extension.ts:354-367):
```typescript
const activeFeature = featureService.getActive()
if (!activeFeature) {
  vscode.window.showWarningMessage('Hive: No active feature. Create one first.')
  return  // Panel doesn't open!
}
```

**Expected behavior**:
- `Ctrl+Shift+H` opens Queen Panel **always**
- If no active feature → show feature list/picker
- If multiple features → let user select which to view
- `hive_feature_create` should auto-set new feature as active

## Tasks

### 1. Auto-set active feature on create

When `hive_feature_create` runs, automatically set the new feature as active.

**Files to modify:**
- `packages/hive-core/src/services/featureService.ts`

**Change:**
```typescript
create(name: string, options?: { ticket?: string }) {
  // ... existing create logic ...
  this.setActive(name)  // Add this
  return feature
}
```

### 2. Remove active feature gate in openQueenPanel

Allow panel to open even without active feature.

**Files to modify:**
- `packages/vscode-hive/src/extension.ts` (openQueenPanel command)

**Change:**
- Remove the early return when no active feature
- If no active feature, still open panel in "dashboard mode"

### 3. Add dashboard mode to Queen Panel

Show feature list when no specific feature is selected.

**Files to modify:**
- `packages/vscode-hive/src/panels/HiveQueenPanel.ts`
- `packages/vscode-hive/src/panels/types.ts`
- `packages/vscode-hive/src/webview/hiveQueen.ts`

**What to implement:**
- New mode: `'dashboard'` in addition to `'planning'` and `'execution'`
- Dashboard shows: list of all features with status
- Click feature → switches to that feature's plan view
- Add feature picker dropdown in panel header for quick switching

---

## Success Criteria

- [ ] `Ctrl+Shift+H` opens panel even without active feature
- [ ] Panel shows feature list when no active feature
- [ ] Clicking a feature in list opens its plan view
- [ ] `hive_feature_create` auto-sets new feature as active
- [ ] Feature picker dropdown allows switching between features
