# UI/UX Design Reference: Mission Control Dashboard

## Source Analysis

Analyzed:
1. **seamless-agent** - planReview panel (HTML + CSS + TS)
2. **hive-queen-panel** - Current implementation (ported from seamless-agent)
3. **copilot-orchestra** - Workflow patterns

---

## Design System (from seamless-agent)

### Color Variables (VSCode Theme Integration)
```css
:root {
    --container-padding: 20px;
    --line-hover-bg: var(--vscode-list-hoverBackground);
    --comment-btn-bg: var(--vscode-button-secondaryBackground);
    --dialog-bg: var(--vscode-editor-background);
    --dialog-border: var(--vscode-panel-border);
    --comment-card-bg: var(--vscode-editorWidget-background);
    --comment-card-border: var(--vscode-editorWidget-border);
}
```

### Layout Pattern
```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Title + Actions (buttons aligned right)            │
│  background: --vscode-sideBar-background                    │
│  border-bottom: 1px solid --vscode-panel-border             │
├─────────────────────────────────────────────────────────────┤
│  CONTENT-WRAPPER (flex: row)                                │
│  ┌───────────────────────────────┬─────────────────────────┐│
│  │  MAIN CONTENT (flex: 1)       │  SIDEBAR (320px fixed)  ││
│  │  - Scrollable                 │  - Comments list        ││
│  │  - Padding: 20px              │  - Scrollable           ││
│  │                               │                         ││
│  └───────────────────────────────┴─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Button Styles
```css
.btn {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
}

.btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
}

.btn-icon {
    background: transparent;
    padding: 4px;
    border-radius: 4px;
}
```

---

## Component Patterns

### 1. Line-Hover Comment Button
```html
<div class="line-wrapper" data-line="42">
  <p>Plan content here...</p>
  <button class="add-comment-btn" title="Add comment">
    <span class="codicon codicon-comment"></span>
  </button>
</div>
```
- Button hidden by default, appears on hover
- Position: absolute, right: 8px, centered vertically
- Transition: opacity 0.15s

### 2. Comment Card
```html
<div class="comment-card">
  <div class="comment-citation">Line 42: "implement auth..."</div>
  <div class="comment-text">This should handle null case</div>
  <div class="comment-actions">
    <button>Edit</button>
    <button>Remove</button>
  </div>
</div>
```
- Background: --vscode-editorWidget-background
- Border: 1px solid --vscode-editorWidget-border
- Border-radius: 6px

### 3. Dialog Modal
```html
<div class="dialog-overlay">
  <div class="dialog">
    <div class="dialog-header">
      <h3>Add Comment</h3>
      <button class="btn-icon"><span class="codicon codicon-close"></span></button>
    </div>
    <div class="dialog-content">
      <div class="citation-preview">Selected text...</div>
      <textarea class="comment-textarea" placeholder="Enter feedback..."></textarea>
    </div>
    <div class="dialog-actions">
      <button class="btn btn-primary">Save</button>
      <button class="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```
- Overlay: rgba(0,0,0,0.5)
- Dialog: 90% width, max-width 500px
- Border-radius: 8px

### 4. Task Progress Cards (from hive-queen)
```html
<div class="task-item in_progress">
  <div class="task-name">01-implement-auth</div>
  <div class="task-status">In Progress</div>
  <div class="subtask-list">
    <div class="subtask-item done">Write tests</div>
    <div class="subtask-item in_progress">Implement</div>
  </div>
</div>
```
Status colors:
- pending: --vscode-descriptionForeground
- in_progress: --vscode-editorInfo-foreground
- done: --vscode-testing-iconPassed
- blocked: --vscode-editorError-foreground

---

## NEW: Dashboard Mode Components

### Feature Card (NEW)
```html
<div class="feature-card planning">
  <div class="feature-header">
    <span class="feature-icon codicon codicon-edit"></span>
    <h3 class="feature-name">post-merge-review-flow</h3>
  </div>
  <div class="feature-meta">
    <span class="feature-status">📝 Planning</span>
    <span class="feature-progress">0/10 tasks</span>
  </div>
  <div class="feature-blockers" data-count="2">
    <span class="codicon codicon-warning"></span> 2 blockers
  </div>
</div>
```

CSS:
```css
.feature-card {
  padding: 16px;
  border-radius: 8px;
  background: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-editorWidget-border);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.feature-card:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-2px);
}

.feature-card.planning {
  border-left: 4px solid var(--vscode-editorInfo-foreground);
}

.feature-card.executing {
  border-left: 4px solid var(--vscode-editorWarning-foreground);
}

.feature-card.completed {
  border-left: 4px solid var(--vscode-testing-iconPassed);
}
```

### Feature Grid Layout (NEW)
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 20px;
}
```

### Feature Picker Dropdown (NEW)
```html
<div class="feature-picker">
  <button class="feature-picker-btn">
    <span class="codicon codicon-chevron-down"></span>
    post-merge-review-flow
  </button>
  <div class="feature-picker-dropdown hidden">
    <div class="feature-picker-item active">post-merge-review-flow</div>
    <div class="feature-picker-item">queen-panel-dashboard-mode</div>
    <hr>
    <div class="feature-picker-item">
      <span class="codicon codicon-home"></span> All Features
    </div>
  </div>
</div>
```

### Blocker Badge (NEW)
```html
<span class="blocker-badge">
  <span class="codicon codicon-error"></span>
  <span class="blocker-count">2</span>
</span>
```

CSS:
```css
.blocker-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-inputValidation-errorForeground);
  border-radius: 12px;
  font-size: 12px;
}
```

### Review Verdict Card (NEW)
```html
<div class="verdict-card needs-revision">
  <div class="verdict-header">
    <span class="codicon codicon-warning"></span>
    <h3>NEEDS_REVISION</h3>
  </div>
  <div class="verdict-summary">Auth logic looks good but...</div>
  <div class="verdict-issues">
    <div class="issue critical">
      <span class="issue-badge">CRITICAL</span>
      <span class="issue-location">src/auth.ts:42</span>
      <span class="issue-message">SQL injection vulnerability</span>
    </div>
    <div class="issue major">
      <span class="issue-badge">MAJOR</span>
      <span class="issue-location">src/auth.ts:78</span>
      <span class="issue-message">Missing null check</span>
    </div>
  </div>
</div>
```

---

## Panel Modes Summary

| Mode | Header | Main Content | Sidebar | Actions |
|------|--------|--------------|---------|---------|
| Dashboard | "🐝 Mission Control" | Feature grid | None | + New Feature |
| Planning | Feature name + picker | Plan.md with line comments | Comments list | Approve / Request Changes |
| Execution | Feature name + status | Task progress cards | Steering controls | Pause / Resume |
| Review | Task name + "Review" | Diff view | Comment threads | Approve / NEEDS_REVISION |

---

## Responsive Behavior

```css
@media (max-width: 800px) {
  .content-wrapper {
    flex-direction: column;
  }
  
  .comments-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--vscode-panel-border);
    max-height: 40vh;
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Key Patterns from seamless-agent

1. **PlanReviewPanel class** - Static methods for show/showWithOptions
2. **Promise-based resolution** - Panel returns result when user acts
3. **_pendingResolvers Map** - Stores resolvers that survive panel close/reopen
4. **Message-based communication** - postMessage/onDidReceiveMessage
5. **Mode-based rendering** - 'review', 'summary', 'progress', 'walkthrough', 'display'
6. **Read-only mode** - Badge + disabled interactions
7. **Export functionality** - Save plan as markdown file

---

## Key Patterns from Orchestra

1. **Structured verdict** - APPROVED / NEEDS_REVISION / FAILED
2. **Issue severity** - CRITICAL / MAJOR / MINOR
3. **Phase completion docs** - Track progress per phase
4. **Mandatory pause points** - User must approve before continuing
