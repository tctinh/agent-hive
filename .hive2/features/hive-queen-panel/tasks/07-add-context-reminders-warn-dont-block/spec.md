# Task: 07-add-context-reminders-warn-dont-block

## Feature: hive-queen-panel

## Context

## research-findings

# Research Findings: Hive Queen Panel

## Issue Reference
https://github.com/tctinh/agent-hive/issues/4

## Key Architecture Decisions

### 1. Filesystem-Mediated Communication
Agent runs in OpenCode/Copilot (separate systems). Panel cannot inject commands.
Communication happens via `.hive/` directory - shared state.

### 2. Same Panel, Different Phases
- **Waggle Dance** (planning): View plan, comment, approve/reject
- **Swarming** (execution): Watch progress, steer via comments, answer questions

### 3. Lock-Based Blocking for Ask/Answer
Universal approach that works with ANY agent:
```
Agent: write question → create lock → sleep loop until lock gone
Panel: show question → user answers → write answer → remove lock
Agent: wakes up → reads answer → continues
```

## Seamless-Agent Patterns to Port

### PlanReviewPanel
- WebviewPanel with `retainContextWhenHidden: true`
- `_pendingResolvers` Map for Promise-based blocking
- PostMessage protocol for webview ↔ extension
- Modes: review, walkthrough

### File Reference System
- `#filename` triggers autocomplete
- `searchFiles` uses `vscode.workspace.findFiles()`
- `FileSearchResult`: {name, path, uri, icon}
- `AttachmentInfo` for selected files

### askUser Tool
- Blocks via Promise until webview responds
- Falls back to `vscode.window.showInputBox`
- CancellationToken for cleanup

## OpenCode Integration

### Built-in Question Tool
OpenCode has native `question` tool that blocks:
```typescript
question({
  questions: [{ question: "...", header: "...", options: [...] }]
})
```

### Question API (for external polling)
- `GET /question` - List pending questions
- `POST /question/{id}/reply` - Submit answers  
- `POST /question/{id}/reject` - Dismiss

### SDK
```typescript
client.question.list()
client.question.reply({ requestID, answers })
client.question.reject({ requestID })
```

## Hive Terminology Alignment

| Concept | Hive Term | Panel Feature |
|---------|-----------|---------------|
| User | 🧑‍🌾 Beekeeper | Panel user |
| Planning | 💃 Waggle Dance | Plan review UI |
| Execution | 🐝🐝🐝 Swarming | Live task progress |
| Feature | 🪹 Nest | Active feature |
| Tasks | ⬡ Cells | Task cards |
| TDD | 🔒 Propolis | Subtask status |
| Context | 👑🍯 Royal Jelly | Context browser |
| Outputs | 🍯 Honey | Reports |

## Philosophy Evolution: P2 Reimagined

Current P2 says execution is "autonomous" with no user interaction.
New approach: **Continuous collaboration** during execution:
- Beekeeper can comment to steer
- Agent can ask questions and BLOCK until answered
- Back-and-forth even during task execution

## Ask Types

| Type | Agent Needs | Beekeeper Provides |
|------|-------------|-------------------|
| question | Information/decision | Text + options |
| review | Check my work | Approve/reject + feedback |
| tool | Run something | Command output |
| context | External info | Text/files/links |
| confirm | Permission | Yes/no |

## Files to Port from seamless-agent

- `src/webview/planReviewPanel.ts` - Core panel
- `src/webview/types.ts` - Message types
- `src/webview/webviewProvider.ts` - File search
- `media/planReview.html` - Template
- `media/planReview.css` - Styles
- `src/tools/askUser.ts` - Ask pattern (adapt to lock-based)


---

## terminology-and-reminders

# Terminology Strategy & Reminder System

## Hybrid Terminology Approach

### Decision: Technical Tools + Philosophy Teaching

| Layer | Approach | Example |
|-------|----------|---------|
| Tool names | Technical | `hive_task_update` not `hive_cell_update` |
| Tool parameters | Technical | `feature`, `task`, `status` |
| Tool descriptions | Technical + context | "Ask user (Beekeeper) for steering" |
| System prompt | Teach mapping | Table of Hive Term → Technical Reality |
| Refresh guidance | Mix | Technical data, philosophy wisdom |
| Context files | Can use philosophy | Human-readable documentation |

### Why Hybrid Works
- **No hallucination risk** - tools are unambiguous
- **Philosophy is taught** - agent understands the mental model
- **Creative alignment** - agent works WITH the Hive philosophy
- **Clear actions** - agent knows exactly what tools to call

## Terminology Mapping Table

| Hive Term | Technical Reality | Tools |
|-----------|------------------|-------|
| 🧑‍🌾 Beekeeper | User | N/A - they steer via comments |
| 👑 Hive Queen | Orchestrator agent | N/A - that's you |
| 🪹 Nest | Feature (.hive/features/*) | hive_feature_* |
| 💃 Waggle Dance | Planning phase | hive_plan_* |
| ⬡ Cells | Tasks | hive_task_* |
| 🐝 Workers | Task executors | hive_exec_* |
| 🔒 Propolis | TDD verification | hive_subtask_* (type: test/verify) |
| 👑🍯 Royal Jelly | Context files | hive_context_* |
| 🍯 Honey | Outputs (spec, report) | Generated artifacts |
| 🐝🐝🐝 Swarming | Parallel execution | Batched tasks |

## Reminder System Design

### Problem: Context Drift
Long execution → agent forgets:
- Original plan intent
- User preferences from planning
- Patterns to follow
- What's already done

### Solution: Pull-Based Refresh

Agent proactively calls `hive_session_refresh` which returns ACTUAL feature data:

```typescript
{
  // Current state
  feature: 'hive-queen-panel',
  phase: 'execution',
  
  // Actual plan summary
  planSummary: 'Building VS Code webview panel...',
  
  // Actual progress
  tasks: [
    { id: '01', name: '...', status: 'done', summary: '...' },
    { id: '02', name: '...', status: 'in_progress' },
  ],
  
  // Actual context files
  contextFiles: ['research-findings.md', 'terminology-and-reminders.md'],
  contextSummary: 'Key patterns: _pendingResolvers, lock-based blocking...',
  
  // Actual user steering
  recentComments: [{ task: '03', text: 'Use existing pattern', time: '5m ago' }],
  pendingAsks: [],
  
  // Current task spec
  currentTaskSpec: '### Port file reference system...',
  
  // What's done (don't repeat)
  completedWork: ['Ported PlanReviewPanel', 'Adapted UI assets'],
  
  // Feature-specific guidance
  tips: [
    'Check research-findings.md for seamless-agent patterns',
    'User wants #filename autocomplete',
  ],
}
```

### Nudging Agent to Refresh

1. **Tool hints** remind after operations:
   ```
   "Task started. Call hive_session_refresh periodically 
    to check for user steering comments."
   ```

2. **System prompt** instructs periodic refresh:
   ```
   "Call hive_session_refresh every few operations to stay aligned."
   ```

## Enforcing Context Creation

### Problem
Agents forget to create context during planning → Workers execute blind.

### Solution
1. `hive_plan_write` warns if no context files
2. `hive_plan_approve` can block if no context (configurable)
3. `hive_session_refresh` warns during planning phase
4. System prompt emphasizes: "CONTINUOUSLY save findings"

### Warning Messages
```typescript
// In hive_plan_write when no context
"⚠️ Plan written but NO CONTEXT FILES created!
 Workers need context to execute. Use hive_context_write NOW."

// In hive_plan_approve when no context  
"Cannot approve plan without context files!
 Document research, patterns, decisions, references."
```


## Completed Tasks

- 01-port-panel-infrastructure-from-seamless-agent: Created HiveQueenPanel infrastructure:
- packages/vscode-hive/src/panels/types.ts (message types, PanelMode, TaskProgress, PendingAsk)
- packages/vscode-hive/src/panels/HiveQueenPanel.ts (WebviewPanel class with Promise-based blocking, _panels/_pendingResolvers maps, showPlan/showWithOptions methods)
- packages/vscode-hive/media/hiveQueen.html (CSP, header/content/sidebar/dialogs structure)
- packages/vscode-hive/media/hiveQueen.css (VS Code theme variables, responsive layout)
Build verified: vscode-hive.vsix packaged successfully with all new assets.
- 02-port-file-reference-system-filename: Added file reference system (#filename autocomplete):
- Extended types.ts with FileSearchResult and FileAttachment interfaces
- Added TO webview messages: fileSearchResults, updateAttachments
- Added FROM webview messages: searchFiles, addFileReference, removeAttachment
- Implemented _handleSearchFiles: uses vscode.workspace.findFiles, filters folders+files, sorts by relevance
- Implemented _handleAddFileReference: creates attachment from selection
- Implemented _handleRemoveAttachment: removes by ID
- Added _getFileIcon helper for file type icons
- Build verified: vscode-hive.vsix packaged successfully
- 03-implement-panel-views: Implemented panel views:
- Added setMode() method for dynamic mode switching between planning/execution
- Added _featurePath and _taskWatcher properties
- Added _startTaskWatcher() to watch tasks/**/status.json for live updates
- Added _refreshTaskProgress() to read task directories and build TaskProgress[]
- Created src/webview/hiveQueen.ts (~300 lines) with:
  - renderPlanningView(): renders markdown with line-by-line comment buttons
  - renderExecutionView(): renders task list with status icons
  - Comment dialog handlers: open, edit, save, close
  - Ask dialog handler for agent questions
  - Mode switching UI updates
- Updated types.ts with setMode message and featurePath option
- Updated package.json build script to compile webview JS
- Build verified: vscode-hive.vsix packaged successfully
- 04-integrate-with-hive-core-services: Integrated HiveQueenPanel with hive-core services:
- Added import for TaskService from hive-core
- Added _featureName and _projectRoot properties to panel
- Replaced raw fs operations in _refreshTaskProgress() with TaskService.list() call
- Added _mapTaskStatus() helper to convert service status strings to panel status
- Extended HiveQueenOptions with projectRoot field
- Build verified: vscode-hive.vsix packaged successfully (18 files, 236KB)
- 05-implement-askanswer-system: Implemented ask/answer system with lock-based blocking:
- Created packages/hive-core/src/services/askService.ts (~130 lines):
  - createAsk(): writes ask.json + .lock file
  - isLocked(): checks if lock file exists
  - getAnswer(): reads answer.json
  - submitAnswer(): writes answer.json, removes lock
  - listPending(): returns all asks with active locks
  - cleanup(): removes ask/answer/lock files
- Created packages/vscode-hive/src/tools/ask.ts (~115 lines):
  - hiveAsk tool: creates ask, shows VS Code notification, polls lock, returns answer
  - hiveAskListPending tool: lists pending questions
- Updated extension.ts: added hive.showAsk command for notification-based answering
- Updated index.ts exports for both packages
- Build verified: vscode-hive.vsix packaged (18 files, 238KB)
- 06-implement-hivesessionrefresh-tool: Implemented hive_session_refresh tool:
- Created packages/vscode-hive/src/tools/session.ts (~180 lines):
  - hiveSessionRefresh tool returns feature-specific state:
    - Phase (planning/execution)
    - Plan summary (first 500 chars)
    - Task list with status icons (✓/→/○)
    - Progress counts (done/inProgress/pending)
    - Context file list
    - Pending asks
    - Warnings (no context files, pending asks waiting)
    - Tips (phase-specific guidance)
- Updated tools/index.ts to export getSessionTools
- Updated extension.ts to register session tools
- Build verified: vscode-hive.vsix packaged (18 files, 239KB)

