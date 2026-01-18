# User Workflow: Fleet Commander Pattern

## Key Insight

The user deploys **multiple agent sessions in parallel** and manages them as a fleet.
This is NOT single-agent real-time steering. This is **async fleet management**.

## Actual Workflow

```
1. DEPLOY PHASE
   ├── Spin up Session A → Feature: auth-refactor
   ├── Spin up Session B → Feature: api-migration  
   ├── Spin up Session C → Feature: ui-polish
   └── Walk away / do other work

2. MONITOR PHASE (periodic, not constant)
   ├── Quick glance at plans → Spot wrong direction early
   ├── Check task progress → See what's done, what's stuck
   └── No need to watch in real-time

3. REVIEW PHASE
   ├── Look at worktree commits → What did agent actually change?
   ├── Read diffs per task → Quality check
   └── Decide: merge / request changes / abandon

4. PICKUP PHASE
   ├── Continue from where agent left off
   ├── Correct course if needed
   └── Close out feature when satisfied
```

## What Matters to This User

### HIGH PRIORITY
- **Fleet overview**: See all features at once with status
- **Quick plan scanning**: Catch "wrong direction" without deep reading
- **Worktree diff access**: One-click to see what agent changed
- **Task commit history**: Per-task changes, not just final result
- **Session pickup**: Resume context efficiently

### MEDIUM PRIORITY
- **Blocker system**: Mark issues for agent to address
- **Comments on specific code**: Feedback on diffs
- **Approval gates**: Formal "yes proceed" / "no stop"

### LOW PRIORITY (for this user)
- **Real-time steering**: Not watching agents work
- **Pause/resume buttons**: Agents are async anyway
- **Live updates**: Periodic refresh is fine

## Design Implications

### Dashboard Mode (HIGH VALUE)
```
┌─────────────────────────────────────────────────────────────┐
│  🐝 Hive Fleet Status                           [Refresh]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ auth-refactor   │  │ api-migration   │                  │
│  │ ⚡ Executing    │  │ ⚠️ Blocked      │ ← attention here │
│  │ 3/5 tasks       │  │ 2/8 tasks       │                  │
│  │ Last: 5min ago  │  │ Last: 2hr ago   │ ← stale = stuck  │
│  │ [View] [Diff]   │  │ [View] [Diff]   │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ ui-polish       │  │ test-coverage   │                  │
│  │ ✅ Ready Review │  │ 📝 Planning     │                  │
│  │ 8/8 tasks       │  │ 0/0 tasks       │                  │
│  │ [Review Diffs]  │  │ [Open Plan]     │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Quick Actions That Matter
- **[View]** → Open plan/task view for that feature
- **[Diff]** → Show all changes in worktree (aggregated)
- **[Review Diffs]** → Per-task diff review before merge
- **[Open Plan]** → Jump to plan.md for editing

### Signals That Matter
- **Last activity time** → Stale = stuck or waiting
- **Blocked status** → Needs attention
- **Ready for review** → Agent done, your turn
- **Task progress** → Quick health check

## What's NOT Needed

- Fancy animations
- Real-time updates (periodic refresh is fine)
- Complex steering controls
- Pause/resume (agents are async)

## Summary

Design for **async fleet management**, not **real-time single-agent control**.

The user's mental model:
> "I'm running a factory of agents. I check in periodically. 
>  I need to quickly see: who's stuck, who's done, who's going wrong.
>  Then I drill in only where needed."
