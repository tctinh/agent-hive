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
