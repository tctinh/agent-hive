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
