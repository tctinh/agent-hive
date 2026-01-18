# Queen Panel: Fleet View + Review Flow

> **Philosophy**: Human shapes, Agent details. Files are the API. Reviews are checkpoints.
> 
> **Read this first**: `/home/tctinh/agent-hive/PHILOSOPHY.md`

---

## Overview

Build a dashboard for the Beekeeper (human) to:
1. See all features at a glance
2. Review agent work before merge (PR model)
3. Block/unblock agents via files
4. Track fleet health in status bar

**Core insight**: Agent completes work → requests review → BLOCKS until human approves.

---

## File Protocol

These files are the communication interface:

| File | Location | Created By | Purpose |
|------|----------|------------|---------|
| `BLOCKED` | `.hive/features/<name>/BLOCKED` | Human | Stop all work on feature |
| `PENDING_REVIEW` | `.hive/features/<name>/tasks/<task>/PENDING_REVIEW` | Agent | Waiting for human review |
| `REVIEW_RESULT` | `.hive/features/<name>/tasks/<task>/REVIEW_RESULT` | Human | Verdict: "APPROVED" or feedback |
| `report.md` | `.hive/features/<name>/tasks/<task>/report.md` | Agent | Work history (appended) |

---

## Architecture

```
Packages:
├── packages/hive-core/           # Shared logic (services)
├── packages/vscode-hive/         # VS Code extension (UI)
└── packages/opencode-hive/       # OpenCode tools (agent interface)

Key Files We Modify:
├── packages/vscode-hive/src/extension.ts           # Commands, status bar
├── packages/vscode-hive/src/panels/HiveQueenPanel.ts   # Webview panel
└── packages/opencode-hive/src/index.ts             # Agent tools
```

---

## Tasks

Each task is self-contained. Read only the task section you're working on.

---

### 1. Remove Active Feature Gate

**Goal**: Let Queen Panel open without requiring an active feature.

**File**: `packages/vscode-hive/src/extension.ts`

**Find this code** (around line 362-367):
```typescript
const activeFeature = featureService.getActive();

if (!activeFeature) {
  vscode.window.showWarningMessage('Hive: No active feature. Create one first.');
  return;
}
```

**Change to**:
```typescript
const activeFeature = featureService.getActive();

// No gate - show dashboard if no active feature
if (!activeFeature) {
  HiveQueenPanel.showDashboard(this._context);
  return;
}
```

**Note**: This requires Task 2 (dashboard) to exist first. Implement together or stub `showDashboard`.

**Verify**:
- Run extension: `npm run dev` in vscode-hive
- Press `Ctrl+Shift+H` with no active feature
- Should open panel (not show warning)

---

### 2. Dashboard View

**Goal**: Show all features as cards with status badges.

**File**: `packages/vscode-hive/src/panels/HiveQueenPanel.ts`

**Changes needed**:

1. **Add static method** `showDashboard`:
```typescript
public static showDashboard(context: vscode.ExtensionContext) {
  // Similar to show() but with mode 'dashboard'
  const panel = HiveQueenPanel._createOrShow(context);
  panel._mode = 'dashboard';
  panel._updateDashboard();
}
```

2. **Add mode type**:
```typescript
private _mode: 'planning' | 'execution' | 'dashboard' | 'review' = 'planning';
```

3. **Add dashboard update method**:
```typescript
private async _updateDashboard() {
  const features = featureService.list();
  const featureData = await Promise.all(features.map(async (name) => {
    const info = featureService.getInfo(name);
    const featureDir = path.join(this._hiveDir, 'features', name);
    const blocked = fs.existsSync(path.join(featureDir, 'BLOCKED'));
    const tasks = taskService.list(name);
    const pendingReviews = tasks.filter(t => 
      fs.existsSync(path.join(featureDir, 'tasks', t, 'PENDING_REVIEW'))
    ).length;
    const mtime = fs.statSync(path.join(featureDir, 'feature.json')).mtime;
    const stale = Date.now() - mtime.getTime() > 2 * 60 * 60 * 1000; // 2 hours
    
    return { name, info, blocked, pendingReviews, stale, tasks };
  }));
  
  this._panel.webview.postMessage({
    type: 'dashboard',
    features: featureData
  });
}
```

4. **Add dashboard HTML template** in `_getHtmlContent()`:
```typescript
if (this._mode === 'dashboard') {
  return this._getDashboardHtml();
}
```

5. **Dashboard HTML** (new method):
```typescript
private _getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; padding: 16px; }
    .feature-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 16px; }
    .feature-card.blocked { border-color: var(--vscode-errorForeground); }
    .feature-card.pending { border-color: var(--vscode-warningForeground); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
    .badge.blocked { background: var(--vscode-errorForeground); color: white; }
    .badge.pending { background: var(--vscode-warningForeground); color: black; }
    .badge.stale { background: var(--vscode-descriptionForeground); color: white; }
  </style>
</head>
<body>
  <h1>🐝 Hive Dashboard</h1>
  <div class="feature-grid" id="features"></div>
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'dashboard') {
        renderFeatures(message.features);
      }
    });
    
    function renderFeatures(features) {
      const container = document.getElementById('features');
      container.innerHTML = features.map(f => \`
        <div class="feature-card \${f.blocked ? 'blocked' : ''} \${f.pendingReviews > 0 ? 'pending' : ''}" 
             onclick="vscode.postMessage({type:'openFeature', name:'\${f.name}'})">
          <h3>\${f.name}
            \${f.blocked ? '<span class="badge blocked">⛔ BLOCKED</span>' : ''}
            \${f.pendingReviews > 0 ? '<span class="badge pending">🟡 ' + f.pendingReviews + ' review</span>' : ''}
            \${f.stale ? '<span class="badge stale">⚪ stale</span>' : ''}
          </h3>
          <p>\${f.tasks.length} tasks</p>
        </div>
      \`).join('');
    }
  </script>
</body>
</html>`;
}
```

6. **Handle message** in `_handleMessage`:
```typescript
case 'openFeature':
  this._showFeatureDetail(message.name);
  break;
```

**Verify**:
- Open Queen Panel with no active feature
- See grid of feature cards
- Cards show correct badges (blocked/pending/stale)
- Click card navigates to feature detail

---

### 3. Feature Detail View

**Goal**: Click feature card → see plan + tasks.

**File**: `packages/vscode-hive/src/panels/HiveQueenPanel.ts`

**Add method**:
```typescript
private async _showFeatureDetail(featureName: string) {
  this._mode = 'execution';  // Reuse existing execution mode
  this._featureName = featureName;
  
  // Load plan
  const plan = planService.read(featureName);
  
  // Load tasks with review status
  const tasks = taskService.list(featureName);
  const taskData = tasks.map(t => {
    const taskDir = path.join(this._hiveDir, 'features', featureName, 'tasks', t);
    const status = taskService.getStatus(featureName, t);
    const pendingReview = fs.existsSync(path.join(taskDir, 'PENDING_REVIEW'));
    return { name: t, status, pendingReview };
  });
  
  // Add back button to HTML
  this._panel.webview.postMessage({
    type: 'featureDetail',
    feature: featureName,
    plan: plan.content,
    tasks: taskData,
    showBackButton: true
  });
}
```

**Add to HTML/JS**: Back to dashboard button:
```javascript
// In webview JS
function showBackButton() {
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back to Dashboard';
  backBtn.onclick = () => vscode.postMessage({type: 'backToDashboard'});
  document.body.prepend(backBtn);
}
```

**Handle message**:
```typescript
case 'backToDashboard':
  this._mode = 'dashboard';
  this._updateDashboard();
  break;
```

**Verify**:
- Click feature card in dashboard
- See plan content and task list
- Tasks with PENDING_REVIEW show 🟡 badge
- Back button returns to dashboard

---

### 4. Task Diff View

**Goal**: Click task → see git diff (like PR).

**File**: `packages/vscode-hive/src/extension.ts`

**Add command** in `activate()`:
```typescript
const viewDiffCommand = vscode.commands.registerCommand('hive.viewTaskDiff', 
  async (featureName: string, taskName: string) => {
    const worktreeService = new WorktreeService(projectRoot);
    const worktree = worktreeService.get(featureName, taskName);
    
    if (!worktree) {
      vscode.window.showWarningMessage(`No worktree for task ${taskName}`);
      return;
    }
    
    // Get diff
    const result = execSync(
      `git diff main...${worktree.branch}`,
      { cwd: projectRoot, encoding: 'utf-8' }
    );
    
    // Create virtual document with diff content
    const uri = vscode.Uri.parse(`hive-diff:${featureName}/${taskName}.diff`);
    
    // Or simpler: just open the worktree folder
    const worktreeUri = vscode.Uri.file(worktree.path);
    vscode.commands.executeCommand('vscode.openFolder', worktreeUri, { forceNewWindow: false });
  }
);
context.subscriptions.push(viewDiffCommand);
```

**Alternative** (simpler): Open VS Code's Source Control for the worktree:
```typescript
const viewDiffCommand = vscode.commands.registerCommand('hive.viewTaskDiff',
  async (featureName: string, taskName: string) => {
    const worktreeService = new WorktreeService(projectRoot);
    const worktree = worktreeService.get(featureName, taskName);
    
    if (!worktree) {
      vscode.window.showWarningMessage(`No worktree for task ${taskName}`);
      return;
    }
    
    // Open worktree in new window - user can use built-in git diff
    const uri = vscode.Uri.file(worktree.path);
    await vscode.commands.executeCommand('vscode.openFolder', uri, true);
  }
);
```

**In HiveQueenPanel**: Add "View Diff" button for each task:
```javascript
// In webview JS task rendering
`<button onclick="vscode.postMessage({type:'viewDiff', feature:'${feature}', task:'${task.name}'})">
  View Diff
</button>`
```

**Handle message**:
```typescript
case 'viewDiff':
  vscode.commands.executeCommand('hive.viewTaskDiff', message.feature, message.task);
  break;
```

**Verify**:
- In feature detail, click "View Diff" on a task
- Opens worktree in new window (or shows diff)
- Can see all changes made in that task

---

### 5. BLOCKED File Check

**Goal**: Agent stops if BLOCKED file exists.

**File**: `packages/opencode-hive/src/index.ts`

**Add helper function**:
```typescript
function checkBlocked(feature: string): string | null {
  const blockedPath = path.join(getHiveDir(), 'features', feature, 'BLOCKED');
  if (fs.existsSync(blockedPath)) {
    const reason = fs.readFileSync(blockedPath, 'utf-8').trim();
    return `⛔ BLOCKED by Beekeeper:\n\n${reason}\n\nWait for human to remove .hive/features/${feature}/BLOCKED`;
  }
  return null;
}
```

**Add to `hive_exec_start`** (find the tool definition):
```typescript
// At the start of execute function, after getting feature name
const blocked = checkBlocked(feature);
if (blocked) {
  return blocked;
}
```

**Add to other tools that start work**: `hive_task_update` when setting to in_progress.

**Add UI buttons** in `HiveQueenPanel.ts`:
```typescript
// In feature detail view
private _getBlockButton(featureName: string, isBlocked: boolean): string {
  if (isBlocked) {
    return `<button onclick="vscode.postMessage({type:'unblock', feature:'${featureName}'})">
      🟢 Unblock Feature
    </button>`;
  } else {
    return `<button onclick="vscode.postMessage({type:'block', feature:'${featureName}'})">
      ⛔ Block Feature
    </button>`;
  }
}
```

**Handle messages**:
```typescript
case 'block':
  const reason = await vscode.window.showInputBox({ prompt: 'Block reason' });
  if (reason) {
    const blockedPath = path.join(this._hiveDir, 'features', message.feature, 'BLOCKED');
    fs.writeFileSync(blockedPath, reason);
    this._updateDashboard();
  }
  break;
  
case 'unblock':
  const blockedPath = path.join(this._hiveDir, 'features', message.feature, 'BLOCKED');
  if (fs.existsSync(blockedPath)) {
    fs.unlinkSync(blockedPath);
  }
  this._updateDashboard();
  break;
```

**Verify**:
- Create BLOCKED file manually: `echo "test" > .hive/features/X/BLOCKED`
- Agent calls `hive_exec_start` → gets blocked message
- In UI, click "Unblock" → file removed
- Agent can proceed

---

### 6. Smart Status Bar

**Goal**: Show fleet health at a glance.

**File**: `packages/vscode-hive/src/extension.ts`

**Find existing status bar code** (around line 86-134) and enhance:

```typescript
private _updateStatusBar() {
  const features = featureService.list();
  
  let blocked = 0;
  let pendingReviews = 0;
  
  for (const name of features) {
    const featureDir = path.join(this._hiveDir, 'features', name);
    
    // Count blocked
    if (fs.existsSync(path.join(featureDir, 'BLOCKED'))) {
      blocked++;
    }
    
    // Count pending reviews
    const tasksDir = path.join(featureDir, 'tasks');
    if (fs.existsSync(tasksDir)) {
      const tasks = fs.readdirSync(tasksDir);
      for (const task of tasks) {
        if (fs.existsSync(path.join(tasksDir, task, 'PENDING_REVIEW'))) {
          pendingReviews++;
        }
      }
    }
  }
  
  // Build status text
  let text = `🐝 ${features.length}`;
  if (pendingReviews > 0) {
    text += ` | 🟡 ${pendingReviews}`;
  }
  if (blocked > 0) {
    text += ` | ⛔ ${blocked}`;
  }
  
  this._statusBar.text = text;
  this._statusBar.tooltip = `Hive: ${features.length} features, ${pendingReviews} pending reviews, ${blocked} blocked`;
  this._statusBar.command = 'hive.openQueenPanel';
}
```

**Add periodic refresh** (or use file watcher):
```typescript
// In activate()
setInterval(() => this._updateStatusBar(), 5000);  // Every 5 seconds
```

**Verify**:
- Status bar shows `🐝 3 | 🟡 1 | ⛔ 0`
- Click opens Queen Panel
- Updates when BLOCKED/PENDING_REVIEW files change

---

### 7. `hive_request_review` Tool

**Goal**: Agent requests review, blocks until human responds.

**File**: `packages/opencode-hive/src/index.ts`

**Add new tool** in the tools object:

```typescript
hive_request_review: tool({
  description: 'Request human review of completed task. BLOCKS until human approves or requests changes. Call this after completing work, before merging.',
  parameters: z.object({
    task: z.string().describe('Task folder name'),
    summary: z.string().describe('Summary of what you did for human to review'),
  }),
  execute: async ({ task, summary }, { feature }) => {
    if (!feature) {
      return 'Error: No active feature. Set feature context first.';
    }
    
    const taskDir = path.join(getHiveDir(), 'features', feature, 'tasks', task);
    
    if (!fs.existsSync(taskDir)) {
      return `Error: Task ${task} not found`;
    }
    
    // Append to report.md (keeps history of all attempts)
    const reportPath = path.join(taskDir, 'report.md');
    const existingReport = fs.existsSync(reportPath) 
      ? fs.readFileSync(reportPath, 'utf-8') 
      : '# Task Report\n';
    
    const attemptCount = (existingReport.match(/## Attempt \d+/g) || []).length + 1;
    const timestamp = new Date().toISOString();
    
    const newContent = existingReport + `
## Attempt ${attemptCount}

**Requested**: ${timestamp}

### Summary

${summary}

`;
    fs.writeFileSync(reportPath, newContent);
    
    // Create PENDING_REVIEW file
    const pendingPath = path.join(taskDir, 'PENDING_REVIEW');
    fs.writeFileSync(pendingPath, JSON.stringify({
      attempt: attemptCount,
      requestedAt: timestamp,
      summary: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
    }, null, 2));
    
    // Poll until human reviews (removes PENDING_REVIEW)
    const pollInterval = 2000; // 2 seconds
    const maxWait = 30 * 60 * 1000; // 30 minutes timeout
    const startTime = Date.now();
    
    while (fs.existsSync(pendingPath)) {
      if (Date.now() - startTime > maxWait) {
        return 'Review timed out after 30 minutes. Human did not respond. Try again or ask for help.';
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    // Human has reviewed - get result
    const resultPath = path.join(taskDir, 'REVIEW_RESULT');
    if (!fs.existsSync(resultPath)) {
      return 'Review was cancelled (PENDING_REVIEW removed but no REVIEW_RESULT). Ask human what to do.';
    }
    
    const result = fs.readFileSync(resultPath, 'utf-8').trim();
    
    // Append result to report
    fs.appendFileSync(reportPath, `### Review Result

${result}

---

`);
    
    if (result.toUpperCase() === 'APPROVED') {
      return `✅ APPROVED

Your work has been approved. You may now merge:

  hive_merge(task="${task}")

After merging, proceed to the next task.`;
    } else {
      return `🔄 Changes Requested

The reviewer has requested changes:

${result}

Make the requested changes, then call hive_request_review again with a new summary.`;
    }
  },
}),
```

**Verify**:
- Agent calls `hive_request_review(task="01-foo", summary="Did X, Y, Z")`
- Tool blocks (agent waits)
- Check: `PENDING_REVIEW` file created
- Check: `report.md` updated with attempt
- Human approves via UI
- Tool returns result to agent

---

### 8. Review UI

**Goal**: Human approves or requests changes.

**File**: `packages/vscode-hive/src/panels/HiveQueenPanel.ts`

**Add review mode** - when clicking a task with PENDING_REVIEW:

```typescript
private async _showReview(featureName: string, taskName: string) {
  this._mode = 'review';
  
  const taskDir = path.join(this._hiveDir, 'features', featureName, 'tasks', taskName);
  const pendingPath = path.join(taskDir, 'PENDING_REVIEW');
  const reportPath = path.join(taskDir, 'report.md');
  
  if (!fs.existsSync(pendingPath)) {
    vscode.window.showWarningMessage('No pending review for this task');
    return;
  }
  
  const pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
  const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf-8') : '';
  
  // Get diff stats
  const worktree = worktreeService.get(featureName, taskName);
  let diffStats = { files: 0, insertions: 0, deletions: 0 };
  if (worktree) {
    try {
      const diff = execSync(`git diff --stat main...${worktree.branch}`, { cwd: projectRoot, encoding: 'utf-8' });
      // Parse diff stats
      const match = diff.match(/(\d+) files? changed/);
      if (match) diffStats.files = parseInt(match[1]);
    } catch (e) {}
  }
  
  this._panel.webview.postMessage({
    type: 'review',
    feature: featureName,
    task: taskName,
    summary: pending.summary,
    attempt: pending.attempt,
    report: report,
    diffStats: diffStats,
  });
}
```

**Add review HTML**:
```typescript
private _getReviewHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { padding: 16px; font-family: var(--vscode-font-family); }
    .summary { background: var(--vscode-editor-background); padding: 16px; border-radius: 8px; margin: 16px 0; }
    .actions { display: flex; gap: 16px; margin-top: 24px; }
    .actions button { padding: 8px 24px; font-size: 14px; cursor: pointer; }
    .approve { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; }
    .changes { background: var(--vscode-inputOption-activeBackground); border: 1px solid var(--vscode-input-border); }
    textarea { width: 100%; height: 100px; margin-top: 16px; }
    .stats { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <button onclick="vscode.postMessage({type:'backToFeature'})">← Back</button>
  
  <h1>📋 Review: <span id="taskName"></span></h1>
  <p class="stats">Attempt #<span id="attempt"></span> | <span id="diffStats"></span></p>
  
  <h2>Summary from Agent</h2>
  <div class="summary" id="summary"></div>
  
  <button onclick="vscode.postMessage({type:'viewDiff', feature: currentFeature, task: currentTask})">
    View Full Diff
  </button>
  
  <h2>Your Verdict</h2>
  <textarea id="feedback" placeholder="Feedback for changes (optional if approving)"></textarea>
  
  <div class="actions">
    <button class="approve" onclick="approve()">✅ Approve</button>
    <button class="changes" onclick="requestChanges()">🔄 Request Changes</button>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    let currentFeature, currentTask;
    
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'review') {
        currentFeature = msg.feature;
        currentTask = msg.task;
        document.getElementById('taskName').textContent = msg.task;
        document.getElementById('attempt').textContent = msg.attempt;
        document.getElementById('summary').textContent = msg.summary;
        document.getElementById('diffStats').textContent = 
          msg.diffStats.files + ' files changed';
      }
    });
    
    function approve() {
      vscode.postMessage({
        type: 'reviewResult',
        feature: currentFeature,
        task: currentTask,
        result: 'APPROVED'
      });
    }
    
    function requestChanges() {
      const feedback = document.getElementById('feedback').value;
      if (!feedback.trim()) {
        alert('Please provide feedback for requested changes');
        return;
      }
      vscode.postMessage({
        type: 'reviewResult',
        feature: currentFeature,
        task: currentTask,
        result: feedback
      });
    }
  </script>
</body>
</html>`;
}
```

**Handle review result**:
```typescript
case 'reviewResult':
  const taskDir = path.join(this._hiveDir, 'features', message.feature, 'tasks', message.task);
  const pendingPath = path.join(taskDir, 'PENDING_REVIEW');
  const resultPath = path.join(taskDir, 'REVIEW_RESULT');
  
  // Write result
  fs.writeFileSync(resultPath, message.result);
  
  // Remove pending (this unblocks the agent!)
  if (fs.existsSync(pendingPath)) {
    fs.unlinkSync(pendingPath);
  }
  
  // Show confirmation
  if (message.result === 'APPROVED') {
    vscode.window.showInformationMessage(`✅ Task ${message.task} approved`);
  } else {
    vscode.window.showInformationMessage(`🔄 Changes requested for ${message.task}`);
  }
  
  // Go back to feature detail
  this._showFeatureDetail(message.feature);
  break;
```

**Verify**:
- Agent calls `hive_request_review`, blocks
- Dashboard shows 🟡 on that task
- Click task → opens review panel
- See summary, can view diff
- Click "Approve" → REVIEW_RESULT written, PENDING_REVIEW deleted
- Agent unblocks, receives "APPROVED"
- Or click "Request Changes" with feedback → agent receives feedback

---

### 9. Remove Session Complexity

**Goal**: Simplify - files are the state, no session tracking needed.

**File**: `packages/opencode-hive/src/index.ts`

**Remove or simplify these tools**:

1. **`hive_session_open`** - Replace with simpler context read:
```typescript
// REMOVE complex session logic
// KEEP simple: just read and return relevant files

hive_session_open: tool({
  description: 'Read all context for a feature. Returns plan, tasks, and any pending state.',
  parameters: z.object({
    feature: z.string().optional().describe('Feature name. If omitted, uses active feature.'),
    task: z.string().optional().describe('Specific task to focus on'),
  }),
  execute: async ({ feature, task }) => {
    const featureName = feature || featureService.getActive();
    if (!featureName) {
      return 'No feature specified and no active feature set.';
    }
    
    // Check blocked first
    const blocked = checkBlocked(featureName);
    if (blocked) {
      return blocked;
    }
    
    const featureDir = path.join(getHiveDir(), 'features', featureName);
    
    // Read plan
    const plan = planService.read(featureName);
    
    // Read context files
    const contextDir = path.join(featureDir, 'context');
    let context = '';
    if (fs.existsSync(contextDir)) {
      const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        context += `\n--- ${file} ---\n`;
        context += fs.readFileSync(path.join(contextDir, file), 'utf-8');
      }
    }
    
    // If specific task, read its spec and status
    let taskInfo = '';
    if (task) {
      const taskDir = path.join(featureDir, 'tasks', task);
      if (fs.existsSync(taskDir)) {
        const spec = fs.existsSync(path.join(taskDir, 'spec.md')) 
          ? fs.readFileSync(path.join(taskDir, 'spec.md'), 'utf-8')
          : 'No spec';
        const status = taskService.getStatus(featureName, task);
        taskInfo = `\n\n## Current Task: ${task}\n\nStatus: ${status.status}\n\n${spec}`;
      }
    }
    
    return `# Feature: ${featureName}

## Plan

${plan.content}

${taskInfo}

## Context
${context || 'No context files'}
`;
  },
}),
```

2. **Remove `hive_session_list`** - Not needed, human can check `.hive/` directly.

3. **Remove session tracking from other tools** - No `sessionId` parameters.

**File**: `packages/hive-core/src/services/sessionService.ts`

**Keep for now** but mark as deprecated. We may remove entirely later.

**Verify**:
- Agent can call `hive_session_open(feature="X")` and get all context
- No session state tracking
- Agent starts fresh each time, reads files, works

---

## Success Criteria

Run through this checklist after all tasks complete:

- [ ] `Ctrl+Shift+H` opens dashboard (no active feature required)
- [ ] Dashboard shows all features with correct badges
- [ ] Click feature → see plan + tasks
- [ ] Click task → can view diff
- [ ] "Block Feature" button creates BLOCKED file
- [ ] Agent gets blocked message when BLOCKED exists
- [ ] Status bar shows `🐝 N | 🟡 N | ⛔ N`
- [ ] `hive_request_review` creates PENDING_REVIEW and blocks
- [ ] Review UI shows summary and approve/changes buttons
- [ ] "Approve" writes REVIEW_RESULT, removes PENDING_REVIEW
- [ ] Agent receives result and can proceed
- [ ] `report.md` accumulates history across attempts
- [ ] No session tracking needed - just file reads

---

## Dependencies

```
Task 2 (dashboard) ← Task 1 (gate removal needs dashboard to exist)
Task 3 (feature detail) ← Task 2 (needs dashboard navigation)
Task 8 (review UI) ← Task 7 (needs tool to create PENDING_REVIEW)

Independent:
- Task 4 (diff view)
- Task 5 (BLOCKED check)  
- Task 6 (status bar)
- Task 9 (simplify sessions)

Suggested order:
1. Task 5 (BLOCKED) - simple, isolated
2. Task 7 (request_review tool) - core feature
3. Task 2 (dashboard) - UI foundation
4. Task 1 (gate) - requires Task 2
5. Task 3 (feature detail) - extends dashboard
6. Task 8 (review UI) - requires Task 7
7. Task 4 (diff view) - polish
8. Task 6 (status bar) - polish
9. Task 9 (cleanup) - last
```

---

## File Changes Summary

| File | Tasks | Type |
|------|-------|------|
| `packages/opencode-hive/src/index.ts` | 5, 7, 9 | Add tool, modify tools |
| `packages/vscode-hive/src/extension.ts` | 1, 4, 6 | Modify commands, status bar |
| `packages/vscode-hive/src/panels/HiveQueenPanel.ts` | 2, 3, 5, 8 | Add modes, HTML, handlers |

**New files**: None
**New services**: None
**New schemas**: None (just file conventions)

---

## Context Refresh

If you lose context mid-execution, read these files:

1. **This plan**: `.hive/features/queen-panel-dashboard-mode/plan.md`
2. **Philosophy**: `/home/tctinh/agent-hive/PHILOSOPHY.md`
3. **Current task spec**: `.hive/features/queen-panel-dashboard-mode/tasks/<task>/spec.md`

Each task section above is self-contained. Just read the task you're working on.
