# Tool Response Architecture Analysis

## Current Pattern

**All hive tools return plain strings**, not structured objects.

### Response Patterns

| Pattern | Example |
|---------|---------|
| Error | `"Error: No feature specified. Create a feature..."` |
| Success | `"Feature \"name\" created. Status: planning. Write a plan with hive_plan_write."` |
| Info | Multi-line markdown-formatted string |

### Key Tools Examined

1. **hive_feature_create** (line 170-180)
   - Returns: `Feature "name" created. Status: planning. Write...`
   
2. **hive_exec_start** (line 310-360)
   - Creates worktree
   - Updates task status to `in_progress`
   - Generates spec.md with context
   - Returns: `Worktree created at {path}\nBranch: {branch}\nBase commit: {commit}...`

3. **hive_task_update** (line 291-308)
   - Returns: `Task "name" updated: status={status}`

4. **hive_exec_complete** (line 362-420)
   - Commits changes
   - Gets diff
   - Writes report.md
   - Returns: multi-line summary

5. **hive_session_open** (around line 550)
   - Returns: formatted feature info, plan, tasks, context, sessions

### System Prompt Injection

At line 148-167, there's a hook that injects status into system prompts:
```typescript
"experimental.chat.system.transform": async (_input, output) => {
  output.system.push(HIVE_SYSTEM_PROMPT);
  
  if (activeFeature) {
    let statusHint = `### Current Hive Status\n`;
    statusHint += `**Active Feature**: ${info.name} (${info.status})\n`;
    statusHint += `**Progress**: ${done}/${total} tasks\n`;
    
    if (info.commentCount > 0) {
      statusHint += `**Comments**: ${info.commentCount} unresolved...`;
    }
  }
}
```

This is where we ALREADY inject hints about comments. We can extend this for blockers.

## Blocker Injection Points

### 1. System Prompt Hook (Proactive)
Extend the `system.transform` hook to include blocker warnings:
```typescript
if (blockers.length > 0) {
  statusHint += `⚠️ **BLOCKERS**: ${blockers.length} - HALT and address before proceeding\n`;
}
```

### 2. Tool Response (Reactive)
Modify tools to check blockers and return blocking responses:
```typescript
// In hive_exec_start
const blockers = commentService.getBlockers(feature, task);
if (blockers.length > 0) {
  return `⛔ BLOCKED: Cannot start task "${task}"\n\n` +
    `${blockers.length} unresolved blockers:\n` +
    blockers.map(b => `- [${b.priority}] ${b.body}`).join('\n') +
    `\n\nResolve blockers with hive_comment_resolve(id) before proceeding.`;
}
```

### 3. New Polling Tool
Add `hive_check_blockers(feature?)` that agents can call:
```typescript
hive_check_blockers: tool({
  description: 'Check for unresolved blockers that require attention',
  args: { feature: tool.schema.string().optional() },
  async execute({ feature }) {
    const blockers = commentService.getBlockers(feature);
    if (blockers.length === 0) return "No blockers. Proceed with work.";
    return formatBlockersMessage(blockers);
  }
})
```

## Recommendation

The current architecture is **string-based**, which is simple but sufficient.

For blockers:
1. **System prompt** already injects comment count - extend for blockers
2. **Tool responses** can include blocker warnings as formatted strings
3. **Agents parse strings** (they're LLMs, they can handle text)

No need for structured JSON responses - the string format works with how LLMs process tool results.

## Integration Points (Priority Order)

| Priority | Tool | Change |
|----------|------|--------|
| P1 | `hive_session_open` | Return blocker list in response |
| P1 | `hive_exec_start` | Block if task has blockers |
| P2 | `system.transform` | Warn about blockers in system prompt |
| P2 | `hive_task_update` | Check blockers before status change |
| P3 | `hive_check_blockers` | New dedicated polling tool |
